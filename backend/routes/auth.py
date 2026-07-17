from backend.schemas import UserCreate, UserLogin
from backend.core.db import supabase
from fastapi import APIRouter, HTTPException, Depends, status

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


@router.post("/login")
def login(payload: UserLogin):
    try:
        response = supabase.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": response.user,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")
