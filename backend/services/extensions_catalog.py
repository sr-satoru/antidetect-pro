import httpx
from typing import List, Dict, Any, Optional

CATALOG_CATEGORIES = [
    "All",
    "Workflow and planning",
    "Shopping",
    "Tools",
    "Developer tools",
    "Privacy and security",
    "Education",
    "Accessibility",
]

RECOMMENDED_EXTENSIONS_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "authenticator",
        "name": "Authenticator",
        "category": "Privacy and security",
        "description": "Authenticator generates two-factor authentication (2FA) codes in your browser with end-to-end encryption.",
        "provider": "Chrome Web Store",
        "provider_url": "https://chromewebstore.google.com/detail/authenticator/bhghoamapcdpbohkgigfljmggbfbikom",
        "icon_type": "authenticator",
        "icon_bg": "#22242D",
    },
    {
        "id": "octopusrpa",
        "name": "OctopusRPA",
        "category": "Workflow and planning",
        "description": "Add-on for web automation and robotic process automation, provided by OctopusRPA for web data collection.",
        "provider": "Chrome Web Store",
        "provider_url": "https://chromewebstore.google.com/detail/octopusrpa",
        "icon_type": "octopus",
        "icon_bg": "#096DD9",
    },
    {
        "id": "ublock-origin",
        "name": "uBlock Origin",
        "category": "Privacy and security",
        "description": "Bloqueador de anúncios e rastreadores ultra eficiente, com mínimo consumo de CPU e RAM. Integrado nativamente ao Camoufox.",
        "provider": "Firefox Add-ons",
        "provider_url": "https://addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/",
        "icon_type": "firefox",
        "icon_bg": "#FF7139",
    },
    {
        "id": "adblock",
        "name": "AdBlock — best ad blocker",
        "category": "Privacy and security",
        "description": "Block ads and pop-ups on YouTube, Facebook, Twitch, and your favorite websites seamlessly.",
        "provider": "Chrome Web Store",
        "provider_url": "https://chromewebstore.google.com/detail/adblock-%E2%80%94-best-ad-blocker/gighmmpiobklfepjocnamgkkbiglidom",
        "icon_type": "adblock",
        "icon_bg": "#E02424",
    },
    {
        "id": "exvul-defender",
        "name": "ExVul Web3 Scam Defender",
        "category": "Privacy and security",
        "description": "Identify and alert web3 phishing, fraud and other security risks in social media etc, detect malicious transactions with wallets.",
        "provider": "Chrome Web Store",
        "provider_url": "https://chromewebstore.google.com/detail/exvul-web3-scam-defender",
        "icon_type": "exvul",
        "icon_bg": "#111827",
    },
    {
        "id": "cookie-editor",
        "name": "Cookie-Editor",
        "category": "Developer tools",
        "description": "Simple yet powerful Cookie Editor that allows you to quickly create, edit, export and delete cookies without leaving your tab.",
        "provider": "Chrome Web Store",
        "provider_url": "https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm",
        "icon_type": "cookie",
        "icon_bg": "#6A3816",
    },
    {
        "id": "google-translate",
        "name": "Google Translate",
        "category": "Tools",
        "description": "View translations easily as you browse the web. By the Google Translate team with 100+ languages support.",
        "provider": "Chrome Web Store",
        "provider_url": "https://chromewebstore.google.com/detail/google-translate/aapbdbdomjkkjkaonfhkkikfgjllcleb",
        "icon_type": "translate",
        "icon_bg": "#4285F4",
    },
    {
        "id": "captcha-solver",
        "name": "Captcha Solver: Auto Recognition",
        "category": "Tools",
        "description": "2Captcha Solver plugin allows you to automatically solve CAPTCHAs, reCAPTCHA, and hCaptcha found on any webpage.",
        "provider": "Chrome Web Store",
        "provider_url": "https://chromewebstore.google.com/detail/2captcha-solver",
        "icon_type": "captcha",
        "icon_bg": "#0891B2",
    },
    {
        "id": "zhixia-data",
        "name": "Zhixia Data",
        "category": "Shopping",
        "description": "Zhixia Data is a professional tool for Shopee market analysis and product selection, powered by AI analytics.",
        "provider": "Chrome Web Store",
        "provider_url": "https://chromewebstore.google.com/detail/zhixia-data",
        "icon_type": "zhixia",
        "icon_bg": "#EA580C",
    },
    {
        "id": "dark-reader",
        "name": "Dark Reader",
        "category": "Accessibility",
        "description": "Tema escuro para todos os sites. Inverte o brilho excessivo tornando a navegação noturna agradável e sem cansaço visual.",
        "provider": "Firefox Add-ons",
        "provider_url": "https://addons.mozilla.org/pt-BR/firefox/addon/darkreader/",
        "icon_type": "firefox",
        "icon_bg": "#1F2937",
    },
    {
        "id": "tampermonkey",
        "name": "Tampermonkey",
        "category": "Developer tools",
        "description": "O gerenciador de scripts de usuários mais popular do mundo. Execute scripts customizados para automatizar tarefas em qualquer página.",
        "provider": "Firefox Add-ons",
        "provider_url": "https://addons.mozilla.org/pt-BR/firefox/addon/tampermonkey/",
        "icon_type": "firefox",
        "icon_bg": "#111827",
    },
    {
        "id": "foxyproxy",
        "name": "FoxyProxy Standard",
        "category": "Tools",
        "description": "Gerenciador avançado de proxies para o Firefox/Camoufox. Alterna automaticamente proxies com base em regras de URL e padrões globais.",
        "provider": "Firefox Add-ons",
        "provider_url": "https://addons.mozilla.org/pt-BR/firefox/addon/foxyproxy-standard/",
        "icon_type": "firefox",
        "icon_bg": "#EA580C",
    },
    {
        "id": "metamask",
        "name": "MetaMask",
        "category": "Privacy and security",
        "description": "Uma carteira de criptomoedas segura e gateway confiável para aplicativos blockchain da Web3.",
        "provider": "Chrome Web Store",
        "provider_url": "https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
        "icon_type": "metamask",
        "icon_bg": "#F58220",
    },
    {
        "id": "volume-master",
        "name": "Volume Master",
        "category": "Accessibility",
        "description": "Controle até 600% de volume por aba individualmente com amplificação de áudio digital de alta qualidade.",
        "provider": "Chrome Web Store",
        "provider_url": "https://chromewebstore.google.com/detail/volume-master/jghecgabfgfdldnmbpehkepalcocgdhe",
        "icon_type": "volume",
        "icon_bg": "#2563EB",
    },
    {
        "id": "user-agent-switcher",
        "name": "User-Agent Switcher and Manager",
        "category": "Developer tools",
        "description": "Alterne facilmente a string de User-Agent do seu navegador para simular dispositivos e sistemas operacionais variados.",
        "provider": "Firefox Add-ons",
        "provider_url": "https://addons.mozilla.org/pt-BR/firefox/addon/user-agent-string-switcher/",
        "icon_type": "firefox",
        "icon_bg": "#4F46E5",
    },
]

async def search_extensions_catalog(
    query: Optional[str] = None,
    category: Optional[str] = "All",
    store: Optional[str] = "all",
) -> List[Dict[str, Any]]:
    """
    Busca extensões no catálogo curado local do Fury e enriquece via Mozilla AMO se houver query.
    Toda a lógica e chamadas de rede externas ficam no backend Python.
    """
    clean_q = (query or "").strip().lower()
    cat_filter = category if category and category != "All" else None
    store_filter = store or "all"

    # 1. Filtra catálogo interno
    results: List[Dict[str, Any]] = []
    for ext in RECOMMENDED_EXTENSIONS_CATALOG:
        if cat_filter and ext.get("category") != cat_filter:
            continue
        
        provider = ext.get("provider", "")
        if store_filter == "firefox" and provider != "Firefox Add-ons":
            continue
        if store_filter == "chrome" and provider != "Chrome Web Store":
            continue

        if clean_q:
            name_match = clean_q in ext.get("name", "").lower()
            desc_match = clean_q in ext.get("description", "").lower()
            cat_match = clean_q in ext.get("category", "").lower()
            if not (name_match or desc_match or cat_match):
                continue

        results.append(dict(ext))

    # 2. Se houver query com 2+ caracteres e busca não for exclusiva do Chrome, enriquece via Mozilla AMO
    if clean_q and len(clean_q) >= 2 and store_filter != "chrome":
        try:
            url = f"https://addons.mozilla.org/api/v5/addons/search/?q={clean_q}&type=extension&page_size=8"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url)
                if resp.is_success:
                    data = resp.json()
                    existing_names = {r["name"].lower() for r in results}
                    
                    for item in data.get("results", []):
                        name = (
                            item.get("name", {}).get("pt-BR")
                            or item.get("name", {}).get("en-US")
                            or (list(item.get("name", {}).values())[0] if item.get("name") else "Extensão AMO")
                        )
                        if name.lower() in existing_names:
                            continue
                        
                        summary = (
                            item.get("summary", {}).get("pt-BR")
                            or item.get("summary", {}).get("en-US")
                            or (list(item.get("summary", {}).values())[0] if item.get("summary") else "Extensão oficial do ecossistema Firefox Add-ons.")
                        )
                        slug = item.get("slug")
                        results.append({
                            "id": f"amo-{item['id']}",
                            "name": name,
                            "category": "Tools",
                            "description": summary,
                            "provider": "Firefox Add-ons",
                            "provider_url": item.get("url") or f"https://addons.mozilla.org/pt-BR/firefox/addon/{slug}/",
                            "icon_type": "firefox",
                            "icon_bg": "#FF7139",
                            "icon_url": item.get("icon_url"),
                        })
        except Exception:
            # Resiliente: se a rede externa falhar ou estiver offline, retorna os resultados locais do catálogo
            pass

    return results
