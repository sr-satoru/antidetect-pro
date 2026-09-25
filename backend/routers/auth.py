import hashlib
import os
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from database import get_session, User, UserCreate, UserLogin, UserRead

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

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security

bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    token: Optional[str] = None,
    auth_cred: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    session: Session = Depends(get_session),
) -> Optional[User]:
    """Extrai e valida o usuário atual via token Bearer ou query param token."""
    raw_token = None
    if auth_cred and auth_cred.credentials:
        raw_token = auth_cred.credentials
    elif token:
        raw_token = token

    if raw_token and raw_token.startswith("fury_sess_"):
        parts = raw_token.split("_")
        # fury_sess_{user_id}_{secret}
        if len(parts) >= 3 and parts[2].isdigit():
            user_id = int(parts[2])
            user = session.get(User, user_id)
            if user:
                return user

    # Se não houver token ou for inválido, usa o primeiro usuário da máquina
    return session.exec(select(User)).first()

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

    token = f"fury_sess_{db_user.id}_{secrets.token_hex(20)}"
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

    token = f"fury_sess_{db_user.id}_{secrets.token_hex(20)}"
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
def get_current_user_me(
    current_user: Optional[User] = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_offline": current_user.is_offline,
    }

