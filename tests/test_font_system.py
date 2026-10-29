import os
import json
import pytest

FONT_REGISTRY_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "lib", "fonts", "fontRegistry.ts"))

def load_font_registry_data():
    with open(FONT_REGISTRY_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    json_start = content.find(" = [") + 3
    json_end = content.find("];\n\nexport const FONT_CATEGORY_COUNTS")
    json_str = content[json_start:json_end+1]
    return json.loads(json_str)

def test_exact_300_font_count():
    fonts = load_font_registry_data()
    assert len(fonts) == 300, f"Expected exactly 300 fonts, found {len(fonts)}"

def test_exact_category_distribution():
    fonts = load_font_registry_data()
    expected_distribution = {
        'Sans Serif': 35,
        'Bold / Heavy': 25,
        'Serif': 25,
        'Display': 25,
        'Script': 20,
        'Handwritten': 20,
        'Monospace': 15,
        'Condensed': 20,
        'Rounded': 15,
        'Retro': 15,
        'Futuristic': 15,
        'Pixel': 10,
        'Telugu': 35,
        'Hindi': 25,
    }
    
    actual_counts = {}
    for f in fonts:
        cat = f['category']
        actual_counts[cat] = actual_counts.get(cat, 0) + 1
        
    assert actual_counts == expected_distribution, f"Category count mismatch: {actual_counts}"

def test_font_metadata_fields():
    fonts = load_font_registry_data()
    required_fields = [
        "id", "name", "family", "category", "subcategory", 
        "fontFile", "supportedScripts", "supportedLanguages", 
        "weights", "styles", "license", "licenseUrl", "tags", 
        "previewText", "isMultilingual", "isDefaultCompatible"
    ]
    
    for f in fonts:
        for field in required_fields:
            assert field in f, f"Font {f.get('name')} missing field {field}"
        assert len(f["weights"]) > 0, f"Font {f['name']} must have at least one weight"
        assert len(f["supportedScripts"]) > 0, f"Font {f['name']} must support at least one script"

def test_telugu_fonts_script_support():
    fonts = load_font_registry_data()
    telugu_fonts = [f for f in fonts if f['category'] == 'Telugu']
    assert len(telugu_fonts) == 35
    for tf in telugu_fonts:
        assert "Telugu" in tf["supportedScripts"], f"Telugu category font {tf['name']} missing Telugu script"
        assert "te" in tf["supportedLanguages"], f"Telugu category font {tf['name']} missing te language"

def test_hindi_fonts_script_support():
    fonts = load_font_registry_data()
    hindi_fonts = [f for f in fonts if f['category'] == 'Hindi']
    assert len(hindi_fonts) == 25
    for hf in hindi_fonts:
        assert "Devanagari" in hf["supportedScripts"], f"Hindi category font {hf['name']} missing Devanagari script"
        assert "hi" in hf["supportedLanguages"], f"Hindi category font {hf['name']} missing hi language"

def test_word_font_override_ass_export():
    from app.services.video.ffmpeg import ffmpeg_service
    
    sample_segments = [
        {
            "start": 0.0,
            "end": 2.5,
            "text": "This AI tool is amazing",
            "style_data": {"font": "Inter", "fontSize": 48},
            "words": [
                {"text": "This", "start": 0.0, "end": 0.5},
                {"text": "AI", "start": 0.5, "end": 1.0, "fontFamily": "Anton"},
                {"text": "tool", "start": 1.0, "end": 1.5},
                {"text": "is", "start": 1.5, "end": 2.0},
                {"text": "amazing", "start": 2.0, "end": 2.5}
            ]
        }
    ]
    
    ass_path = ffmpeg_service.generate_ass_subtitle_file("test_font_proj", sample_segments)
    assert os.path.exists(ass_path)
    
    with open(ass_path, "r", encoding="utf-8") as f:
        ass_content = f.read()
        
    assert "{\\fnAnton}AI" in ass_content, "ASS output should contain inline font tag for word override"
    if os.path.exists(ass_path):
        os.remove(ass_path)
