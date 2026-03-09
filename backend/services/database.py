import os
from supabase import create_client, Client

def get_db() -> Client:
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase configuration missing")
    return create_client(url, key)
