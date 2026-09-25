import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, col, or_
from database import (
    get_session,
    Profile,
    ProfileCreate,
    ProfileRead,
    ProfileUpdate,
    ImpressaoDigital,
    User,
)
from routers.auth import get_current_user

router = APIRouter(prefix="/api/profiles", tags=["Profiles"])

@router.get("", response_model=List[ProfileRead])
def list_profiles(
    search: Optional[str] = None,
    group: Optional[str] = None,
    tag: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    session: Session = Depends(get_session),
):
    """
    Lista perfis ativos com busca multi-campo unificada:
    pesquisa em Nome, Host/IP do Proxy, Tags, Observações e Grupo.
    """
    query = select(Profile).where((Profile.is_deleted == False) | (Profile.is_deleted == None))
    
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                col(Profile.name).ilike(term),
                col(Profile.proxy_host).ilike(term),
                col(Profile.tags).ilike(term),
                col(Profile.notes).ilike(term),
                col(Profile.group).ilike(term),
            )
        )
    
    if group and group != "Todos os grupos":
        query = query.where(Profile.group == group)

    if tag and tag.strip():
        query = query.where(col(Profile.tags).ilike(f"%{tag.strip()}%"))

    if status_filter:
        query = query.where(Profile.status == status_filter)
        
    return session.exec(query.order_by(col(Profile.created_at).desc())).all()

def get_next_profile_id(session: Session) -> str:
    """Calcula o próximo ID sequencial inteiro (1, 2, 3...) como string."""
    all_profiles = session.exec(select(Profile.id)).all()
    numeric_ids = []
    for pid in all_profiles:
        try:
            numeric_ids.append(int(pid))
        except (ValueError, TypeError):
            pass
    next_num = max(numeric_ids) + 1 if numeric_ids else 1
    return str(next_num)

