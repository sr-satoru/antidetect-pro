from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class ProfileBase(SQLModel):
    name: str = Field(index=True)
    kernel: str = Field(default="FlowerBrowser") # "FlowerBrowser" (Camoufox) | "SunBrowser" (Chromium)
    os: str = Field(default="windows")           # "windows" | "macos" | "linux"
    browser_version: str = Field(default="135.0")
    group: Optional[str] = Field(default=None)
    tags: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    status: str = Field(default="ready")         # "ready" | "running" | "error"
    
    # Configurações de Proxy
    proxy_type: Optional[str] = Field(default="none") # "none" | "http" | "https" | "socks5"
    proxy_host: Optional[str] = Field(default=None)
    proxy_port: Optional[int] = Field(default=None)
    proxy_username: Optional[str] = Field(default=None)
    proxy_password: Optional[str] = Field(default=None)
    
    # Dados completos de Fingerprint salvos em JSON
    fingerprint_json: str = Field(default="{}")

    # Vínculo com Usuário / Criador
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    created_by: Optional[str] = Field(default=None)

    # Controle de Lixeira (Soft Delete)
    is_deleted: bool = Field(default=False, index=True)
    deleted_at: Optional[datetime] = Field(default=None)
    deleted_by: Optional[str] = Field(default=None)

class Profile(ProfileBase, table=True):
    id: str = Field(primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

class ProfileCreate(ProfileBase):
    id: Optional[str] = None

class ProfileRead(ProfileBase):
    id: str
    created_at: datetime
    updated_at: datetime

class ProfileUpdate(SQLModel):
    name: Optional[str] = None
    kernel: Optional[str] = None
    os: Optional[str] = None
    browser_version: Optional[str] = None
    group: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    proxy_type: Optional[str] = None
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None
    fingerprint_json: Optional[str] = None
    user_id: Optional[int] = None
    created_by: Optional[str] = None
    is_deleted: Optional[bool] = None
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
