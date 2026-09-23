from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from config import CORS_ORIGINS, APP_MODE
from database import init_db, engine
from models import Profile, Proxy, Extension
from routers import auth_router, profiles_router, extensions_router, proxies_router

def seed_defaults():
    """Popula dados essenciais se necessário (sem perfis nem proxies fictícios)."""
    with Session(engine) as session:
        # Nenhum perfil ou proxy fictício: tudo é consumido do banco real gerenciado pelo usuário
        pass

        # 3. Extensões Iniciais
        if not session.exec(select(Extension)).first():
            sample_extensions = [
                Extension(
                    name="uBlock Origin",
                    description="Bloqueador de anúncios e rastreadores ultra eficiente. Otimizado nativamente para o Camoufox.",
                    icon_type="firefox",
                    icon_bg="#FF7139",
                    provider="Firefox Add-ons",
                    provider_url="https://addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/",
                    enabled=True,
                    status="available",
                    tab="team",
                ),
                Extension(
                    name="Dark Reader",
                    description="Tema escuro para todos os sites. Inverte cores brilhantes tornando páginas fáceis de ler à noite.",
                    icon_type="firefox",
                    icon_bg="#2B2D3B",
                    provider="Firefox Add-ons",
                    provider_url="https://addons.mozilla.org/pt-BR/firefox/addon/darkreader/",
                    enabled=True,
                    status="available",
                    tab="recommended",
                ),
            ]
            session.add_all(sample_extensions)

        session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa o banco SQLite offline local na inicialização
    init_db()
    seed_defaults()
    print("🚀 Fury Antidetect Backend iniciado com sucesso!")
    print(f"📦 Banco de dados local SQLite inicializado (Modo: {APP_MODE})")
    yield

app = FastAPI(
    title="Fury Antidetect Backend",
    description="Backend local seguro e offline para orquestração de perfis e Camoufox",
    version="1.0.0",
    lifespan=lifespan,
)

# Configuração de CORS para permitir acesso do React / Vite / Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusão dos roteadores
app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(extensions_router)
app.include_router(proxies_router)

@app.get("/")
def root():
    return {
        "app": "Fury Antidetect Backend",
        "version": "1.0.0",
        "mode": APP_MODE,
        "status": "online",
        "database": "SQLite (Safe / Parameterized)",
    }

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
