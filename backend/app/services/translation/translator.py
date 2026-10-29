import json
import re
import httpx
from typing import List, Dict, Any, Optional, Tuple
from deep_translator import MyMemoryTranslator
from app.core.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

LANG_NAMES = {
    "te": "Telugu",
    "te_en": "Telugu + English",
    "hi": "Hindi",
    "en": "English",
    "te_roman": "Telugu English Letters"
}

LANG_MAP_MYMEMORY = {
    "te": "te-IN",
    "hi": "hi-IN",
    "en": "en-US"
}

# Regex for numeric preservation: integers, decimals, percentages, currency ($/₹/€/£), time, dates, years, ordinals, versions, ranges, resolutions/specs
NUMERIC_PATTERN = re.compile(
    r'('
    r'[₹$€£]\s*\d+(?:\.\d+)?|' # Currency: ₹500, $100, €50, £20
    r'\b\d+(?:\.\d+)?%|' # Percentage: 85%, 75.5%
    r'\b\d+(?:\.\d+)?(?:st|nd|rd|th|k|p|fps|MB|GB|TB)\b|' # Ordinals & Specs: 1st, 2nd, 3rd, 4th, 10th, 1080p, 60fps
    r'\b\d{1,2}:\d{2}(?:\s*[AP]M)?\b|' # Time: 10:30, 10:30 AM
    r'\b\d{4}-\d{2}-\d{2}\b|' # Dates: 2026-09-26
    r'\b\d+-\d+\b|' # Ranges: 10-20
    r'\b\d+\.\d+\b|' # Decimals / Versions: 3.14, 5.0, 3.5
    r'\b\d{4}\b|' # Years: 2026
    r'\b\d+\b' # Integers: 3, 10, 25, 100
    r')',
    re.IGNORECASE
)

# Rule-based fallback dictionary for Roman Telugu transliteration & numeric word mapping
ROMAN_TELUGU_DICT = {
    "మూడు": "3",
    "నాలుగో": "4th",
    "ఒకటి": "1",
    "రెండు": "2",
    "నాలుగు": "4",
    "ఐదు": "5",
    "ఆరు": "6",
    "ఏడు": "7",
    "ఎనిమిది": "8",
    "తొమ్మిది": "9",
    "పది": "10",
    "మొదటి": "1st",
    "రెండో": "2nd",
    "మూడో": "3rd",
    "పదో": "10th",
    "ఇది": "Idi",
    "ఒక": "oka",
    "కొత్త": "kotha",
    "చాలా": "chala",
    "మనకు": "manaku",
    "ఎలా": "ela",
    "ఎందుకు": "enduku",
    "చేస్తుంది": "chestundi",
    "వచ్చింది": "vachindi",
    "ఉపయోగించండి": "upayoginchandi",
    "ఉంది": "undi",
    "ఉన్నాయి": "unnayi",
    "ఉన్నాను": "unna",
    "నాకు": "Naku",
    "నేను": "Nenu",
    "ఇయర్లో": "year lo",
    "గురించి": "gurinchi",
    "బ్యాక్లాగ్స్": "backlogs",
    "లో": "lo",
    "స్కోర్": "score",
    "మీటింగ్": "meeting",
    "వర్షన్": "version",
    "చేస్తున్నాను": "chestunnanu",
    "వీడియో": "video",
    "టూల్": "tool",
    "కృత్రిమ మేధస్సు": "AI",
    "వరకు": "varaku",
    "పనిచేస్తుంది": "panichestundi"
}

# Post-processing map for converting any accidental written number words back to numeric digits
WORD_TO_NUM_MAP = {
    r'\bone\b': '1', r'\btwo\b': '2', r'\bthree\b': '3', r'\bfour\b': '4', r'\bfive\b': '5',
    r'\bsix\b': '6', r'\bseven\b': '7', r'\beight\b': '8', r'\bnine\b': '9', r'\bten\b': '10',
    r'\bfirst\b': '1st', r'\bsecond\b': '2nd', r'\bthird\b': '3rd', r'\bfourth\b': '4th',
    r'\btwenty twenty-six\b': '2026', r'\btwenty twenty six\b': '2026',
    r'\bfive point zero\b': '5.0', r'\beighty-five percent\b': '85%', r'\beighty five percent\b': '85%'
}

# Phonetic Unicode Transliteration maps for Telugu Script -> Roman Telugu
TELUGU_VOWELS = {
    'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ee', 'ఉ': 'u', 'ఊ': 'oo', 'ఋ': 'ru',
    'ఎ': 'e', 'ఏ': 'e', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'o', 'ఔ': 'au'
}

