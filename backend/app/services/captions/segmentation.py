import re
from typing import List, Dict, Any
from app.utils.logging import get_logger

logger = get_logger(__name__)


class CaptionSegmentationService:
    """Language-aware caption segmentation with word-level timing for short-form video"""

    def __init__(self):
        self.max_words_per_segment = 3
        self.max_characters_per_segment = 20
        self.min_segment_duration = 0.4
        self.max_segment_duration = 1.8
        self.min_pause_gap = 0.35

    def segment_transcript(
        self,
        words: List[Dict[str, Any]],
        language: str = "en"
    ) -> List[Dict[str, Any]]:
        """
        Segment transcription into short, readable caption segments based on word timing

        Args:
            words: List of words with timing information
            language: Language code for language-aware segmentation

        Returns:
            List of caption segments with word-level timing preserved
        """

        logger.info("Segmenting transcript", word_count=len(words), language=language)

        if not words:
            return []

        segments = []
        word_buffer = []

        for i, word_data in enumerate(words):
            word_text = str(word_data.get('text', '')).strip()
            if not word_text:
                continue

            word_start = float(word_data.get('start', 0.0))
            word_end = float(word_data.get('end', 0.0))

            word_obj = {
                'text': word_text,
                'start': word_start,
                'end': word_end
            }

            # Check for speech pause gap between previous word end and current word start
            if word_buffer:
                prev_end = word_buffer[-1]['end']
                if (word_start - prev_end) >= self.min_pause_gap:
                    self._flush_buffer(segments, word_buffer)
                    word_buffer = []

            word_buffer.append(word_obj)
            char_count = sum(len(w['text']) for w in word_buffer)

            # Determine if we should split at current word
            should_split = self._should_split_segment(
                word_buffer,
                word_obj,
                i,
                len(words),
                char_count,
                language
            )

            if should_split:
                self._flush_buffer(segments, word_buffer)
                word_buffer = []

        if word_buffer:
            self._flush_buffer(segments, word_buffer)

        logger.info("Segmentation completed", segment_count=len(segments))
        return segments

    def _flush_buffer(self, segments: List[Dict[str, Any]], buffer: List[Dict[str, Any]]):
        if not buffer:
            return
        segment_text = ' '.join([w['text'] for w in buffer])
        segments.append({
            'text': segment_text,
            'words': list(buffer),
            'start': round(buffer[0]['start'], 2),
            'end': round(buffer[-1]['end'], 2)
        })

    def _should_split_segment(
        self,
        word_buffer: List[Dict[str, Any]],
        current_word: Dict[str, Any],
        word_index: int,
        total_words: int,
        char_count: int,
        language: str
    ) -> bool:
        """
        Determine whether to split at current word based on punctuation, max words, char count, and timing
        """
        word_text = current_word.get('text', '')

        # 1. Punctuation boundary (periods, commas, question marks, exclamations, dandas, colons, dashes)
        if any(word_text.endswith(p) for p in ('.', '!', '?', '।', ',', ';', ':', '—', '-')):
            return True

        # 2. Word count limit (max 3 words for short-form captions)
        if len(word_buffer) >= self.max_words_per_segment:
            return True

        # 3. Character count limit (max 20 characters per segment)
        if char_count >= self.max_characters_per_segment:
            return True

        # 4. Segment duration limit (max 1.8 seconds per segment)
        if word_buffer:
            segment_duration = word_buffer[-1]['end'] - word_buffer[0]['start']
            if segment_duration >= self.max_segment_duration:
                return True

        return False


segmentation_service = CaptionSegmentationService()

