import pytest
from app.services.translation.translator import translation_service

@pytest.mark.asyncio
async def test_numeric_token_masking():
    text = "Naku 3 backlogs 4th year lo 2026 lo 85% score ₹500 10:30 meeting version 5.0 1080p 60fps"
    masked, token_map = translation_service.mask_numeric_tokens(text)
    
    assert len(token_map) > 0
    assert "3" in token_map.values()
    assert "4th" in token_map.values()
    assert "2026" in token_map.values()
    assert "85%" in token_map.values()
    assert "₹500" in token_map.values()
    assert "10:30" in token_map.values()
    assert "5.0" in token_map.values()
    
    unmasked = translation_service.unmask_numeric_tokens(masked, token_map)
    assert unmasked == text

@pytest.mark.asyncio
async def test_fallback_roman_telugu_preserves_numbers():
    segments = [
        {"text": "నాకు మూడు బ్యాక్లాగ్స్ ఉన్నాయి", "start": 0.0, "end": 1.5, "words": []},
        {"text": "నేను నాలుగో ఇయర్లో ఉన్నాను", "start": 1.5, "end": 3.0, "words": []},
        {"text": "2026 లో కొత్త AI tool వచ్చింది", "start": 3.0, "end": 4.5, "words": []},
        {"text": "నా score 85%", "start": 4.5, "end": 6.0, "words": []},
        {"text": "AI version 5.0", "start": 6.0, "end": 7.5, "words": []},
        {"text": "₹500", "start": 7.5, "end": 9.0, "words": []},
        {"text": "10:30 కి meeting ఉంది", "start": 9.0, "end": 10.5, "words": []}
    ]
    
    res = await translation_service.translate_segments(segments, "te", "te_roman")
    
    assert len(res) == 7
    # 1. 3 backlogs
    assert "3" in res[0]["text"]
    assert "backlogs" in res[0]["text"].lower()
    # 2. 4th year
    assert "4th" in res[1]["text"]
    assert "year" in res[1]["text"].lower()
    # 3. 2026
    assert "2026" in res[2]["text"]
    # 4. 85%
    assert "85%" in res[3]["text"]
    # 5. 5.0
    assert "5.0" in res[4]["text"]
    # 6. ₹500
    assert "₹500" in res[5]["text"]
    # 7. 10:30
    assert "10:30" in res[6]["text"]

@pytest.mark.asyncio
async def test_language_code_normalization():
    assert translation_service.normalize_language_code("te") == "te"
    assert translation_service.normalize_language_code("Telugu") == "te"
    assert translation_service.normalize_language_code("te_en") == "te_en"
    assert translation_service.normalize_language_code("Telugu + English") == "te_en"
    assert translation_service.normalize_language_code("en") == "en"
    assert translation_service.normalize_language_code("hi") == "hi"
    assert translation_service.normalize_language_code("te_roman") == "te_roman"
    assert translation_service.normalize_language_code("Telugu English Letters") == "te_roman"
