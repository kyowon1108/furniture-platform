"""Authentication API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserResponse
from app.services.user_service import (
    UserService,
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InactiveUserError,
)

router = APIRouter()


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """Dependency to get user service."""
    return UserService(db)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,
    user_service: UserService = Depends(get_user_service)
):
    """
    Register a new user.

    Args:
        user_data: User registration data
        user_service: User service instance

    Returns:
        Created user object

    Raises:
        HTTPException: If email already exists
    """
    try:
        new_user = user_service.create_user(
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name
        )
        return new_user
    except EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_service: UserService = Depends(get_user_service)
):
    """
    Login and get JWT access token.

    Args:
        form_data: OAuth2 form with username (email) and password
        user_service: User service instance

    Returns:
        JWT access token

    Raises:
        HTTPException: If credentials are invalid
    """
    try:
        user = user_service.authenticate(form_data.username, form_data.password)
        return user_service.create_token(user)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InactiveUserError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user.

    Args:
        current_user: Current user from JWT token

    Returns:
        Current user object
    """
    return current_user
