from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
from config import DATABASE_URL

from .user import User, UserCreate, UserLogin, UserRead
from .profile import Profile, ProfileCreate, ProfileRead, ProfileUpdate
from .impressao_digital import (
    ImpressaoDigital,
    ImpressaoDigitalCreate,
    ImpressaoDigitalRead,
    ImpressaoDigitalUpdate,
)
from .proxy import Proxy, ProxyCreate, ProxyRead, ProxyUpdate
from .extension import Extension, ExtensionCreate, ExtensionRead, ExtensionUpdate

# Cria o engine seguro para SQLite conectado ao banco em database/fury.db
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

def run_migrations() -> None:
    """Garante compatibilidade e migrações incrementais no SQLite."""
    with engine.connect() as conn:
        # Colunas da tabela profile
        res_profile = conn.exec_driver_sql("PRAGMA table_info(profile)").fetchall()
        profile_cols = [r[1] for r in res_profile] if res_profile else []

        if res_profile:
            if "user_id" not in profile_cols:
                conn.exec_driver_sql("ALTER TABLE profile ADD COLUMN user_id INTEGER REFERENCES user(id)")
            if "created_by" not in profile_cols:
                conn.exec_driver_sql("ALTER TABLE profile ADD COLUMN created_by TEXT")
            if "is_deleted" not in profile_cols:
                conn.exec_driver_sql("ALTER TABLE profile ADD COLUMN is_deleted BOOLEAN DEFAULT 0")
            if "deleted_at" not in profile_cols:
                conn.exec_driver_sql("ALTER TABLE profile ADD COLUMN deleted_at TIMESTAMP")
            if "deleted_by" not in profile_cols:
                conn.exec_driver_sql("ALTER TABLE profile ADD COLUMN deleted_by TEXT")
            if "ultima_abertura" not in profile_cols:
                conn.exec_driver_sql("ALTER TABLE profile ADD COLUMN ultima_abertura TIMESTAMP")
            if "impressao_digital_id" not in profile_cols:
                conn.exec_driver_sql("ALTER TABLE profile ADD COLUMN impressao_digital_id INTEGER REFERENCES impressao_digital(id)")

        # Colunas da tabela proxy
        res_proxy = conn.exec_driver_sql("PRAGMA table_info(proxy)").fetchall()
        proxy_cols = [r[1] for r in res_proxy] if res_proxy else []

        if res_proxy:
            if "user_id" not in proxy_cols:
                conn.exec_driver_sql("ALTER TABLE proxy ADD COLUMN user_id INTEGER REFERENCES user(id)")
            if "created_by" not in proxy_cols:
                conn.exec_driver_sql("ALTER TABLE proxy ADD COLUMN created_by TEXT")

        # Colunas da tabela extension
        res_ext = conn.exec_driver_sql("PRAGMA table_info(extension)").fetchall()
        ext_cols = [r[1] for r in res_ext] if res_ext else []
        if res_ext:
            if "user_id" not in ext_cols:
                conn.exec_driver_sql("ALTER TABLE extension ADD COLUMN user_id INTEGER REFERENCES user(id)")

        conn.commit()

def init_db() -> None:
    """Cria todas as tabelas no SQLite se não existirem e executa migrações."""
    # Garante que todos os modelos estejam no metadata do SQLModel
    SQLModel.metadata.create_all(engine)
    run_migrations()

def get_session() -> Generator[Session, None, None]:
    """Injeção de dependência de sessão do banco para rotas do FastAPI."""
    with Session(engine) as session:
        yield session

__all__ = [
    "engine",
    "init_db",
    "run_migrations",
    "get_session",
    "User",
    "UserCreate",
    "UserLogin",
    "UserRead",
    "Profile",
    "ProfileCreate",
    "ProfileRead",
    "ProfileUpdate",
    "ImpressaoDigital",
    "ImpressaoDigitalCreate",
    "ImpressaoDigitalRead",
    "ImpressaoDigitalUpdate",
    "Proxy",
    "ProxyCreate",
    "ProxyRead",
    "ProxyUpdate",
    "Extension",
    "ExtensionCreate",
    "ExtensionRead",
    "ExtensionUpdate",
]
