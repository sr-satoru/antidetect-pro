from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class ExtensionBase(SQLModel):
    name: str = Field(index=True)
    description: str = Field(default="")
    icon_type: Optional[str] = Field(default="custom")
    icon_bg: Optional[str] = Field(default="#1677FF")
    icon_url: Optional[str] = Field(default=None)
    provider: str = Field(default="Firefox Add-ons") # "Firefox Add-ons" | "Chrome Web Store" | "Pacote Local"
    provider_url: Optional[str] = Field(default=None)
    enabled: bool = Field(default=True)
    status: str = Field(default="available")
    tab: str = Field(default="team") # "team" | "recommended"

class Extension(ExtensionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)

class ExtensionCreate(ExtensionBase):
    pass

class ExtensionRead(ExtensionBase):
    id: int
    created_at: datetime

class ExtensionUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon_type: Optional[str] = None
    icon_bg: Optional[str] = None
    icon_url: Optional[str] = None
    provider: Optional[str] = None
    provider_url: Optional[str] = None
    enabled: Optional[bool] = None
    status: Optional[str] = None
    tab: Optional[str] = None
