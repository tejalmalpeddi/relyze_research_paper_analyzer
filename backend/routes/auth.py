from backend.schemas import UserCreate, UserLogin
from backend.core.db import supabase
from fastapi import APIRouter, HTTPException, Depends, status
from backend.core.auth import verify_jwt

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def sign_in(payload: UserCreate):
    try:
        response = supabase.auth.sign_up(
            {"email": payload.email, "password": payload.password}
        )
        return {"message": "User created successfully", "user": response.user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# @router.post("/login")
# def login(payload: UserLogin):
#     try:
#         response = supabase.auth.sign_in_with_password(
#             {"email": payload.email, "password": payload.password}
#         )
#         return {
#             "access_token": response.session.access_token,
#             "refresh_token": response.session.refresh_token,
#             "user": response.user,
#         }
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")
    
# @router.post("/logout")
# def logout(user=Depends(verify_jwt)):
#     try:
#         response = supabase.auth.sign_out(options={ "scope": 'local' })
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Logout failed: {str(e)}")

COOKIE_MAX_AGE = 7 * 24 * 60 * 60 

@router.post("/login")
def login(payload: UserLogin, response: Response):
    try:
        res = supabase.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
        access_token = res.session.access_token

        response.set_cookie(
            key="access_token",
            value=f"Bearer {access_token}", # Adding 'Bearer ' prefix makes parsing in dependencies easier
            httponly=True,                 
            secure=False,                    # set true over https; currently false for testing
            samesite="lax",                
            max_age=COOKIE_MAX_AGE,
            path="/"                       
        )

        return {"message": "Login successful", "user": res.user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")


@router.post("/logout")
def logout(response: Response, user=Depends(verify_jwt)):
    try:
        supabase.auth.sign_out(options={"scope": "local"})
        
        # clear cookie
        response.delete_cookie(
            key="access_token",
            path="/",
            samesite="lax",
            secure=True
        )
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Logout failed: {str(e)}")
    
@router.post("/delete-user")
def delete_user(user=Depends(verify_jwt)):
    try:
        supabase.auth.admin.delete_user(user.id)
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Delete failed: {str(e)}")

@router.get("/get-user-details")
def get_user_details(user=Depends(verify_jwt)):
    try:
        return {"user": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch user: {str(e)}")
