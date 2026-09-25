from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class UserBase(SQLModel):
    username: str = Field(index=True, unique=True, min_length=3, max_length=100)
    email: Optional[str] = Field(default=None, index=True)
    is_offline: bool = Field(default=True)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    password_hash: str
    created_at: datetime = Field(default_factory=utc_now)

class UserCreate(SQLModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str = Field(min_length=4)

class UserLogin(SQLModel):
    login: str # Username ou E-mail
    password: str

class UserRead(UserBase):
    id: int
    created_at: datetime
