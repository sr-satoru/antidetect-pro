import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, col
from database import get_session
from models.profile import Profile, ProfileCreate, ProfileRead, ProfileUpdate
from models.user import User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/profiles", tags=["Profiles"])

@router.get("", response_model=List[ProfileRead])
def list_profiles(
    search: Optional[str] = None,
    group: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """Lista perfis ativos (não excluídos)."""
    query = select(Profile).where((Profile.is_deleted == False) | (Profile.is_deleted == None))
    if search:
        query = query.where(Profile.name.contains(search)) # type: ignore
    if group:
        query = query.where(Profile.group == group)
    return session.exec(query).all()

@router.post("", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
def create_profile(
    profile_in: ProfileCreate,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Cria um perfil associando ao usuário criador."""
    # Gera um ID único se não foi enviado
    profile_id = profile_in.id or f"fury-{uuid.uuid4().hex[:8]}"
    
    # Verifica se já existe
    existing = session.get(Profile, profile_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Perfil com ID '{profile_id}' já existe.",
        )
    
    profile_data = profile_in.model_dump()
    profile_data["id"] = profile_id
    profile_data["is_deleted"] = False
    profile_data["user_id"] = current_user.id if current_user else None
    profile_data["created_by"] = current_user.username if current_user else "offline_user"
    
    db_profile = Profile(**profile_data)
    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)
    return db_profile

@router.get("/trash", response_model=List[ProfileRead])
def list_trash(
    search: Optional[str] = None,
    group: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """Lista perfis que estão na lixeira (is_deleted == True)."""
    query = select(Profile).where(Profile.is_deleted == True)
    if search:
        query = query.where(Profile.name.contains(search)) # type: ignore
    if group and group != "Todos os grupos":
        query = query.where(Profile.group == group)
    return session.exec(query).all()

@router.delete("/trash/empty")
def empty_trash(
    session: Session = Depends(get_session),
):
    """Esvazia toda a lixeira apagando definitivamente os perfis excluídos."""
    trash_items = session.exec(select(Profile).where(Profile.is_deleted == True)).all()
    count = len(trash_items)
    for item in trash_items:
        session.delete(item)
    session.commit()
    return {"status": "success", "message": f"{count} perfis removidos permanentemente.", "deleted_count": count}

@router.get("/{profile_id}", response_model=ProfileRead)
def get_profile(
    profile_id: str,
    session: Session = Depends(get_session),
):
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
    return profile

@router.put("/{profile_id}", response_model=ProfileRead)
def update_profile(
    profile_id: str,
    profile_in: ProfileUpdate,
    session: Session = Depends(get_session),
):
    db_profile = session.get(Profile, profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
    
    update_data = profile_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_profile, key, value)
        
    db_profile.updated_at = datetime.now(timezone.utc)
    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)
    return db_profile

@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    profile_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Mover para a lixeira (Soft Delete)."""
    db_profile = session.get(Profile, profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
    db_profile.is_deleted = True
    db_profile.deleted_at = datetime.now(timezone.utc)
    db_profile.deleted_by = current_user.username if current_user else "offline_user"
    session.add(db_profile)
    session.commit()
    return None

@router.post("/{profile_id}/restore", response_model=ProfileRead)
def restore_profile(
    profile_id: str,
    session: Session = Depends(get_session),
):
    """Restaura um perfil da lixeira para a listagem ativa."""
    db_profile = session.get(Profile, profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
    db_profile.is_deleted = False
    db_profile.deleted_at = None
    db_profile.deleted_by = None
    db_profile.updated_at = datetime.now(timezone.utc)
    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)
    return db_profile

@router.delete("/{profile_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_permanent(
    profile_id: str,
    session: Session = Depends(get_session),
):
    """Exclui definitivamente o perfil do banco SQLite."""
    db_profile = session.get(Profile, profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
    session.delete(db_profile)
    session.commit()
    return None

@router.post("/{profile_id}/launch")
def launch_profile(
    profile_id: str,
    session: Session = Depends(get_session),
):
    """
    Inicia o navegador isolado com o perfil Camoufox/Playwright.
    """
    db_profile = session.get(Profile, profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
        
    db_profile.status = "running"
    session.add(db_profile)
    session.commit()
    
    return {
        "status": "launched",
        "profile_id": db_profile.id,
        "kernel": db_profile.kernel,
        "message": f"Navegador {db_profile.kernel} iniciado com sucesso.",
    }