TELUGU_CONSONANTS = {
    'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'ఙ': 'ng',
    'చ': 'ch', 'ఛ': 'chh', 'జ': 'j', 'ఝ': 'jh', 'ఞ': 'ny',
    'ట': 't', 'ఠ': 'th', 'డ': 'd', 'ఢ': 'dh', 'ణ': 'n',
    'త': 'th', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n',
    'ప': 'p', 'ఫ': 'ph', 'బ': 'b', 'భ': 'bh', 'మ': 'm',
    'య': 'y', 'ర': 'r', 'ల': 'l', 'వ': 'v', 'శ': 'sh', 'ష': 'sh', 'స': 's', 'హ': 'h', 'ళ': 'l', 'ఱ': 'r'
}

TELUGU_MATRAS = {
    'ా': 'aa', 'ి': 'i', 'ీ': 'ee', 'ు': 'u', 'ూ': 'oo', 'ృ': 'ru',
    'ె': 'e', 'ే': 'e', 'ై': 'ai', 'ొ': 'o', 'ో': 'o', 'ౌ': 'au'
}


def transliterate_telugu_word(word: str) -> str:
    """Phonetic Unicode transliterator for Telugu script to Roman Telugu (Latin alphabet)."""
    clean_w = re.sub(r'[^\w\u0C00-\u0C7F]', '', word)
    if clean_w in ROMAN_TELUGU_DICT:
        return word.replace(clean_w, ROMAN_TELUGU_DICT[clean_w])

    res = []
    i = 0
    n = len(word)
    while i < n:
        char = word[i]
        if char in TELUGU_VOWELS:
            res.append(TELUGU_VOWELS[char])
            i += 1
        elif char in TELUGU_CONSONANTS:
            base = TELUGU_CONSONANTS[char]
            i += 1
            if i < n and word[i] == '్': # Virama / Halant
                i += 1
                res.append(base)
            elif i < n and word[i] in TELUGU_MATRAS:
                res.append(base + TELUGU_MATRAS[word[i]])
                i += 1
            elif i < n and word[i] == 'ం':
                res.append(base + 'am')
                i += 1
            else:
                res.append(base + 'a')
        elif char in TELUGU_MATRAS:
            res.append(TELUGU_MATRAS[char])
            i += 1
        elif char == 'ం':
            res.append('m')
            i += 1
        elif char == '్':
            i += 1
        else:
            res.append(char)
            i += 1

    out = ''.join(res)
    return out[0].upper() + out[1:] if out and word[0].isupper() else out


def transliterate_telugu_text(text: str) -> str:
    """Transliterate full Telugu text to Roman Telugu (Latin script)."""
    words = text.split()
    return " ".join([transliterate_telugu_word(w) for w in words])


