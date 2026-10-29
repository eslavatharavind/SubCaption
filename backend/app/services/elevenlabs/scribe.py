import httpx
import os
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

LANGUAGE_MAP = {
    "en": "eng",
    "hi": "hin",
    "te": "tel"
}


class ElevenLabsScribeService:
    """ElevenLabs Scribe API integration for speech-to-text with word-level timestamps"""

    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.api_url = settings.ELEVENLABS_API_URL
        self.headers = {
            "xi-api-key": self.api_key
        }

    async def transcribe_audio(
        self,
        audio_file_path: str,
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio file using ElevenLabs Scribe API.
        NO mock/fallback transcripts allowed.

        Args:
            audio_file_path: Path to audio file
            language: Optional language code hint or None for auto-detection

        Returns:
            Transcription result with real word-level timestamps and detected language code
        """

        logger.info("Starting transcription via ElevenLabs Scribe", audio_file=audio_file_path, language_hint=language)

        if not self.api_key or self.api_key in ["your-elevenlabs-api-key", "placeholder", ""]:
            logger.error("ElevenLabs API key is missing or invalid placeholder")
            return {
                'success': False,
                'error': "Transcription failed. Please check your ElevenLabs API configuration."
            }

        if not os.path.exists(audio_file_path):
            logger.error("Audio file does not exist", path=audio_file_path)
            return {
                'success': False,
                'error': "Audio file not found for transcription."
            }

        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                with open(audio_file_path, 'rb') as audio_file:
                    files = {
                        'file': (os.path.basename(audio_file_path), audio_file, 'audio/mpeg')
                    }

                    data = {
                        'model_id': 'scribe_v1',
                        'tag_audio_events': False,
                        'num_speakers': 1,
                        'timestamps_granularity': 'word'
                    }

                    if language:
                        lang_code = LANGUAGE_MAP.get(language, language)
                        data['language_code'] = lang_code

                    response = await client.post(
                        f"{self.api_url}/speech-to-text",
                        headers=self.headers,
                        files=files,
                        data=data
                    )

                    if response.status_code == 200:
                        result = response.json()
                        detected_lang_code = result.get('language_code') or language or 'en'
                        logger.info("ElevenLabs transcription completed successfully", language_code=detected_lang_code)

                        raw_words = result.get('words', [])
                        words = []
                        for w in raw_words:
                            w_type = w.get('type', 'word')
                            w_text = w.get('text', '').strip()
                            if w_text and w_type != 'audio_event':
                                words.append({
                                    'text': w_text,
                                    'start': round(float(w.get('start', 0.0)), 2),
                                    'end': round(float(w.get('end', 0.0)), 2)
                                })

                        return {
                            'success': True,
                            'text': result.get('text', ''),
                            'words': words,
                            'language': detected_lang_code,
                            'language_code': detected_lang_code,
                            'audio_duration_secs': float(result.get('audio_duration_secs', 0.0))
                        }
                    else:
                        logger.error("ElevenLabs API call returned non-200", status=response.status_code, body=response.text)
                        return {
                            'success': False,
                            'error': f"Transcription failed. Please check your ElevenLabs API configuration. (API Error {response.status_code})"
                        }

        except Exception as e:
            logger.error("ElevenLabs API call failed with exception", error=str(e))
            return {
                'success': False,
                'error': f"Transcription failed. Please check your ElevenLabs API configuration. ({str(e)})"
            }


scribe_service = ElevenLabsScribeService()

