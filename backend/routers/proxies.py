import time
import httpx
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from database import get_session
from models.proxy import Proxy, ProxyCreate, ProxyRead, ProxyUpdate

router = APIRouter(prefix="/api/proxies", tags=["Proxies"])

@router.get("", response_model=List[ProxyRead])
def list_proxies(session: Session = Depends(get_session)):
    return session.exec(select(Proxy)).all()

from models.user import User
from routers.auth import get_current_user

@router.post("", response_model=ProxyRead, status_code=status.HTTP_201_CREATED)
def create_proxy(
    proxy_in: ProxyCreate,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user),
):
    proxy_data = proxy_in.model_dump()
    proxy_data["user_id"] = current_user.id if current_user else None
    proxy_data["created_by"] = current_user.username if current_user else "offline_user"
    db_proxy = Proxy(**proxy_data)
    session.add(db_proxy)
    session.commit()
    session.refresh(db_proxy)
    return db_proxy

@router.delete("/{proxy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proxy(
    proxy_id: int,
    session: Session = Depends(get_session),
):
    db_proxy = session.get(Proxy, proxy_id)
    if not db_proxy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proxy não encontrado.",
        )
    session.delete(db_proxy)
    session.commit()
    return None

@router.post("/test")
async def test_proxy(proxy_in: ProxyCreate):
    """
    Testa a conectividade, latência e IP de saída do proxy.
    """
    scheme = proxy_in.type.lower()
    auth = f"{proxy_in.username}:{proxy_in.password}@" if proxy_in.username and proxy_in.password else ""
    proxy_url = f"{scheme}://{auth}{proxy_in.host}:{proxy_in.port}"
    
    start_time = time.time()
    try:
        async with httpx.AsyncClient(proxy=proxy_url, timeout=6.0) as client:
            resp = await client.get("https://api.ipify.org?format=json")
            latency = int((time.time() - start_time) * 1000)
            if resp.is_success:
                ip_data = resp.json()
                return {
                    "status": "active",
                    "latency_ms": latency,
                    "exit_ip": ip_data.get("ip"),
                    "message": "Conexão com proxy estabelecida com sucesso.",
                }
    except Exception as e:
        return {
            "status": "error",
            "latency_ms": None,
            "exit_ip": None,
            "message": f"Falha ao conectar no proxy: {str(e)}",
        }
