from datetime import datetime, timezone
from typing import Optional, Any
from sqlmodel import SQLModel, Field

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class ProfileBase(SQLModel):
    name: str = Field(index=True)
    group: Optional[str] = Field(default="Desagrupado", index=True)
    tags: Optional[str] = Field(default="")
    notes: Optional[str] = Field(default="")
    status: str = Field(default="ready")         # "ready" | "running" | "error"
    ultima_abertura: Optional[datetime] = Field(default=None)
    
    # Campos de exibição rápida na tabela
    kernel: str = Field(default="FlowerBrowser") # "FlowerBrowser" (Camoufox) | "SunBrowser" (Chromium)
    os: str = Field(default="windows")           # "windows" | "macos" | "linux"
    browser_version: str = Field(default="135.0")
    
    # Configurações rápidas de Proxy para exibição na LinhaTabela
    proxy_type: Optional[str] = Field(default="none") # "none" | "http" | "https" | "socks5"
    proxy_host: Optional[str] = Field(default=None)
    proxy_port: Optional[int] = Field(default=None)
    proxy_username: Optional[str] = Field(default=None)
    proxy_password: Optional[str] = Field(default=None)
    
    # Vínculo com Usuário / Criador
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    created_by: Optional[str] = Field(default=None)

    # Vínculo com a Impressão Digital detalhada
    impressao_digital_id: Optional[int] = Field(default=None, foreign_key="impressao_digital.id", index=True)

    # Controle de Lixeira (Soft Delete)
    is_deleted: bool = Field(default=False, index=True)
    deleted_at: Optional[datetime] = Field(default=None)
    deleted_by: Optional[str] = Field(default=None)

    # Dados brutos de Fingerprint (mantido para compatibilidade total)
    fingerprint_json: str = Field(default="{}")

class Profile(ProfileBase, table=True):
    id: str = Field(primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

class ProfileCreate(SQLModel):
    id: Optional[str] = None
    name: Optional[str] = None
    group: Optional[str] = None
    tags: Optional[Any] = None
    notes: Optional[str] = None
    status: Optional[str] = "ready"
    kernel: Optional[str] = None
    kernelVersion: Optional[str] = None
    browser_version: Optional[str] = None
    os: Optional[str] = None
    proxyType: Optional[str] = None
    proxy_type: Optional[str] = None
    proxyHost: Optional[str] = None
    proxy_host: Optional[str] = None
    proxyPort: Optional[Any] = None
    proxy_port: Optional[Any] = None
    proxyUser: Optional[str] = None
    proxy_username: Optional[str] = None
    proxyPass: Optional[str] = None
    proxy_password: Optional[str] = None
    impressao_digital_id: Optional[int] = None
    user_id: Optional[int] = None
    fingerprint_json: Optional[Any] = None

class ProfileRead(ProfileBase):
    id: str
    created_at: datetime
    updated_at: datetime

class ProfileUpdate(SQLModel):
    name: Optional[str] = None
    group: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    ultima_abertura: Optional[datetime] = None
    kernel: Optional[str] = None
    os: Optional[str] = None
    browser_version: Optional[str] = None
    proxy_type: Optional[str] = None
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None
    impressao_digital_id: Optional[int] = None
    user_id: Optional[int] = None
    created_by: Optional[str] = None
    is_deleted: Optional[bool] = None
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
    fingerprint_json: Optional[str] = None
