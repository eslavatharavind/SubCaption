import pytest
import sys
sys.stdout.reconfigure(encoding='utf-8')
from app.services.translation.translator import translation_service, transliterate_english_to_telugu

@pytest.mark.asyncio
async def test_telugu_phonetic_transliteration_dictionary():
    cases = [
        ("నేను problem గురించి చెప్తున్నాను", "నేను ప్రాబ్లెమ్ గురించి చెప్తున్నాను"),
        ("ఈ software చాలా useful గా ఉంది", "ఈ సాఫ్ట్వేర్ చాలా యూస్ఫుల్ గా ఉంది"),
        ("ఈ video mobile లో edit చేశాను", "ఈ వీడియో మొబైల్ లో ఎడిట్ చేశాను"),
        ("AI technology చాలా fast గా develop అవుతోంది", "ఏఐ టెక్నాలజీ చాలా ఫాస్ట్ గా డెవలప్ అవుతోంది"),
        ("నాకు 3 backlogs ఉన్నాయి", "నాకు 3 బ్యాక్లాగ్స్ ఉన్నాయి"),
    ]
    for orig, expected in cases:
        masked, tmap = translation_service.mask_numeric_tokens(orig)
        trans = transliterate_english_to_telugu(masked)
        unmasked = translation_service.unmask_numeric_tokens(trans, tmap)
        assert unmasked == expected, f"Failed for '{orig}': got '{unmasked}', expected '{expected}'"

@pytest.mark.asyncio
async def test_numeric_tokens_preserved():
    samples = [
        "నాకు 3 backlogs ఉన్నాయి 2026 లో",
        "నా score 85%",
        "ధర ₹500",
        "ఈ video 4K లో ఉంది"
    ]
    for s in samples:
        masked, tmap = translation_service.mask_numeric_tokens(s)
        trans = transliterate_english_to_telugu(masked)
        unmasked = translation_service.unmask_numeric_tokens(trans, tmap)
        # Check that numeric tokens are preserved
        if "3" in s:
            assert "3" in unmasked
        if "2026" in s:
            assert "2026" in unmasked
        if "85%" in s:
            assert "85%" in unmasked
        if "₹500" in s:
            assert "₹500" in unmasked
        if "4K" in s:
            assert "4K" in unmasked

@pytest.mark.asyncio
async def test_telugu_mode_end_to_end_segments():
    segments = [
        {"text": "నేను problem గురించి చెప్తున్నాను", "start": 0.0, "end": 2.0, "words": [
            {"text": "నేను", "start": 0.0, "end": 0.5},
            {"text": "problem", "start": 0.5, "end": 1.0},
            {"text": "గురించి", "start": 1.0, "end": 1.5},
            {"text": "చెప్తున్నాను", "start": 1.5, "end": 2.0}
        ]},
        {"text": "ఈ software చాలా useful గా ఉంది", "start": 2.0, "end": 4.0, "words": []},
        {"text": "ఈ video mobile లో edit చేశాను", "start": 4.0, "end": 6.0, "words": []},
        {"text": "AI technology చాలా fast గా develop అవుతోంది", "start": 6.0, "end": 8.0, "words": []},
        {"text": "నాకు 3 backlogs ఉన్నాయి", "start": 8.0, "end": 10.0, "words": []}
    ]
    
    transformed = await translation_service.translate_segments(segments, "te", "te")
    assert len(transformed) == len(segments)
    
    # 1. problem -> ప్రాబ్లెమ్ (NOT సమస్య)
    assert "ప్రాబ్లెమ్" in transformed[0]["text"]
    assert "సమస్య" not in transformed[0]["text"]
    assert "problem" not in transformed[0]["text"]
    
    # Word timestamps preserved
    words0 = transformed[0]["words"]
    assert len(words0) == 4
    assert words0[1]["text"] == "ప్రాబ్లెమ్"
    assert words0[1]["start"] == 0.5
    assert words0[1]["end"] == 1.0
    
    # 2. software -> సాఫ్ట్వేర్, useful -> యూస్ఫుల్
    assert "సాఫ్ట్వేర్" in transformed[1]["text"]
    assert "యూస్ఫుల్" in transformed[1]["text"]
    assert "software" not in transformed[1]["text"]
    assert "useful" not in transformed[1]["text"]
    
    # 3. video -> వీడియో, mobile -> మొబైల్, edit -> ఎడిట్
    assert "వీడియో" in transformed[2]["text"]
    assert "మొబైల్" in transformed[2]["text"]
    assert "ఎడిట్" in transformed[2]["text"]
    assert "video" not in transformed[2]["text"]
    assert "mobile" not in transformed[2]["text"]
    assert "edit" not in transformed[2]["text"]
    
    # 4. AI -> ఏఐ, technology -> టెక్నాలజీ, fast -> ఫాస్ట్, develop -> డెవలప్
    assert "ఏఐ" in transformed[3]["text"]
    assert "టెక్నాలజీ" in transformed[3]["text"]
    assert "ఫాస్ట్" in transformed[3]["text"]
    assert "డెవలప్" in transformed[3]["text"]
    assert "technology" not in transformed[3]["text"]
    assert "fast" not in transformed[3]["text"]
    
    # 5. 3 backlogs -> 3 బ్యాక్లాగ్స్
    assert "3" in transformed[4]["text"]
    assert "బ్యాక్లాగ్స్" in transformed[4]["text"]
    assert "backlogs" not in transformed[4]["text"]

@pytest.mark.asyncio
async def test_other_language_modes_untouched():
    # Verify te_roman, te_en, en, hi behave as expected
    test_seg = [{"text": "నాకు 3 backlogs ఉన్నాయి", "start": 0.0, "end": 2.0, "words": []}]
    
    roman = await translation_service.translate_segments(test_seg, "te", "te_roman")
    assert "3" in roman[0]["text"]
    assert "backlogs" in roman[0]["text"].lower()
    
    te_en = await translation_service.translate_segments(test_seg, "te", "te_en")
    assert "3" in te_en[0]["text"]
    assert "backlogs" in te_en[0]["text"]
