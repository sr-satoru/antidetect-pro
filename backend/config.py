import os
from pathlib import Path

# Diretório base do backend
BASE_DIR = Path(__file__).resolve().parent

# Caminho do banco SQLite offline local
DB_PATH = BASE_DIR / "fury.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Configurações de CORS para o frontend React (Vite / Electron)
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Modo de operação: 'local' (offline total) ou 'cloud'
APP_MODE = os.getenv("FURY_APP_MODE", "local")
