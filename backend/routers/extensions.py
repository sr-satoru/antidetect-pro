import httpx
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from database import get_session
from models.extension import Extension, ExtensionCreate, ExtensionRead, ExtensionUpdate

router = APIRouter(prefix="/api/extensions", tags=["Extensions"])

@router.get("", response_model=List[ExtensionRead])
def list_extensions(
    tab: Optional[str] = None, # "team" | "recommended"
    search: Optional[str] = None,
    session: Session = Depends(get_session),
):
    query = select(Extension)
    if tab:
        query = query.where(Extension.tab == tab)
    if search:
        query = query.where(Extension.name.contains(search)) # type: ignore
    return session.exec(query).all()

@router.post("", response_model=ExtensionRead, status_code=status.HTTP_201_CREATED)
def create_extension(
    extension_in: ExtensionCreate,
    session: Session = Depends(get_session),
):
    db_ext = Extension(**extension_in.model_dump())
    session.add(db_ext)
    session.commit()
    session.refresh(db_ext)
    return db_ext

@router.put("/{ext_id}", response_model=ExtensionRead)
def update_extension(
    ext_id: int,
    ext_in: ExtensionUpdate,
    session: Session = Depends(get_session),
):
    db_ext = session.get(Extension, ext_id)
    if not db_ext:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extensão não encontrada.",
        )
    
    update_data = ext_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_ext, key, value)
        
    session.add(db_ext)
    session.commit()
    session.refresh(db_ext)
    return db_ext

@router.delete("/{ext_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_extension(
    ext_id: int,
    session: Session = Depends(get_session),
):
    db_ext = session.get(Extension, ext_id)
    if not db_ext:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extensão não encontrada.",
        )
    session.delete(db_ext)
    session.commit()
    return None

@router.get("/search-amo")
async def search_amo(q: str = Query(..., min_length=2)):
    """
    Consulta em tempo real a API pública oficial da Mozilla AMO.
    """
    url = f"https://addons.mozilla.org/api/v5/addons/search/?q={q}&type=extension&page_size=10"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=5.0)
            if not resp.is_success:
                return []
            data = resp.json()
            
        results = []
        for item in data.get("results", []):
            name = (
                item.get("name", {}).get("pt-BR")
                or item.get("name", {}).get("en-US")
                or (list(item.get("name", {}).values())[0] if item.get("name") else "Extensão AMO")
            )
            summary = (
                item.get("summary", {}).get("pt-BR")
                or item.get("summary", {}).get("en-US")
                or (list(item.get("summary", {}).values())[0] if item.get("summary") else "")
            )
            results.append({
                "id": f"amo-{item['id']}",
                "name": name,
                "description": summary,
                "icon_url": item.get("icon_url"),
                "icon_type": "firefox",
                "icon_bg": "#FF7139",
                "provider": "Firefox Add-ons",
                "provider_url": item.get("url") or f"https://addons.mozilla.org/pt-BR/firefox/addon/{item.get('slug')}/",
            })
        return results
    except Exception:
        return []
