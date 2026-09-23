from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
from config import DATABASE_URL

# Cria o engine seguro para SQLite (imune a SQL injection com consultas parametrizadas)
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

def init_db() -> None:
    """Cria todas as tabelas automaticamente se não existirem."""
    import models  # Garante que Profile, Extension e Proxy sejam registrados no metadata
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    """Dependency injection para rotas do FastAPI."""
    with Session(engine) as session:
        yield session
