from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class ProxyBase(SQLModel):
    name: Optional[str] = Field(default=None)
    type: str = Field(default="socks5") # "http" | "https" | "socks5"
    host: str = Field(index=True)
    port: int
    username: Optional[str] = Field(default=None)
    password: Optional[str] = Field(default=None)
    status: str = Field(default="inactive") # "active" | "inactive" | "error"
    latency_ms: Optional[int] = Field(default=None)
    country: Optional[str] = Field(default=None)
    exit_ip: Optional[str] = Field(default=None)

class Proxy(ProxyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)

class ProxyCreate(ProxyBase):
    pass

class ProxyRead(ProxyBase):
    id: int
    created_at: datetime

class ProxyUpdate(SQLModel):
    name: Optional[str] = None
    type: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    status: Optional[str] = None
    latency_ms: Optional[int] = None
    country: Optional[str] = None
    exit_ip: Optional[str] = None
