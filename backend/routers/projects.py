from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from services.auth import get_current_user
from services.database import get_db

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    industry: str

class Project(ProjectCreate):
    id: str
    user_id: str
    created_at: str

@router.post("/", response_model=Project)
async def create_project(
    project_data: ProjectCreate,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    try:
        project = db.table("projects").insert({
            "name": project_data.name,
            "industry": project_data.industry,
            "user_id": user["id"]
        }).execute()
        
        if not project.data:
            raise HTTPException(status_code=500, detail="Failed to create project")
            
        return project.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[Project])
async def list_projects(
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    try:
        projects = db.table("projects").select("*").eq("user_id", user["id"]).execute()
        return projects.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