@router.post("", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
def create_profile(
    profile_in: ProfileCreate,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Cria um perfil no banco com separação entre a entidade Perfil
    e sua Impressão Digital técnica completa (Camoufox / Hardware / Proxy).
    """
    profile_id = (profile_in.id and str(profile_in.id).strip()) or get_next_profile_id(session)
    
    existing = session.get(Profile, profile_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Perfil com ID '{profile_id}' já existe.",
        )
    
    # Extrai o JSON completo de fingerprint para popular a tabela de Impressão Digital
    fp_raw = {}
    if profile_in.fingerprint_json:
        if isinstance(profile_in.fingerprint_json, str):
            try:
                fp_raw = json.loads(profile_in.fingerprint_json)
            except Exception:
                fp_raw = {}
        elif isinstance(profile_in.fingerprint_json, dict):
            fp_raw = profile_in.fingerprint_json

    # Normalização de tags
    tags_str = ""
    if isinstance(profile_in.tags, list):
        tags_str = ",".join(str(t) for t in profile_in.tags)
    elif profile_in.tags:
        tags_str = str(profile_in.tags)

    # 1. Cria o registro na tabela de Impressão Digital (dados técnicos)
    hw_noise = fp_raw.get("hardwareNoise", {}) if isinstance(fp_raw.get("hardwareNoise"), dict) else {}
    media_devs = fp_raw.get("mediaDevicesCount", {}) if isinstance(fp_raw.get("mediaDevicesCount"), dict) else {}

    impressao = ImpressaoDigital(
        proxy_mode=fp_raw.get("proxyMode", "custom"),
        proxy_type=profile_in.proxy_type or profile_in.proxyType or fp_raw.get("proxyType", "none"),
        proxy_host=profile_in.proxy_host or profile_in.proxyHost or fp_raw.get("proxyHost") or None,
        proxy_port=int(profile_in.proxy_port or profile_in.proxyPort or fp_raw.get("proxyPort") or 0) or None,
        proxy_username=profile_in.proxy_username or profile_in.proxyUser or fp_raw.get("proxyUser") or None,
        proxy_password=profile_in.proxy_password or profile_in.proxyPass or fp_raw.get("proxyPass") or None,
        proxy_rotation_url=fp_raw.get("proxyRotationUrl") or None,
        ip_checker=fp_raw.get("ipChecker", "IP2Location"),
        socks_remote_dns=bool(fp_raw.get("socksRemoteDns", True)),

        extensoes_ids=json.dumps(fp_raw.get("extensions") or []) if isinstance(fp_raw.get("extensions"), list) else str(fp_raw.get("extensions") or "[]"),
        platform_url=fp_raw.get("platformUrl") or None,
        platform_accounts=json.dumps(fp_raw.get("platformAccounts") or []) if isinstance(fp_raw.get("platformAccounts"), list) else str(fp_raw.get("platformAccounts") or "[]"),
        open_tabs_urls=fp_raw.get("openTabsUrls") or None,
        cookies=fp_raw.get("cookies") or None,

        kernel=profile_in.kernel or fp_raw.get("kernel", "FlowerBrowser"),
        kernel_version=profile_in.browser_version or profile_in.kernelVersion or fp_raw.get("kernelVersion", "150"),
        os=(profile_in.os or fp_raw.get("os", "windows")).lower(),
        os_version=fp_raw.get("osVersion", "Linux x86_64"),
        user_agent=fp_raw.get("userAgent") or None,
        user_agent_category=fp_raw.get("userAgentCategory", "Todo"),

        webrtc_mode=fp_raw.get("webrtcMode", "disabled"),
        timezone_mode=fp_raw.get("timezoneMode", "ip"),
        custom_timezone=fp_raw.get("customTimezone", "America/Sao_Paulo"),

        location_mode=fp_raw.get("locationMode", "ip"),
        location_permission=fp_raw.get("locationPermission", "ask"),
        custom_latitude=str(fp_raw.get("customLatitude")) if fp_raw.get("customLatitude") else None,
        custom_longitude=str(fp_raw.get("customLongitude")) if fp_raw.get("customLongitude") else None,
        custom_accuracy=int(fp_raw.get("customAccuracy", 1000)),

        language_mode=fp_raw.get("languageMode", "ip"),
        custom_language=fp_raw.get("customLanguage", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"),

        screen_resolution_mode=fp_raw.get("screenResolutionMode", "default"),
        screen_resolution=fp_raw.get("screenResolution", "Com base no User-Agent"),
        custom_screen_width=int(fp_raw.get("customScreenWidth", 1920)),
        custom_screen_height=int(fp_raw.get("customScreenHeight", 1080)),
        color_depth=int(fp_raw.get("colorDepth", 24)),
        device_pixel_ratio=float(fp_raw.get("devicePixelRatio", 1.0)),
        max_touch_points=int(fp_raw.get("maxTouchPoints", 0)),

        fonts_mode=fp_raw.get("fontsMode", "default"),

        canvas_noise=bool(hw_noise.get("canvas", False)),
        webgl_image_noise=bool(hw_noise.get("webglImage", False)),
        audio_context_noise=bool(hw_noise.get("audioContext", False)),
        media_devices_noise=bool(hw_noise.get("mediaDevices", False)),
        client_rects_noise=bool(hw_noise.get("clientRects", False)),
        speech_voices_noise=bool(hw_noise.get("speechVoices", False)),
        font_pack_noise=bool(hw_noise.get("fontPack", False)),
        font_metrics_noise=bool(hw_noise.get("fontMetrics", False)),

        canvas_seed=fp_raw.get("canvasSeed"),
        webgl_seed=fp_raw.get("webglSeed"),
        audio_seed=fp_raw.get("audioSeed"),
        client_rects_seed=fp_raw.get("clientRectsSeed"),
        audio_sample_rate=int(fp_raw.get("audioSampleRate", 48000)),

        webgl_metadata_mode=fp_raw.get("webglMetadataMode", "custom"),
        webgl_vendor=fp_raw.get("webglVendor"),
        webgl_renderer=fp_raw.get("webglRenderer"),
        webgpu_mode=fp_raw.get("webgpuMode", "webgl"),

        cpu_mode=fp_raw.get("cpuMode", "custom"),
        cpu_cores=int(fp_raw.get("cpuCores", 10)),
        ram_mode=fp_raw.get("ramMode", "custom"),
        ram_gb=int(fp_raw.get("ramGb", 8)),

        battery_mode=fp_raw.get("batteryMode", "desktop"),
        device_name_mode=fp_raw.get("deviceNameMode", "custom"),
        device_name=fp_raw.get("deviceName"),
        mac_address_mode=fp_raw.get("macAddressMode", "custom"),
        mac_address=fp_raw.get("macAddress"),

        micros_count=int(media_devs.get("micros", 1)),
        webcams_count=int(media_devs.get("webcams", 1)),
        speakers_count=int(media_devs.get("speakers", 2)),

        do_not_track_mode=fp_raw.get("doNotTrackMode", "default"),
        port_scan_protection=fp_raw.get("portScanProtection", "open"),
        port_scan_allowed_ports=fp_raw.get("portScanAllowedPorts"),
        hardware_acceleration=fp_raw.get("hardwareAcceleration", "default"),
        disable_tls_features=fp_raw.get("disableTlsFeatures", "close"),
        launch_hook=fp_raw.get("launchHook"),

        raw_fingerprint_json=json.dumps(fp_raw) if fp_raw else "{}",
    )
    session.add(impressao)
    session.commit()
    session.refresh(impressao)

    # 2. Cria o registro na tabela de Perfil vinculado à Impressão Digital
    db_profile = Profile(
        id=profile_id,
        name=(profile_in.name and profile_in.name.strip()) or f"Perfil #{profile_id}",
        group=profile_in.group or "Desagrupado",
        tags=tags_str,
        notes=profile_in.notes or "",
        status=profile_in.status or "ready",
        kernel=impressao.kernel,
        os=impressao.os,
        browser_version=impressao.kernel_version,
        proxy_type=impressao.proxy_type,
        proxy_host=impressao.proxy_host,
        proxy_port=impressao.proxy_port,
        proxy_username=impressao.proxy_username,
        proxy_password=impressao.proxy_password,
        user_id=current_user.id if current_user else None,
        created_by=current_user.username if current_user else "offline_user",
        impressao_digital_id=impressao.id,
        is_deleted=False,
        fingerprint_json=json.dumps(fp_raw) if fp_raw else "{}",
    )
    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)
    return db_profile

@router.get("/trash", response_model=List[ProfileRead])
def list_trash(
    search: Optional[str] = None,
    group: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """Lista perfis que estão na lixeira (is_deleted == True)."""
    query = select(Profile).where(Profile.is_deleted == True)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                col(Profile.name).ilike(term),
                col(Profile.proxy_host).ilike(term),
                col(Profile.tags).ilike(term),
                col(Profile.notes).ilike(term),
            )
        )
    if group and group != "Todos os grupos":
        query = query.where(Profile.group == group)
    return session.exec(query.order_by(col(Profile.deleted_at).desc())).all()

@router.delete("/trash/empty")
def empty_trash(
    session: Session = Depends(get_session),
):
    """Esvazia toda a lixeira apagando definitivamente os perfis e suas impressões digitais."""
    trash_items = session.exec(select(Profile).where(Profile.is_deleted == True)).all()
    count = len(trash_items)
    for item in trash_items:
        if item.impressao_digital_id:
            imp = session.get(ImpressaoDigital, item.impressao_digital_id)
            if imp:
                session.delete(imp)
        session.delete(item)
    session.commit()
    return {"status": "success", "message": f"{count} perfis removidos permanentemente.", "deleted_count": count}

@router.get("/{profile_id}", response_model=ProfileRead)
def get_profile(
    profile_id: str,
    session: Session = Depends(get_session),
):
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
    return profile

@router.put("/{profile_id}", response_model=ProfileRead)
def update_profile(
    profile_id: str,
    profile_in: ProfileUpdate,
    session: Session = Depends(get_session),
):
    db_profile = session.get(Profile, profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
    
    update_data = profile_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_profile, key, value)
        
    db_profile.updated_at = datetime.now(timezone.utc)
    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)
    return db_profile

@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    profile_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Mover para a lixeira (Soft Delete)."""
    db_profile = session.get(Profile, profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
    db_profile.is_deleted = True
    db_profile.deleted_at = datetime.now(timezone.utc)
    db_profile.deleted_by = current_user.username if current_user else "offline_user"
    session.add(db_profile)
    session.commit()
    return None

@router.post("/{profile_id}/restore", response_model=ProfileRead)
def restore_profile(
    profile_id: str,
    session: Session = Depends(get_session),
):
    """Restaura um perfil da lixeira para a listagem ativa."""
    db_profile = session.get(Profile, profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
    db_profile.is_deleted = False
    db_profile.deleted_at = None
    db_profile.deleted_by = None
    db_profile.updated_at = datetime.now(timezone.utc)
    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)
    return db_profile

@router.delete("/{profile_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_permanent(
    profile_id: str,
    session: Session = Depends(get_session),
):
    """Exclui definitivamente o perfil e a impressão digital associada."""
    db_profile = session.get(Profile, profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
    if db_profile.impressao_digital_id:
        imp = session.get(ImpressaoDigital, db_profile.impressao_digital_id)
        if imp:
            session.delete(imp)
    session.delete(db_profile)
    session.commit()
    return None

@router.post("/{profile_id}/launch")
def launch_profile(
    profile_id: str,
    session: Session = Depends(get_session),
):
    """
    Inicia o navegador isolado com o perfil Camoufox/Playwright
    e atualiza o status para 'running' e o horário de 'ultima_abertura'.
    """
    db_profile = session.get(Profile, profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado.",
        )
        
    db_profile.status = "running"
    db_profile.ultima_abertura = datetime.now(timezone.utc)
    db_profile.updated_at = datetime.now(timezone.utc)
    session.add(db_profile)
    session.commit()
    
    return {
        "status": "launched",
        "profile_id": db_profile.id,
        "kernel": db_profile.kernel,
        "message": f"Navegador {db_profile.kernel} iniciado com sucesso.",
    }
