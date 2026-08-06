from schemas import UserCreate, UserLogin, UserEdit
from core.db import supabase, new_auth_client
from fastapi import APIRouter, HTTPException, Depends, status, Response
from core.auth import verify_cookie

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE_MAX_AGE = 7 * 24 * 60 * 60

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def sign_up(payload: UserCreate):
    try:
        # A fresh client, not the shared one -- sign_up persists a session
        # onto whatever client runs it, and the shared client is used by
        # every other request on this server. See core/db.py's comment on
        # new_auth_client for why.
        auth_client = new_auth_client()
        response = auth_client.auth.sign_up(
            {"email": payload.email, "password": payload.password, "options": {payload.raw_user_meta_data}}
        )
        return {"message": "User created successfully", "user": response.user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
def login(payload: UserLogin, response: Response):
    try:
        auth_client = new_auth_client()
        res = auth_client.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
        access_token = res.session.access_token

        response.set_cookie(
            key="access_token",
            value=f"Bearer {access_token}",
            httponly=True,                 
            secure=False,
            samesite="lax",                
            max_age=COOKIE_MAX_AGE,
            path="/"                       
        )

        return {"message": "Login successful", "user": res.user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")


@router.post("/logout")
def logout(response: Response, user=Depends(verify_cookie)):
    try:
        new_auth_client().auth.sign_out(options={"scope": "local"})

        # clear cookie
        response.delete_cookie(
            key="access_token",
            path="/",
            samesite="lax",
            secure=False
        )
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Logout failed: {str(e)}")
    
@router.put("/edit-user")
def edit_user(payload: UserEdit, user=Depends(verify_cookie)):
    try:
        update_data = payload.model_dump(exclude_unset=True)
        user_metadata = update_data.pop("raw_user_meta_data", None)

        if user_metadata is not None:
            update_data["user_metadata"] = user_metadata

        if not update_data:
            raise HTTPException(
                status_code=400, detail="No fields provided"
            )

        response = supabase.auth.admin.update_user_by_id(
            uid=str(user.id), attributes=update_data
        )

        return {
            "message": "User edited successfully",
            "user": response.user,
        }
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Edit failed: {str(e)}"
        )

@router.post("/delete-user")
def delete_user(response: Response, user=Depends(verify_cookie)):
    try:
        supabase.auth.admin.delete_user(user.id)
        response.delete_cookie(
            key="access_token",
            path="/",
            samesite="lax",
            secure=False
        )
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Delete failed: {str(e)}")

@router.get("/get-user-details")
def get_user_details(user=Depends(verify_cookie)):
    try:
        return user
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch user: {str(e)}")
    
@router.post("/login-anonymous")
def login_anonymous(response: Response):
    try:
        auth_client = new_auth_client()
        res = auth_client.auth.sign_in_anonymously()
        response.set_cookie(
            key="access_token",
            value=f"Bearer {res.session.access_token}",
            httponly=True,                 
            secure=False,
            samesite="lax",                
            max_age=COOKIE_MAX_AGE,
            path="/"                       
        )
        return {"user": res.user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Anonymous login failed: {str(e)}")