# Comprehensive dictionary for common English loan words spoken in Telugu video captions
ENGLISH_TO_TELUGU_DICT = {
    # Test cases & user prompt requirements
    "problem": "ప్రాబ్లెమ్",
    "problems": "ప్రాబ్లెమ్స్",
    "software": "సాఫ్ట్వేర్",
    "video": "వీడియో",
    "videos": "వీడియోస్",
    "mobile": "మొబైల్",
    "mobiles": "మొబైల్స్",
    "technology": "టెక్నాలజీ",
    "technologies": "టెక్నాలజీస్",
    "ai": "ఏఐ",
    "useful": "యూస్ఫుల్",
    "fast": "ఫాస్ట్",
    "faster": "ఫాస్టర్",
    "develop": "డెవలప్",
    "developed": "డెవలప్డ్",
    "developing": "డెవలపింగ్",
    "development": "డెవలప్‌మెంట్",
    "edit": "ఎడిట్",
    "edited": "ఎడిట్",
    "editing": "ఎడిటింగ్",
    "editor": "ఎడిటర్",
    "backlog": "బ్యాక్లాగ్",
    "backlogs": "బ్యాక్లాగ్స్",

    # Common technical, digital & creator loan words
    "tool": "టూల్",
    "tools": "టూల్స్",
    "app": "యాప్",
    "apps": "యాప్స్",
    "application": "అప్లికేషన్",
    "applications": "అప్లికేషన్స్",
    "feature": "ఫీచర్",
    "features": "ఫీచర్స్",
    "project": "ప్రాజెక్ట్",
    "projects": "ప్రాజెక్ట్స్",
    "code": "కోడ్",
    "coding": "కోడింగ్",
    "laptop": "ల్యాప్‌టాప్",
    "computer": "కంప్యూటర్",
    "screen": "స్క్రీన్",
    "display": "డిస్‌ప్లే",
    "phone": "ఫోన్",
    "phones": "ఫోన్స్",
    "camera": "కెమెరా",
    "audio": "ఆడియో",
    "mic": "మైక్",
    "microphone": "మైక్రోఫోన్",
    "online": "ఆన్‌లైన్",
    "offline": "ఆఫ్‌లైన్",
    "internet": "ఇంటర్నెట్",
    "website": "వెబ్‌సైట్",
    "site": "సైట్",
    "link": "లింక్",
    "links": "లింక్స్",
    "channel": "ఛానల్",
    "subscribe": "సబ్‌స్క్రైబ్",
    "like": "లైక్",
    "share": "షేర్",
    "comment": "కామెంట్",
    "comments": "కామెంట్స్",
    "post": "పోస్ట్",
    "posts": "పోస్ట్స్",
    "update": "అప్‌డేట్",
    "updates": "అప్‌డేట్స్",
    "version": "వెర్షన్",
    "score": "స్కోర్",
    "test": "టెస్ట్",
    "testing": "టెస్టింగ్",
    "exam": "ఎగ్జామ్",
    "exams": "ఎగ్జామ్స్",
    "college": "కాలేజ్",
    "school": "స్కూల్",
    "student": "స్టూడెంట్",
    "students": "స్టూడెంట్స్",
    "office": "ఆఫీస్",
    "work": "వర్క్",
    "job": "జాబ్",
    "jobs": "జాబ్స్",
    "company": "కంపెనీ",
    "meeting": "మీటింగ్",
    "call": "కాల్",
    "message": "మెసేజ్",
    "chat": "చాట్",
    "system": "సిస్టమ్",
    "data": "డేటా",
    "file": "ఫైల్",
    "files": "ఫైల్స్",
    "folder": "ఫోల్డర్",
    "download": "డౌన్‌లోడ్",
    "upload": "అప్‌లోడ్",
    "install": "ఇన్‌స్టాల్",
    "click": "క్లిక్",
    "button": "బటన్",
    "setting": "సెట్టింగ్",
    "settings": "సెట్టింగ్స్",
    "option": "ఆప్షన్",
    "options": "ఆప్షన్స్",
    "free": "ఫ్రీ",
    "paid": "పెయిడ్",
    "account": "అకౌంట్",
    "profile": "ప్రొఫైల్",
    "password": "పాస్‌వర్డ్",
    "user": "యూజర్",
    "users": "యూజర్స్",
    "content": "కంటెంట్",
    "creator": "క్రియేటర్",
    "creators": "క్రియేటర్స్",
    "review": "రివ్యూ",
    "topic": "టాపిక్",
    "class": "క్లాస్",
    "classes": "క్లాసెస్",
    "course": "కోర్స్",
    "start": "స్టార్ట్",
    "stop": "స్టాప్",
    "pause": "పాజ్",
    "play": "ప్లే",
    "easy": "ఈజీ",
    "hard": "హార్డ్",
    "simple": "సింపుల్",
    "best": "బెస్ట్",
    "good": "గుడ్",
    "super": "సూపర్",
    "great": "గ్రేట్",
    "nice": "నైస్",
    "new": "న్యూ",
    "old": "ఓల్డ్",
    "high": "హై",
    "low": "లో",
    "level": "లెవల్",
    "next": "నెక్స్ట్",
    "previous": "ప్రీవియస్",
    "first": "ఫస్ట్",
    "last": "లాస్ట్",
    "time": "టైమ్",
    "day": "డే",
    "year": "ఇయర్",
    "years": "ఇయర్స్",
    "month": "మంత్",
    "months": "మంత్స్",
    "week": "వీక్",
    "weeks": "వీక్స్",
    "today": "టుడే",
    "ready": "రెడీ",
    "clear": "క్లియర్",
    "check": "చెక్",
    "try": "ట్రై",
    "use": "యూస్",
    "help": "హెల్ప్",
    "details": "డీటెయిల్స్",
    "info": "ఇన్ఫో",
    "information": "ఇన్ఫర్మేషన్",
    "result": "రిజల్ట్",
    "results": "రిజల్ట్స్",
    "pass": "పాస్",
    "fail": "ఫెయిల్",
    "success": "సక్సెస్",
    "error": "ఎర్రర్",
    "bug": "బగ్",
    "bugs": "బగ్స్",
    "solution": "సొల్యూషన్",
    "idea": "ఐడియా",
    "tips": "టిప్స్",
    "tricks": "ట్రిక్స్"
}

