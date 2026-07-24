import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
#current supabase key is secret key; allows for admin behavior like deleting and editing user information
#bypasses row level security

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

