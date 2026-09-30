import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import Token, LoginRequest, RegisterRequest, UserPublicResponse
from app.schemas.user import UserResponse
from app.services.auth import verify_password, get_password_hash, create_access_token
from app.services.rbac import get_current_user

logger = logging.getLogger("hackathon_platform.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _mask_identifier(ident: str) -> str:
    """Mask email or username for safe diagnostic logging."""
    if not ident:
        return "<empty>"
    if "@" in ident:
        parts = ident.split("@")
        name = parts[0]
        masked = (name[0] + "***" + (name[-1] if len(name) > 1 else "")) if name else "***"
        return f"{masked}@{parts[1]}"
    return ident[0] + "***" if len(ident) > 1 else "***"

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    username_clean = req.username.strip().lower()

    # Check existing email
    if db.query(User).filter(func.lower(User.email) == email_clean).first():
        logger.warning(f"AUTH DEBUG: Registration rejected - email already exists ({_mask_identifier(email_clean)})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    # Check existing username
    if db.query(User).filter(func.lower(User.username) == username_clean).first():
        logger.warning(f"AUTH DEBUG: Registration rejected - username already exists ({_mask_identifier(username_clean)})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists"
        )

    user = User(
        email=email_clean,
        username=username_clean,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name.strip(),
        role=req.role or UserRole.PARTICIPANT,
        bio=req.bio,
        avatar_url=req.avatar_url,
        institution=req.institution,
        organization=req.organization,
        skills=req.skills,
        phone=req.phone,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})
    logger.info(f"AUTH DEBUG: New user registered successfully. User ID: {user.id}, Role: {user.role.value}")
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserPublicResponse.model_validate(user)
    )

@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    raw_ident = req.get_identifier()
    
    if not raw_ident:
        logger.warning("AUTH DEBUG: Login rejected - missing identifier (email or username)")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required"
        )
    
    if not req.password:
        logger.warning(f"AUTH DEBUG: Login rejected - missing password for identifier: {_mask_identifier(raw_ident)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )
    
    clean_ident = raw_ident.lower()
    logger.info(f"AUTH DEBUG: Login request received for identifier: {_mask_identifier(clean_ident)}")

    user = db.query(User).filter(
        (func.lower(User.email) == clean_ident) | (func.lower(User.username) == clean_ident)
    ).first()

    if not user:
        logger.warning(f"AUTH DEBUG: User lookup failed for identifier: {_mask_identifier(clean_ident)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"AUTH DEBUG: User found (ID: {user.id}, Role: {user.role.value}). Verifying password...")

    if not verify_password(req.password, user.hashed_password):
        logger.warning(f"AUTH DEBUG: Password verification failed for user ID: {user.id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        logger.warning(f"AUTH DEBUG: Deactivated account access rejected for user ID: {user.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})
    logger.info(f"AUTH DEBUG: Authentication succeeded. Token issued for user ID: {user.id} ({user.role.value})")
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserPublicResponse.model_validate(user)
    )

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    if not form_data.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required"
        )
    
    clean_ident = form_data.username.strip().lower()
    user = db.query(User).filter(
        (func.lower(User.email) == clean_ident) | (func.lower(User.username) == clean_ident)
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserPublicResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
