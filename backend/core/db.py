import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
#current supabase key is secret key; allows for admin behavior like deleting and editing user information
#bypasses row level security
#
# IMPORTANT: this client is shared by every request the whole server
# handles. Never call a session-establishing auth method on it directly
# (sign_in_with_password, sign_up, sign_in_anonymously, sign_out) -- those
# persist a session onto the client itself, and since it's one shared
# object, the NEXT request from ANY user would silently inherit whoever
# logged in most recently instead of running as the service key. Use
# new_auth_client() below for anything that signs a session in or out.


def new_auth_client() -> Client:
    # A fresh, throwaway client for auth operations that establish a
    # session (login, signup, anonymous login, logout). Creating one of
    # these is cheap -- it's just a lightweight HTTP client wrapper, not a
    # real network connection -- so there's no real cost to making a new
    # one per request instead of reusing a shared one.
    return create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

