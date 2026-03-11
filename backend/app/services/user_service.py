"""User service for authentication and user management."""

from datetime import timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User


class UserServiceError(Exception):
    """Base exception for user service errors."""
    pass


class EmailAlreadyExistsError(UserServiceError):
    """Raised when email is already registered."""
    pass


class InvalidCredentialsError(UserServiceError):
    """Raised when credentials are invalid."""
    pass


class InactiveUserError(UserServiceError):
    """Raised when user is inactive."""
    pass


class UserService:
    """Service class for user-related operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        return self.db.query(User).filter(User.email == email).first()

    def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return self.db.query(User).filter(User.id == user_id).first()

    def create_user(self, email: str, password: str, full_name: str) -> User:
        """
        Create a new user.

        Args:
            email: User email
            password: Plain text password
            full_name: User's full name

        Returns:
            Created user object

        Raises:
            EmailAlreadyExistsError: If email is already registered
        """
        # Check if email already exists
        if self.get_by_email(email):
            raise EmailAlreadyExistsError(f"Email {email} is already registered")

        # Create new user
        hashed_password = get_password_hash(password)
        new_user = User(
            email=email,
            password_hash=hashed_password,
            full_name=full_name,
            is_active=True
        )

        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)

        return new_user

    def authenticate(self, email: str, password: str) -> User:
        """
        Authenticate user with email and password.

        Args:
            email: User email
            password: Plain text password

        Returns:
            Authenticated user object

        Raises:
            InvalidCredentialsError: If credentials are invalid
            InactiveUserError: If user is inactive
        """
        user = self.get_by_email(email)

        if not user or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError("Incorrect email or password")

        if not user.is_active:
            raise InactiveUserError("User account is inactive")

        return user

    def create_token(self, user: User) -> dict:
        """
        Create JWT access token for user.

        Args:
            user: User object

        Returns:
            Token dict with access_token and token_type
        """
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=access_token_expires
        )

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
