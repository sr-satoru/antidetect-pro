import hashlib
import os
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from database import get_session
from models.user import User, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def hash_password(password: str) -> str:
    """Gera hash seguro com salt usando pbkdf2_hmac nativo."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}:{key.hex()}"

def verify_password(stored_hash: str, password: str) -> bool:
    """Verifica se a senha bate com o salt e o hash armazenados."""
    try:
        salt, key_hex = stored_hash.split(":")
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, session: Session = Depends(get_session)):
    is_offline = True
    username_clean = None
    email_clean = None

    if user_in.email and user_in.email.strip():
        # Cadastro com e-mail (Online / Nuvem)
        email_clean = user_in.email.strip().lower()
        username_clean = (user_in.username or email_clean.split("@")[0]).strip().lower()
        is_offline = False

        existing = session.exec(select(User).where((User.email == email_clean) | (User.username == username_clean))).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este e-mail ou nome de usuário já está em uso.",
            )
    elif user_in.username and user_in.username.strip():
        # Cadastro sem e-mail (Offline Local)
        username_clean = user_in.username.strip().lower()
        is_offline = True

        existing = session.exec(select(User).where(User.username == username_clean)).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este nome de usuário já está em uso na máquina.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe um nome de usuário (para conta offline) ou e-mail.",
        )

    pw_hash = hash_password(user_in.password)
    db_user = User(
        username=username_clean,
        email=email_clean,
        is_offline=is_offline,
        password_hash=pw_hash,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    token = f"fury_sess_{secrets.token_hex(24)}"
    return {
        "success": True,
        "token": token,
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "email": db_user.email,
            "is_offline": db_user.is_offline,
        },
    }

@router.post("/login")
def login(user_in: UserLogin, session: Session = Depends(get_session)):
    login_clean = user_in.login.strip().lower()

    db_user = session.exec(
        select(User).where((User.username == login_clean) | (User.email == login_clean))
    ).first()

    if not db_user or not verify_password(db_user.password_hash, user_in.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário/E-mail ou senha incorretos.",
        )

    token = f"fury_sess_{secrets.token_hex(24)}"
    return {
        "success": True,
        "token": token,
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "email": db_user.email,
            "is_offline": db_user.is_offline,
        },
    }

@router.get("/me")
def get_current_user(token: Optional[str] = None, session: Session = Depends(get_session)):
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")

    # Retorna o primeiro usuário ativo ou offline
    user = session.exec(select(User)).first()
    if user:
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_offline": user.is_offline,
        }

    return {
        "id": 1,
        "username": "offline_user",
        "email": None,
        "is_offline": True,
    }

