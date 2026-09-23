from .auth import router as auth_router
from .profiles import router as profiles_router
from .extensions import router as extensions_router
from .proxies import router as proxies_router

__all__ = ["auth_router", "profiles_router", "extensions_router", "proxies_router"]
