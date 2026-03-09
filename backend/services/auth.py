import os
from fastapi import Header, HTTPException
from jose import jwt, JWTError

# Supabase JWT settings
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  # Need to ensure this is set or use JWKS
ALGORITHM = "HS256"

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    try:
        # In a real Supabase setup, tokens are signed with the project secret
        # For local dev, we might need to handle this differently or use Supabase's JWKS
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=[ALGORITHM], options={"verify_aud": False})
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
