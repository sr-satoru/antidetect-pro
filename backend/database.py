from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
from config import DATABASE_URL

# Cria o engine seguro para SQLite (imune a SQL injection com consultas parametrizadas)
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

def run_migrations() -> None:
    """Adiciona novas colunas caso ainda não existam no SQLite sem perder dados."""
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

        # Colunas da tabela proxy
        res_proxy = conn.exec_driver_sql("PRAGMA table_info(proxy)").fetchall()
        proxy_cols = [r[1] for r in res_proxy] if res_proxy else []

        if res_proxy:
            if "user_id" not in proxy_cols:
                conn.exec_driver_sql("ALTER TABLE proxy ADD COLUMN user_id INTEGER REFERENCES user(id)")
            if "created_by" not in proxy_cols:
                conn.exec_driver_sql("ALTER TABLE proxy ADD COLUMN created_by TEXT")

        # Normaliza IDs legados na tabela profile para sequenciais (1, 2, 3...)
        if res_profile:
            legacy_rows = conn.exec_driver_sql("SELECT id FROM profile WHERE id LIKE 'fury-%' ORDER BY created_at ASC").fetchall()
            if legacy_rows:
                # Busca o maior id numérico atual
                all_ids = conn.exec_driver_sql("SELECT id FROM profile").fetchall()
                existing_nums = []
                for (i,) in all_ids:
                    try:
                        existing_nums.append(int(i))
                    except (ValueError, TypeError):
                        pass
                next_num = max(existing_nums) + 1 if existing_nums else 1
                for (old_id,) in legacy_rows:
                    conn.exec_driver_sql("UPDATE profile SET id = ? WHERE id = ?", (str(next_num), old_id))
                    next_num += 1

        conn.commit()

def init_db() -> None:
    """Cria todas as tabelas automaticamente se não existirem e executa migrações."""
    import models  # Garante que Profile, Extension e Proxy sejam registrados no metadata
    SQLModel.metadata.create_all(engine)
    run_migrations()

def get_session() -> Generator[Session, None, None]:
    """Dependency injection para rotas do FastAPI."""
    with Session(engine) as session:
        yield session