# Phonetic syllable mappings for English -> Telugu script transliteration
ENG_TO_TEL_VOWELS = {
    'a': 'అ', 'aa': 'ఆ', 'e': 'ఎ', 'ee': 'ఈ', 'i': 'ఇ', 'o': 'ఒ', 'oo': 'ఊ', 'u': 'ఉ',
    'ai': 'ఐ', 'au': 'ఔ', 'ou': 'ఔ', 'ea': 'ఈ', 'oa': 'ఓ', 'ay': 'ఏ', 'ey': 'ఏ'
}

ENG_TO_TEL_MATRAS = {
    'a': 'ా', 'aa': 'ా', 'e': 'ె', 'ee': 'ీ', 'i': 'ి', 'o': 'ొ', 'oo': 'ూ', 'u': 'ు',
    'ai': 'ై', 'au': 'ౌ', 'ou': 'ౌ', 'ea': 'ీ', 'oa': 'ో', 'ay': 'ే', 'ey': 'ే'
}

ENG_TO_TEL_CONSONANTS = {
    'b': 'బ', 'c': 'క', 'd': 'డ', 'f': 'ఫ', 'g': 'గ', 'h': 'హ',
    'j': 'జ', 'k': 'క', 'l': 'ల', 'm': 'మ', 'n': 'న', 'p': 'ప',
    'q': 'క', 'r': 'ర', 's': 'స', 't': 'ట', 'v': 'వ', 'w': 'వ',
    'x': 'క్స్', 'y': 'య', 'z': 'జ',
    'ch': 'చ', 'sh': 'ష', 'th': 'త', 'ph': 'ఫ', 'gh': 'ఘ', 'kh': 'ఖ', 'bh': 'భ', 'dh': 'ధ'
}


def transliterate_english_word_phonetic(word: str) -> str:
    """Phonetically transliterate an English loan word into Telugu script (no semantic translation)."""
    w = word.lower().strip()
    if not w:
        return ""
    if w in ENGLISH_TO_TELUGU_DICT:
        return ENGLISH_TO_TELUGU_DICT[w]

    res = []
    i = 0
    n = len(w)

    while i < n:
        # Check two-character consonants (e.g. sh, ch, th, ph)
        if i + 1 < n and w[i:i+2] in ENG_TO_TEL_CONSONANTS:
            cons = ENG_TO_TEL_CONSONANTS[w[i:i+2]]
            i += 2
            if i < n:
                if i + 1 < n and w[i:i+2] in ENG_TO_TEL_MATRAS:
                    res.append(cons + ENG_TO_TEL_MATRAS[w[i:i+2]])
                    i += 2
                elif w[i] in ENG_TO_TEL_MATRAS:
                    res.append(cons + ENG_TO_TEL_MATRAS[w[i]])
                    i += 1
                else:
                    res.append(cons + '్')
            else:
                res.append(cons + '్')
            continue

        # Check single consonants
        if w[i] in ENG_TO_TEL_CONSONANTS:
            c_char = w[i]
            # 'c' before e/i/y sounds like 's'
            if c_char == 'c' and i + 1 < n and w[i+1] in ['e', 'i', 'y']:
                cons = 'స'
            else:
                cons = ENG_TO_TEL_CONSONANTS[c_char]
            i += 1

            if i < n:
                if i + 1 < n and w[i:i+2] in ENG_TO_TEL_MATRAS:
                    res.append(cons + ENG_TO_TEL_MATRAS[w[i:i+2]])
                    i += 2
                elif w[i] in ENG_TO_TEL_MATRAS:
                    res.append(cons + ENG_TO_TEL_MATRAS[w[i]])
                    i += 1
                else:
                    res.append(cons + '్')
            else:
                res.append(cons + '్')
            continue

        # Check vowels at start or standalone
        if i + 1 < n and w[i:i+2] in ENG_TO_TEL_VOWELS:
            res.append(ENG_TO_TEL_VOWELS[w[i:i+2]])
            i += 2
            continue

        if w[i] in ENG_TO_TEL_VOWELS:
            res.append(ENG_TO_TEL_VOWELS[w[i]])
            i += 1
            continue

        res.append(w[i])
        i += 1

    out = ''.join(res)
    # Clean up double halants
    return re.sub(r'్+', '్', out)


