from fastapi import status, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.db import supabase, new_auth_client

security = HTTPBearer()

COOKIE_MAX_AGE = 7 * 24 * 60 * 60

def set_session_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/"
    )

def clear_session_cookies(response: Response):
    response.delete_cookie(key="access_token", path="/", samesite="lax", secure=False)
    response.delete_cookie(key="refresh_token", path="/", samesite="lax", secure=False)

def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# Access tokens from Supabase expire after about an hour, but the
# access_token cookie itself sticks around for 7 days (COOKIE_MAX_AGE) --
# so a browser that's been open for a while will very often present an
# access token that's technically expired even though the user never
# logged out. Rather than forcing a re-login every hour, this tries a
# refresh (using the refresh_token cookie set alongside it at login) once
# before giving up, and rewrites both cookies with the new session so the
# next request doesn't need to refresh again.
def verify_cookie(request: Request, response: Response):
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    if token.startswith("Bearer "):
        token = token.split(" ")[1]

    try:
        user = supabase.auth.get_user(token)
        return user.user
    except Exception:
        pass

    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    try:
        refreshed = new_auth_client().auth.refresh_session(refresh_token)
        set_session_cookies(
            response,
            refreshed.session.access_token,
            refreshed.session.refresh_token,
        )
        return refreshed.user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )