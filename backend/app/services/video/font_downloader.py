"""
Font downloader utility for server-side FFmpeg rendering.
Downloads Google Fonts needed for subtitle rendering and caches them locally.
"""
import os
import re
import urllib.request
import urllib.error
import threading
from typing import Optional, List, Dict
from app.utils.logging import get_logger

logger = get_logger(__name__)

# Base directory for cached font files (backend/fonts)
_FONTS_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "fonts"))

# Thread-safe set to avoid duplicate downloads
_download_lock = threading.Lock()
_downloaded_fonts: set = set()

# Mapping of common font family names to Google Fonts API names
FONT_FAMILY_MAP: Dict[str, str] = {
    "inter": "Inter",
    "lato": "Lato",
    "roboto": "Roboto",
    "roboto mono": "Roboto+Mono",
    "roboto condensed": "Roboto+Condensed",
    "open sans": "Open+Sans",
    "montserrat": "Montserrat",
    "poppins": "Poppins",
    "nunito": "Nunito",
    "nunito sans": "Nunito+Sans",
    "raleway": "Raleway",
    "ubuntu": "Ubuntu",
    "merriweather": "Merriweather",
    "playfair display": "Playfair+Display",
    "oswald": "Oswald",
    "source sans pro": "Source+Sans+3",
    "source sans 3": "Source+Sans+3",
    "pt sans": "PT+Sans",
    "pt serif": "PT+Serif",
    "work sans": "Work+Sans",
    "barlow": "Barlow",
    "outfit": "Outfit",
    "dm sans": "DM+Sans",
    "plus jakarta sans": "Plus+Jakarta+Sans",
    "jakarta sans": "Plus+Jakarta+Sans",
    "figtree": "Figtree",
    "noto sans": "Noto+Sans",
    "noto sans telugu": "Noto+Sans+Telugu",
    "noto sans devanagari": "Noto+Sans+Devanagari",
    "noto serif": "Noto+Serif",
    "bebas neue": "Bebas+Neue",
    "titillium web": "Titillium+Web",
    "cabin": "Cabin",
    "karla": "Karla",
    "mulish": "Mulish",
    "exo 2": "Exo+2",
    "exo": "Exo+2",
    "quicksand": "Quicksand",
    "josefin sans": "Josefin+Sans",
    "josefin": "Josefin+Sans",
    "rubik": "Rubik",
    "archivo": "Archivo",
    "space grotesk": "Space+Grotesk",
    "manrope": "Manrope",
    "syne": "Syne",
    "bricolage grotesque": "Bricolage+Grotesque",
    "bricolage": "Bricolage+Grotesque",
    "albert sans": "Albert+Sans",
    "onest": "Onest",
    "geist": "Geist",
    "geist mono": "Geist+Mono",
    "lexend": "Lexend",
    "libre baskerville": "Libre+Baskerville",
    "crimson text": "Crimson+Text",
    "eb garamond": "EB+Garamond",
    "cormorant garamond": "Cormorant+Garamond",
    "spectral": "Spectral",
    "dm serif display": "DM+Serif+Display",
    "fraunces": "Fraunces",
    "young serif": "Young+Serif",
    "bodoni moda": "Bodoni+Moda",
    "abril fatface": "Abril+Fatface",
    "boogaloo": "Boogaloo",
    "pacifico": "Pacifico",
    "lobster": "Lobster",
    "lobster two": "Lobster+Two",
    "satisfy": "Satisfy",
    "dancing script": "Dancing+Script",
    "great vibes": "Great+Vibes",
    "allura": "Allura",
    "petit formal script": "Petit+Formal+Script",
    "anton": "Anton",
    "black ops one": "Black+Ops+One",
    "teko": "Teko",
    "rajdhani": "Rajdhani",
    "russo one": "Russo+One",
    "righteous": "Righteous",
    "fredoka one": "Fredoka+One",
    "fredoka": "Fredoka",
    "bangers": "Bangers",
    "permanent marker": "Permanent+Marker",
    "special elite": "Special+Elite",
    "courier prime": "Courier+Prime",
    "space mono": "Space+Mono",
    "ibm plex mono": "IBM+Plex+Mono",
    "ibm plex sans": "IBM+Plex+Sans",
    "fira code": "Fira+Code",
    "fira sans": "Fira+Sans",
    "inconsolata": "Inconsolata",
    "source code pro": "Source+Code+Pro",
    "major mono display": "Major+Mono+Display",
    "share tech mono": "Share+Tech+Mono",
}

# Essential fonts to always have available for Telugu/Indic rendering
ESSENTIAL_FONTS = [
    "Noto+Sans+Telugu",
    "Noto+Sans+Devanagari",
    "Noto+Sans",
    "Inter",
]


def get_fonts_dir() -> str:
    """Return the fonts directory, creating it if needed."""
    os.makedirs(_FONTS_DIR, exist_ok=True)
    return _FONTS_DIR


def normalize_font_name(font_family: str) -> str:
    """Normalize font family name to Google Fonts API format."""
    key = font_family.lower().strip()
    if key in FONT_FAMILY_MAP:
        return FONT_FAMILY_MAP[key]
    # Try replacing spaces with + for Google Fonts URL
    return font_family.replace(" ", "+")


def get_cached_font_path(font_family: str, weight: int = 400) -> Optional[str]:
    """Check if a font file is already cached locally."""
    fonts_dir = get_fonts_dir()
    # Normalize font name for filename
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', font_family)
    
    # Check for exact weight file - TTF/OTF only (libass cannot load woff2)
    for ext in [".ttf", ".otf"]:
        path = os.path.join(fonts_dir, f"{safe_name}_{weight}{ext}")
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            return path
        # Also check without weight suffix (generic)
        path_generic = os.path.join(fonts_dir, f"{safe_name}{ext}")
        if os.path.exists(path_generic) and os.path.getsize(path_generic) > 1000:
            return path_generic
    return None


def download_font(font_family: str, weights: List[int] = None) -> bool:
    """
    Download a Google Font and cache it locally as TTF.
    Returns True if download succeeded.
    """
    if weights is None:
        weights = [400, 700]
    
    fonts_dir = get_fonts_dir()
    google_name = normalize_font_name(font_family)
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', font_family)
    
    font_key = f"{font_family}_{','.join(map(str, weights))}".lower()
    
    with _download_lock:
        if font_key in _downloaded_fonts:
            return True
    
    # Downloading via Google Fonts CSS API.
    # CRITICAL: Using 'curl/7.68.0' user agent instructs Google Fonts to return
    # format('truetype') with direct TTF file URLs. Modern browser UAs return WOFF2,
    # which libass cannot open (causing 'Error opening memory font' and fallback to Arial).
    weights_str = ";".join(map(str, sorted(set(weights))))
    css_url = f"https://fonts.googleapis.com/css2?family={google_name}:wght@{weights_str}&display=swap"
    
    headers = {
        "User-Agent": "curl/7.68.0"
    }
    
    try:
        req = urllib.request.Request(css_url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            css_content = resp.read().decode("utf-8")
        
        # Extract TTF font URLs from CSS
        font_urls = re.findall(r"url\(([^)]+)\)", css_content)
        font_urls = [u.strip("'\"") for u in font_urls if ".ttf" in u or "truetype" in css_content]
        
        if not font_urls:
            # Fallback regex if no explicit .ttf in url
            font_urls = [u.strip("'\"") for u in re.findall(r"url\(([^)]+)\)", css_content)]
        
        if not font_urls:
            logger.warning("No font URLs found in Google Fonts CSS", font=font_family, css_url=css_url)
            return False
        
        downloaded = False
        for i, url in enumerate(font_urls[:len(weights) * 2]):
            # Try to parse weight from URL or CSS context
            weight = weights[i % len(weights)] if weights else 400
            url_idx = css_content.find(url)
            if url_idx > 0:
                css_before = css_content[max(0, url_idx - 400):url_idx]
                weight_match = re.findall(r"font-weight:\s*(\d+)", css_before)
                if weight_match:
                    weight = int(weight_match[-1])
            
            out_path = os.path.join(fonts_dir, f"{safe_name}_{weight}.ttf")
            
            if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
                downloaded = True
                continue
            
            try:
                font_req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(font_req, timeout=30) as font_resp:
                    font_data = font_resp.read()
                
                # Check for TTF/OTF magic bytes (0x00010000, 'OTTO', 'true')
                if len(font_data) > 1000:
                    with open(out_path, "wb") as f:
                        f.write(font_data)
                    logger.info("Downloaded font TTF", font=font_family, weight=weight, path=out_path, size=len(font_data))
                    downloaded = True
                    # Also save as generic if first download or weight 400
                    generic_path = os.path.join(fonts_dir, f"{safe_name}.ttf")
                    if not os.path.exists(generic_path) or weight == 400:
                        with open(generic_path, "wb") as f:
                            f.write(font_data)
            except Exception as e:
                logger.warning("Failed to download font file", url=url, error=str(e))
                logger.warning("Failed to download font file", url=url, error=str(e))
        
        if downloaded:
            with _download_lock:
                _downloaded_fonts.add(font_key)
        return downloaded
        
    except Exception as e:
        logger.warning("Failed to fetch Google Fonts CSS", font=font_family, error=str(e))
        return False


def ensure_fonts_available(font_families: List[str]) -> str:
    """
    Download all required fonts and return the fonts directory path.
    This is the main entry point called before FFmpeg rendering.
    """
    fonts_dir = get_fonts_dir()
    
    # Always ensure essential fallback fonts are available
    all_fonts = list(set(font_families + ESSENTIAL_FONTS))
    
    for font in all_fonts:
        if not font or font.lower() in ("system-ui", "sans-serif", "serif", "monospace"):
            continue
        
        # Skip if already cached
        if get_cached_font_path(font):
            continue
        
        # Try download (non-blocking failure OK - system fonts act as fallback)
        try:
            success = download_font(font, weights=[400, 600, 700, 800, 900])
            if not success:
                logger.warning("Could not download font, will use system fallback", font=font)
        except Exception as e:
            logger.warning("Font download exception", font=font, error=str(e))
    
    return fonts_dir