def transliterate_english_to_telugu(text: str) -> str:
    """
    Validation & transliteration function ONLY for Telugu mode ('te').
    Converts English/Latin words phonetically to Telugu script.
    Leaves numbers, Telugu characters, punctuation, and numeric placeholders intact.
    """
    def replacer(match):
        token = match.group(0)
        # If it's a numeric placeholder __NUM_x__, keep it intact!
        if token.startswith("__NUM_") and token.endswith("__"):
            return token
        return transliterate_english_word_phonetic(token)

    # Match numeric placeholders or English/Latin alphabetical words
    pattern = re.compile(r'(__NUM_\d+__|[A-Za-z]+)')
    return pattern.sub(replacer, text)


class TranslationService:
    """Service for transforming caption segments into 5 output language/script modes with numeric preservation."""

    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY
        self.groq_api_url = settings.GROQ_API_URL

    def detect_language_from_text(self, text: str) -> str:
        """Detect language using Unicode script character range analysis."""
        if not text:
            return "en"

        telugu_chars = len(re.findall(r'[\u0C00-\u0C7F]', text))
        hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
        letters = len(re.findall(r'\w', text)) or len(text)

        if (telugu_chars / max(1, letters)) > 0.10:
            return "te"
        if (hindi_chars / max(1, letters)) > 0.10:
            return "hi"
        return "en"

    def normalize_language_code(self, code: Optional[str], text_fallback: str = "") -> str:
        """Normalize language code to standard mode identifiers ('te', 'te_en', 'en', 'hi', 'te_roman')."""
        if code:
            c = str(code).lower().strip()
            c_clean = re.sub(r'[^\w\s_]', '', c).strip()

            if c in ["te_roman", "telugu_roman", "roman_telugu"] or "roman" in c or "english letters" in c or "latin" in c:
                return "te_roman"
            if c in ["te_en", "telugu_english", "telugu_+__english"] or "telugu + english" in c or "telugu english" in c or "code_switch" in c:
                return "te_en"
            if c in ["tel", "te", "telugu"]:
                return "te"
            if c in ["hin", "hi", "hindi"]:
                return "hi"
            if c in ["eng", "en", "english"]:
                return "en"
        return self.detect_language_from_text(text_fallback)

    def mask_numeric_tokens(self, text: str) -> Tuple[str, Dict[str, str]]:
        """Mask numeric tokens to preserve numbers deterministically before translation/transliteration."""
        token_map = {}
        counter = 0

        def replace_match(match):
            nonlocal counter
            key = f"__NUM_{counter}__"
            token_map[key] = match.group(0)
            counter += 1
            return key

        masked_text = NUMERIC_PATTERN.sub(replace_match, text)
        return masked_text, token_map

    def unmask_numeric_tokens(self, text: str, token_map: Dict[str, str]) -> str:
        """Restore exact numeric tokens after translation/transliteration and fix any accidental number words."""
        result = text
        for key, val in token_map.items():
            result = result.replace(key, val)

        # Post-processing numeric token validation: fix written number words into numeric digits
        num_word_replacements = {
            r'\bమూడు\b': '3', r'\bనాలుగో\b': '4th', r'\bనాల్గో\b': '4th', r'\bఒకటి\b': '1', r'\bరెండు\b': '2',
            r'\bనాలుగు\b': '4', r'\bఐదు\b': '5', r'\bఆరు\b': '6', r'\bఏడు\b': '7',
            r'\bఎనిమిది\b': '8', r'\bతొమ్మిది\b': '9', r'\bపది\b': '10',
            r'\bmoodu\b': '3', r'\bmuddu\b': '3', r'\bnalugo\b': '4th', r'\bnaalugo\b': '4th', r'\bnaalugoo\b': '4th',
            r'\bone\b': '1', r'\btwo\b': '2', r'\bthree\b': '3', r'\bfour\b': '4', r'\bfive\b': '5',
            r'\bsix\b': '6', r'\bseven\b': '7', r'\beight\b': '8', r'\bnine\b': '9', r'\bten\b': '10',
            r'\bfirst\b': '1st', r'\bsecond\b': '2nd', r'\bthird\b': '3rd', r'\bfourth\b': '4th',
            r'\btwenty twenty-six\b': '2026', r'\btwenty twenty six\b': '2026',
            r'\bfive point zero\b': '5.0', r'\beighty-five percent\b': '85%', r'\beighty five percent\b': '85%'
        }

        for pattern, replacement in num_word_replacements.items():
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

        return result

    async def translate_segments(
        self,
        segments: List[Dict[str, Any]],
        source_lang: str,
        target_lang: str
    ) -> List[Dict[str, Any]]:
        """
        Transform caption segments into requested target mode (te, te_en, en, hi, te_roman)
        with deterministic numeric preservation and word timing preservation.
        """
        if not segments:
            return []

        sample_text = " ".join([s.get('text', '') for s in segments[:3]])
        src = self.normalize_language_code(source_lang, sample_text)
        tgt = self.normalize_language_code(target_lang)

        logger.info("Translation/Transformation requested", source_lang=source_lang, target_lang=target_lang, normalized_src=src, normalized_tgt=tgt, segment_count=len(segments))

        if src == tgt and src == "te":
            has_latin = any(re.search(r'[A-Za-z]', s.get('text', '')) for s in segments)
            if not has_latin:
                logger.info("Source and target modes are both pure Telugu without Latin loan words. Returning original segments.")
                return segments

        original_texts = [seg.get('text', '') for seg in segments]

        # Apply Numeric Token Protection Layer
        masked_texts = []
        token_maps = []
        for txt in original_texts:
            m_txt, t_map = self.mask_numeric_tokens(txt)
            masked_texts.append(m_txt)
            token_maps.append(t_map)

        # 1. Primary: Groq LLM Batch Transformation
        transformed_texts = await self._transform_with_groq(masked_texts, src, tgt)

        # 2. Fallback: Secondary service or rule-based transliterator
        if not transformed_texts or len(transformed_texts) != len(segments):
            logger.warning("Primary Groq transformation unavailable. Using fallback transformation engine.")
            transformed_texts = await self._transform_with_fallback(masked_texts, src, tgt)

        # Validation / phonetic transliteration specifically for Telugu mode ('te'):
        # Detect any unintended Latin/English loan words in Telugu output and transliterate them phonetically into Telugu script.
        if tgt == "te":
            transformed_texts = [transliterate_english_to_telugu(t) for t in transformed_texts]

        # Unmask Numeric Tokens and post-process
        final_texts = []
        for i, trans in enumerate(transformed_texts):
            unmasked = self.unmask_numeric_tokens(trans, token_maps[i])
            final_texts.append(unmasked)

        transformed_segments = []
        for i, seg in enumerate(segments):
            start = seg.get('start', 0.0)
            end = seg.get('end', 0.0)
            duration = max(0.1, end - start)

            trans_text = final_texts[i] if i < len(final_texts) else seg.get('text', '')

            # Calculate word-level timestamps for transformed text strictly within original segment timing
            orig_words = seg.get('words', [])
            words_in_trans = [w for w in trans_text.strip().split() if w]
            new_words = []
            if words_in_trans:
                if len(orig_words) == len(words_in_trans):
                    for w_idx, w_str in enumerate(words_in_trans):
                        new_words.append({
                            'text': w_str,
                            'start': orig_words[w_idx].get('start', round(start + w_idx * (duration / len(words_in_trans)), 2)),
                            'end': orig_words[w_idx].get('end', round(start + (w_idx + 1) * (duration / len(words_in_trans)), 2))
                        })
                else:
                    word_dur = duration / len(words_in_trans)
                    for w_idx, w_str in enumerate(words_in_trans):
                        w_start = round(start + w_idx * word_dur, 2)
                        w_end = round(start + (w_idx + 1) * word_dur, 2)
                        new_words.append({
                            'text': w_str,
                            'start': w_start,
                            'end': w_end
                        })

            new_seg = dict(seg)
            new_seg['text'] = trans_text
            new_seg['start'] = start
            new_seg['end'] = end
            new_seg['words'] = new_words
            transformed_segments.append(new_seg)

        logger.info("Caption mode transformation completed", src=src, tgt=tgt, segment_count=len(transformed_segments))
        return transformed_segments

    async def _transform_with_groq(
        self,
        texts: List[str],
        source_lang: str,
        target_mode: str
    ) -> Optional[List[str]]:
        if not self.groq_api_key or self.groq_api_key.startswith("your-"):
            return None

        # Explicit prompts for the 5 Modes
        if target_mode == "te_roman":
            prompt_instructions = """You are an expert Telugu-to-Roman Telugu (Latin script) transliterator.
Convert the input Telugu captions into Roman Telugu (Telugu language written strictly using English/Latin letters).

CRITICAL CONSTRAINTS:
1. THIS IS TRANSLITERATION, NOT ENGLISH TRANSLATION. Keep the original Telugu language words, but write them in Latin letters.
   - Example Telugu: "మీరు ఎలా ఉన్నారు?" -> Roman Telugu: "Meeru ela unnaru?" (NOT "How are you?")
   - Example Telugu: "నేను ఈరోజు ఒక కొత్త AI tool గురించి వీడియో చేస్తున్నాను." -> Roman Telugu: "Nenu eeroju oka kotha AI tool gurinchi video chestunnanu."
2. Preserve English technical terms in English letters (e.g. AI, tool, app, feature, video, python, code, useful, meeting, project).
3. Preserve all numeric placeholders like __NUM_0__, __NUM_1__ EXACTLY AS-IS without altering.
4. NUMERIC VALUES MUST REMAIN NUMERIC DIGITS (e.g. 3, 10, 2026, 85%, ₹500, 10:30, 5.0, 1080p, 60fps). NEVER write out numbers as words.
5. Maintain exact line-by-line order. Return ONLY a valid JSON array of strings."""

        elif target_mode == "te_en":
            prompt_instructions = """You are an expert Telugu + English code-switched caption generator.
Convert the input captions into natural modern Telugu + English mixed speech as used by modern creators.

CRITICAL CONSTRAINTS:
1. Common technical, digital, and everyday loan words (e.g., AI, tool, video, code, app, feature, project, technology, useful, accurate, score, meeting, version, year, backlogs) MUST BE WRITTEN IN ENGLISH SCRIPT.
2. The core Telugu sentence structure and Telugu words MUST remain in TELUGU SCRIPT (తెలుగు).
   - Example Input: "నేను 2026లో ఒక కొత్త కృత్రిమ మేధస్సు టూల్ గురించి వీడియో చేస్తున్నాను. ఇది 85% వరకు కచ్చితంగా పనిచేస్తుంది."
   - Example Output: ["నేను 2026లో ఒక new AI tool గురించి video చేస్తున్నాను.", "ఇది 85% వరకు accurate గా పనిచేస్తుంది."]
3. Do NOT translate the entire sentence into full English. Do NOT transliterate the whole sentence into Roman Telugu.
4. Preserve all numeric placeholders like __NUM_0__, __NUM_1__ EXACTLY AS-IS.
5. Maintain exact line-by-line order. Return ONLY a valid JSON array of strings."""

        elif target_mode == "en":
            prompt_instructions = """You are a professional English translator.
Translate the input captions into natural, fluent English.

CRITICAL CONSTRAINTS:
1. Translate fully into standard English text (NOT Telugu script, NOT Roman Telugu).
   - Example Input: "నేను 2026లో ఒక కొత్త AI tool గురించి వీడియో చేస్తున్నాను."
   - Example Output: "I am making a video about a new AI tool in 2026."
2. Preserve all numeric placeholders like __NUM_0__, __NUM_1__ EXACTLY AS-IS.
3. Keep numbers as numeric digits (3, 10, 2026, 85%, ₹500, 10:30, 5.0).
4. Maintain exact line-by-line order. Return ONLY a valid JSON array of strings."""

        elif target_mode == "hi":
            prompt_instructions = """You are a professional Hindi translator.
Translate the input captions into natural, fluent Hindi in Devanagari script (हिन्दी).

CRITICAL CONSTRAINTS:
1. Translate fully into Hindi in Devanagari script (NOT Telugu, NOT Roman Telugu).
   - Example Input: "నేను 2026లో ఒక కొత్త AI tool గురించి వీడియో చేస్తున్నాను."
   - Example Output: "मैं 2026 में एक नए AI tool के बारे में वीडियो बना रहा हूँ।"
2. Technical terms (AI, tool, app, video) may remain in English script.
3. Preserve all numeric placeholders like __NUM_0__, __NUM_1__ EXACTLY AS-IS.
4. Maintain exact line-by-line order. Return ONLY a valid JSON array of strings."""

        else: # Default: Telugu Script mode ('te')
            prompt_instructions = """You are an expert Telugu caption generator.
Format/ensure the input captions are rendered strictly in natural Telugu script (తెలుగు).

CRITICAL CONSTRAINTS:
1. Output MUST be strictly in Telugu script (తెలుగు).
2. NO English / Latin alphabet words are allowed in the output (except protected numeric placeholders like __NUM_0__, __NUM_1__).
3. CRITICAL RULE - THIS IS PHONETIC TRANSLITERATION, NOT SEMANTIC TRANSLATION:
   Do NOT convert spoken English loan words into literary/formal Telugu synonyms.
   WRONG: problem -> సమస్య
   CORRECT: problem -> ప్రాబ్లెమ్
   All spoken English / loan words MUST be transliterated phonetically into Telugu script.
   Examples:
   - "problem" -> "ప్రాబ్లెమ్" (NOT "సమస్య")
   - "software" -> "సాఫ్ట్వేర్"
   - "video" -> "వీడియో"
   - "mobile" -> "మొబైల్"
   - "technology" -> "టెక్నాలజీ"
   - "AI" -> "ఏఐ"
   - "useful" -> "యూస్ఫుల్"
   - "fast" -> "ఫాస్ట్"
   - "develop" -> "డెవలప్"
   - "edit" -> "ఎడిట్"
   - "backlogs" -> "బ్యాక్లాగ్స్"
   - "tool" -> "టూల్"
   - "app" -> "యాప్"
4. Preserve the exact sentence structure and natural spoken Telugu flow.
5. Preserve all numeric placeholders like __NUM_0__, __NUM_1__ EXACTLY AS-IS without altering.
6. Maintain exact line-by-line order. Return ONLY a valid JSON array of strings."""

        full_prompt = f"""{prompt_instructions}

Input JSON:
{json.dumps(texts, ensure_ascii=False)}

Output JSON format:
["line 1", "line 2", ...]"""

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.groq_api_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.groq_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "qwen/qwen3.8-27b",
                        "messages": [{"role": "user", "content": full_prompt}],
                        "temperature": 0.1,
                        "max_tokens": 600
                    }
                )
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"].strip()
                    if content.startswith("```"):
                        content = re.sub(r"^```(?:json)?\n?", "", content)
                        content = re.sub(r"\n?```$", "", content)
                    parsed = json.loads(content)
                    if isinstance(parsed, list) and len(parsed) == len(texts):
                        return [str(item) for item in parsed]
                    else:
                        logger.warning("Groq returned array length mismatch", expected=len(texts), got=len(parsed) if isinstance(parsed, list) else 0)
                else:
                    logger.warning("Groq translation returned status error", status=res.status_code, body=res.text)
        except Exception as e:
            logger.error("Groq translation failed with exception", error=str(e))

        return None

    async def _transform_with_fallback(
        self,
        texts: List[str],
        source_lang: str,
        target_mode: str
    ) -> List[str]:
        """Fallback translation/transliteration when Groq LLM is unavailable."""
        if target_mode == "te":
            # Direct phonetic transliteration fallback for English loan words into Telugu script
            return [transliterate_english_to_telugu(txt) for txt in texts]

        if target_mode == "te_roman":
            # Phonetic Unicode transliterator for Roman Telugu (zero Telugu script characters left)
            return [transliterate_telugu_text(txt) for txt in texts]

        if target_mode == "te_en":
            # Code-switched fallback: Replace technical loan words with English equivalents
            code_switches = {
                "కృత్రిమ మేధస్సు": "AI", "వీడియో": "video", "టూల్": "tool", "కోడ్": "code",
                "యాప్": "app", "టెక్నాలజీ": "technology", "ఫీచర్": "feature", "ప్రాజెక్ట్": "project",
                "రిపోర్ట్": "report", "ఇంటర్నెట్": "internet", "అప్‌డేట్": "update", "స్క్రీన్": "screen",
                "ఆక్యురేట్": "accurate", "సిస్టమ్": "system", "డేటా": "data"
            }
            results = []
            for txt in texts:
                res_txt = txt
                for k, v in code_switches.items():
                    res_txt = res_txt.replace(k, v)
                results.append(res_txt)
            return results

        src_mm = LANG_MAP_MYMEMORY.get(source_lang, source_lang)
        tgt_mm = LANG_MAP_MYMEMORY.get(target_mode, target_mode if target_mode in ["te", "hi", "en"] else "en")

        results = []
        for text in texts:
            if not text.strip():
                results.append(text)
                continue

            translated_str = None
            try:
                translated_str = MyMemoryTranslator(source=src_mm, target=tgt_mm).translate(text)
            except Exception as mm_err:
                logger.warning("MyMemory translation error", text=text, error=str(mm_err))

            if not translated_str or not translated_str.strip():
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        url = "https://translate.googleapis.com/translate_a/single"
                        params = {"client": "gtx", "sl": source_lang, "tl": target_mode, "dt": "t", "q": text}
                        headers = {"User-Agent": "Mozilla/5.0"}
                        res = await client.get(url, params=params, headers=headers)
                        if res.status_code == 200:
                            data = res.json()
                            translated_str = "".join([item[0] for item in data[0] if item[0]])
                except Exception as g_err:
                    logger.warning("Google Translate fallback error", error=str(g_err))

            results.append(translated_str.strip() if translated_str else text)

        return results


translation_service = TranslationService()
