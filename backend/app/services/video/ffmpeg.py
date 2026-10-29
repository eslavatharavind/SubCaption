import ffmpeg
import imageio_ffmpeg
import os
import shutil
from pathlib import Path
import subprocess
from typing import Dict, Any, List, Optional, Callable
from app.utils.logging import get_logger
from app.core.config import settings
from app.services.video.font_downloader import ensure_fonts_available, get_fonts_dir

logger = get_logger(__name__)


def format_ass_time(seconds: float) -> str:
    """Format seconds float into ASS timestamp H:MM:SS.cs"""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centisecs = int(round((seconds - int(seconds)) * 100))
    if centisecs >= 100:
        centisecs = 99
    return f"{hrs}:{mins:02d}:{secs:02d}.{centisecs:02d}"


class FFmpegService:
    """FFmpeg-based video processing & subtitle rendering service"""

    def __init__(self):
        ffmpeg_bin = settings.FFMPEG_PATH
        if not shutil.which(ffmpeg_bin):
            try:
                ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
            except Exception:
                ffmpeg_bin = "ffmpeg"
        self.ffmpeg_path = ffmpeg_bin
        self.temp_dir = os.path.abspath(settings.TEMP_DIR)
        self.render_dir = os.path.abspath(settings.REMOTION_RENDER_DIR)

    def ensure_dirs(self):
        """Ensure temporary and render directories exist"""
        os.makedirs(self.temp_dir, exist_ok=True)
        os.makedirs(self.render_dir, exist_ok=True)

    async def extract_audio(
        self,
        video_path: str,
        output_audio_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract audio from video file using FFmpeg"""

        logger.info("Extracting audio from video", video_path=video_path)

        try:
            self.ensure_dirs()
            if not output_audio_path:
                base_name = os.path.splitext(os.path.basename(video_path))[0]
                output_audio_path = os.path.join(self.temp_dir, f"{base_name}.mp3")

            cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", video_path,
                "-vn",
                "-acodec", "libmp3lame",
                "-ac", "1",
                "-ar", "44100",
                output_audio_path
            ]
            res = subprocess.run(cmd, capture_output=True, text=True)

            if res.returncode != 0:
                logger.error("FFmpeg error during audio extraction", error=res.stderr)
                return {
                    'success': False,
                    'error': res.stderr
                }

            logger.info("Audio extraction completed", output_path=output_audio_path)

            return {
                'success': True,
                'audio_path': output_audio_path
            }

        except Exception as e:
            logger.error("Audio extraction failed", error=str(e))
            return {
                'success': False,
                'error': str(e)
            }

    async def get_video_metadata(self, video_path: str) -> Dict[str, Any]:
        """Get video metadata including duration"""

        logger.info("Getting video metadata", video_path=video_path)

        try:
            cmd = [self.ffmpeg_path, "-i", video_path]
            res = subprocess.run(cmd, capture_output=True, text=True)
            stderr = res.stderr or ""

            duration = 0.0
            width = 1080
            height = 1920
            has_audio = False
            audio_is_aac = False
            import re
            for line in stderr.splitlines():
                if "Duration:" in line:
                    try:
                        parts = line.split("Duration:")[1].split(",")[0].strip()
                        h, m, s = parts.split(":")
                        duration = float(h) * 3600 + float(m) * 60 + float(s)
                    except Exception:
                        pass
                if "Stream #" in line and "Video:" in line:
                    m = re.search(r' (\d{2,5})x(\d{2,5})', line)
                    if m:
                        try:
                            width = int(m.group(1))
                            height = int(m.group(2))
                        except Exception:
                            pass
                if "Stream #" in line and "Audio:" in line:
                    has_audio = True
                    if "aac" in line.lower():
                        audio_is_aac = True

            logger.info("Video metadata retrieved", duration=duration, width=width, height=height, has_audio=has_audio, audio_is_aac=audio_is_aac)

            return {
                'success': True,
                'duration': duration,
                'width': width,
                'height': height,
                'has_audio': has_audio,
                'audio_is_aac': audio_is_aac
            }

        except Exception as e:
            logger.error("Metadata extraction failed", error=str(e))
            return {
                'success': False,
                'error': str(e)
            }

    def generate_ass_subtitle_file(
        self,
        project_id: str,
        segments: List[Dict[str, Any]],
        play_res_x: int = 1080,
        play_res_y: int = 1920,
        text_layers: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """Generate ASS format subtitle file with dynamic styling, animations, and layers from segment data"""

        self.ensure_dirs()
        ass_path = os.path.join(self.temp_dir, f"{project_id}_captions.ass")

        def hex_to_ass_color(hex_str: Optional[str], default: str = "&H00FFFFFF", opacity_pct: Optional[float] = None) -> str:
            if not hex_str:
                col_body = default.replace("&H", "").replace("&h", "")
                if len(col_body) == 8:
                    hex_str = "#" + col_body[2:8]
                else:
                    return default
            clean = hex_str.lstrip("#").strip()
            alpha_hex = "00"
            if opacity_pct is not None:
                op = max(0.0, min(100.0, float(opacity_pct)))
                alpha_val = int((1.0 - (op / 100.0)) * 255)
                alpha_hex = f"{alpha_val:02X}"
            elif len(clean) == 8:
                alpha_hex = clean[0:2].upper()
                clean = clean[2:8]

            if len(clean) == 3:
                clean = "".join([c + c for c in clean])

            if len(clean) == 6:
                r, g, b = clean[0:2], clean[2:4], clean[4:6]
                return f"&H{alpha_hex}{b.upper()}{g.upper()}{r.upper()}"
            return default

        alignment_map = {
            'bottom-left': 1, 'bottom-center': 2, 'bottom-right': 3,
            'middle-left': 4, 'center-left': 4, 'center': 5, 'middle-right': 6, 'center-right': 6,
            'top-left': 7, 'top-center': 8, 'top-right': 9,
        }

        def get_ass_align(anchor_x: str, anchor_y: str) -> int:
            if anchor_y == 'top':
                if anchor_x == 'left': return 7
                if anchor_x == 'right': return 9
                return 8
            if anchor_y == 'center':
                if anchor_x == 'left': return 4
                if anchor_x == 'right': return 6
                return 5
            # bottom
            if anchor_x == 'left': return 1
            if anchor_x == 'right': return 3
            return 2

        def get_pos_coords(pos_dict: Dict[str, Any], default_x: float = 0.50, default_y: float = 0.88):
            raw_x = pos_dict.get('x')
            raw_y = pos_dict.get('y')
            if raw_x is None or raw_y is None:
                preset = pos_dict.get('position') or pos_dict.get('preset')
                preset_map = {
                    'top-left': (0.08, 0.10, 'left', 'top'),
                    'top-center': (0.50, 0.10, 'center', 'top'),
                    'top-right': (0.92, 0.10, 'right', 'top'),
                    'center-left': (0.08, 0.50, 'left', 'center'),
                    'middle-left': (0.08, 0.50, 'left', 'center'),
                    'center': (0.50, 0.50, 'center', 'center'),
                    'center-right': (0.92, 0.50, 'right', 'center'),
                    'middle-right': (0.92, 0.50, 'right', 'center'),
                    'bottom-left': (0.08, 0.88, 'left', 'bottom'),
                    'bottom-center': (0.50, 0.88, 'center', 'bottom'),
                    'bottom-right': (0.92, 0.88, 'right', 'bottom'),
                }
                coords = preset_map.get(preset)
                if coords:
                    raw_x, raw_y, ax, ay = coords
                else:
                    raw_x, raw_y = default_x, default_y
                    ax, ay = 'center', 'bottom'
            else:
                raw_x = float(raw_x)
                raw_y = float(raw_y)
                ax = pos_dict.get('anchorX') or ('left' if raw_x < 0.35 else ('right' if raw_x > 0.65 else 'center'))
                ay = pos_dict.get('anchorY') or ('top' if raw_y < 0.35 else ('bottom' if raw_y > 0.65 else 'center'))

            align_code = get_ass_align(ax, ay)
            ass_x = int(float(raw_x) * play_res_x)
            ass_y = int(float(raw_y) * play_res_y)
            return ass_x, ass_y, align_code

        def build_pos_and_anim_tags(pos_dict: Dict[str, Any], anim_dict: Dict[str, Any], seg_dur: float) -> str:
            ass_x, ass_y, align_code = get_pos_coords(pos_dict)
            anim_type = anim_dict.get('entrance') or anim_dict.get('type') or 'none'
            exit_type = anim_dict.get('exit') or 'none'
            dur_ms = int(float(anim_dict.get('duration', 0.35)) * 1000)
            exit_ms = int(min(400, seg_dur * 300))

            move_tag = None
            if anim_type == 'fade-up':
                move_tag = f"\\move({ass_x},{ass_y + 35},{ass_x},{ass_y},0,{dur_ms})"
            elif anim_type == 'fade-down':
                move_tag = f"\\move({ass_x},{ass_y - 35},{ass_x},{ass_y},0,{dur_ms})"
            elif anim_type in ('fade-left', 'slide-left'):
                move_tag = f"\\move({ass_x - 45},{ass_y},{ass_x},{ass_y},0,{dur_ms})"
            elif anim_type in ('fade-right', 'slide-right'):
                move_tag = f"\\move({ass_x + 45},{ass_y},{ass_x},{ass_y},0,{dur_ms})"
            elif anim_type == 'slide-up':
                move_tag = f"\\move({ass_x},{ass_y + 60},{ass_x},{ass_y},0,{dur_ms})"
            elif anim_type == 'slide-down':
                move_tag = f"\\move({ass_x},{ass_y - 60},{ass_x},{ass_y},0,{dur_ms})"

            pos_part = move_tag if move_tag else f"\\pos({ass_x},{ass_y})"
            tags = [f"\\an{align_code}", pos_part]

            # Fades
            if anim_type in ('fade', 'fade-in', 'fade-up', 'fade-down', 'fade-left', 'fade-right'):
                fade_out = exit_ms if exit_type in ('fade-out', 'fade') else 0
                tags.append(f"\\fad({dur_ms},{fade_out})")
            elif exit_type in ('fade-out', 'fade'):
                tags.append(f"\\fad(0,{exit_ms})")

            # Scale/Pop
            if anim_type in ('pop', 'bounce'):
                tags.append(f"\\fscx60\\fscy60\\t(0,{dur_ms},\\fscx100\\fscy100)")
            elif anim_type in ('scale', 'scale-in', 'zoom-in'):
                tags.append(f"\\fscx70\\fscy70\\t(0,{dur_ms},\\fscx100\\fscy100)")

            return "{" + "".join(tags) + "}"

        # Collect all font families used so we can download them before rendering
        all_font_names: List[str] = []

        # Build ASS file header & styles
        # ScaledBorderAndShadow: yes ensures outline/shadow scale correctly with resolution
        header_lines = [
            "[Script Info]\n",
            "Title: Project Captions\n",
            "ScriptType: v4.00+\n",
            f"PlayResX: {play_res_x}\n",
            f"PlayResY: {play_res_y}\n",
            "ScaledBorderAndShadow: yes\n",
            "YCbCr Matrix: None\n\n",
            "[V4+ Styles]\n",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
            "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
            "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        ]

        events_lines = ["\n[Events]\n", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"]

        # Resolution scaling factor for fonts (standardized on 720p base)
        scale_factor = play_res_y / 720.0 if play_res_y > 0 else 1.0

        for idx, seg in enumerate(segments):
            style_data = seg.get('style_data', {})
            pos_data = seg.get('position_data', {})
            anim_data = seg.get('animation_data', {})

            font_name = style_data.get('font', 'Inter')
            raw_fs = float(style_data.get('fontSize', 48))
            font_size = max(16, int(raw_fs * scale_factor)) if raw_fs < 120 else int(raw_fs)

            text_opacity = style_data.get('textOpacity', 100)
            primary_col = hex_to_ass_color(style_data.get('textColor', '#FFFFFF'), opacity_pct=text_opacity)

            stroke_enabled = style_data.get('strokeEnabled', True if style_data.get('strokeWidth', 0) > 0 else False)
            stroke_opacity = style_data.get('strokeOpacity', 100)
            outline_col = hex_to_ass_color(style_data.get('strokeColor', '#000000'), opacity_pct=stroke_opacity)
            outline_w = int(max(1, style_data.get('strokeWidth', 2) * (scale_factor * 0.75))) if stroke_enabled else 0

            shadow_enabled = style_data.get('shadowEnabled', style_data.get('shadow', False))
            shadow_opacity = style_data.get('shadowOpacity', 75)

            container_type = style_data.get('containerType', 'none')
            bg_col_hex = style_data.get('backgroundColor') or style_data.get('background')
            has_bg_box = container_type in ('solid', 'strip', 'pill', 'rounded') or (bg_col_hex and bg_col_hex not in ('transparent', 'none'))
            border_style = 3 if has_bg_box else 1

            back_col_hex = bg_col_hex or '#000000'
            back_col = hex_to_ass_color(back_col_hex, opacity_pct=style_data.get('backgroundOpacity', 85) if has_bg_box else (shadow_opacity if shadow_enabled else 0))
            shadow_w = int(max(1, style_data.get('shadowDistance', 4) * (scale_factor * 0.75))) if shadow_enabled else 0

            font_weight = int(style_data.get('fontWeight', 700))
            # ASS Bold field: -1 = bold (from font), 0 = not bold, 1 = bold
            # Numeric font weights (100-900) are NOT valid ASS Bold values.
            # Map: weight >= 600 -> bold (1), else not bold (0)
            bold_val = 1 if font_weight >= 600 else 0
            italic_val = 1 if style_data.get('italic', False) else 0
            underline_val = 1 if style_data.get('underline', False) else 0

            scale_val = int(style_data.get('scale', 100))
            angle_val = int(style_data.get('rotation', 0))
            spacing_val = int(style_data.get('letterSpacing', 0))

            base_pos = pos_data.get('position', 'bottom-center')
            base_align = alignment_map.get(base_pos, 2)
            text_align_mode = style_data.get('alignment', 'center')

            align_val = base_align
            if 'bottom' in base_pos:
                align_val = 1 if text_align_mode == 'left' else (3 if text_align_mode == 'right' else 2)
            elif 'top' in base_pos:
                align_val = 7 if text_align_mode == 'left' else (9 if text_align_mode == 'right' else 8)
            elif 'middle' in base_pos or 'center' in base_pos:
                align_val = 4 if text_align_mode == 'left' else (6 if text_align_mode == 'right' else 5)

            max_w_pct = float(style_data.get('maxWidth', 90))
            margin_lr = max(20, int((play_res_x - (play_res_x * (max_w_pct / 100.0))) / 2))

            # Track font for download
            if font_name and font_name not in all_font_names:
                all_font_names.append(font_name)

            style_name = f"Style_{idx}"
            style_line = f"Style: {style_name},{font_name},{font_size},{primary_col},&H0000D6FF,{outline_col},{back_col},{bold_val},{italic_val},{underline_val},0,{scale_val},{scale_val},{spacing_val},{angle_val},{border_style},{outline_w},{shadow_w},{align_val},{margin_lr},{margin_lr},160,1\n"
            header_lines.append(style_line)

            seg_start = seg.get('start', 0.0)
            seg_end = seg.get('end', 0.0)
            seg_dur = max(0.1, seg_end - seg_start)
            text = seg.get('text', '')
            words = seg.get('words', [])

            highlight_data = seg.get('highlight_data', {})
            mode = highlight_data.get('mode', 'active-word')
            hl_color = highlight_data.get('color') or style_data.get('highlightColor') or '#FFD600'
            targets = highlight_data.get('targets', [])
            target_map = {t.get('wordIndex'): t for t in targets if t.get('wordIndex') is not None}

            casing_mode = style_data.get('textCasing', 'normal')

            def apply_casing(t: str) -> str:
                if not t or casing_mode == 'normal' or casing_mode == 'none':
                    return t
                if casing_mode == 'uppercase':
                    return t.upper()
                if casing_mode == 'lowercase':
                    return t.lower()
                if casing_mode == 'capitalize':
                    return t.title()
                return t

            base_pos_and_anim = build_pos_and_anim_tags(pos_data, anim_data, seg_dur)

            if words and mode in ('active-word', 'karaoke') and len(words) > 0:
                for active_i, active_w in enumerate(words):
                    w_start = active_w.get('start', seg_start)
                    w_end = active_w.get('end', seg_end)
                    sub_start_str = format_ass_time(w_start)
                    sub_end_str = format_ass_time(w_end)

                    base_formatted_words = []
                    overridden_events = []

                    for w_idx, w in enumerate(words):
                        w_text = apply_casing(w.get('text', ''))
                        target = target_map.get(w_idx, {})
                        ov = target.get('styleOverrides', {})

                        is_active = (w_idx == active_i)
                        is_target = target is not None and len(target) > 0

                        w_font = ov.get('fontFamily') or w.get('fontFamily') or w.get('font')
                        w_font_size = ov.get('fontSize') or w.get('fontSize')
                        w_col = ov.get('textColor')
                        if not w_col and (is_active or is_target):
                            w_col = hl_color

                        ass_tags = []
                        if w_font and w_font != font_name:
                            ass_tags.append(f"\\fn{w_font}")
                        if w_font_size:
                            scaled_w_fs = int(w_font_size * scale_factor) if w_font_size < 120 else int(w_font_size)
                            ass_tags.append(f"\\fs{scaled_w_fs}")
                        if w_col:
                            ass_col = hex_to_ass_color(w_col)
                            ass_tags.append(f"\\c{ass_col}")
                        if ov.get('fontWeight'):
                            ass_tags.append(f"\\b{ov.get('fontWeight')}")
                        if ov.get('italic'):
                            ass_tags.append("\\i1")
                        if ov.get('underline'):
                            ass_tags.append("\\u1")
                        sc = ov.get('scale') or (int(highlight_data.get('scale', 120)) if is_active else 100)
                        if sc and sc != 100:
                            ass_tags.append(f"\\fscx{sc}\\fscy{sc}")

                        word_rendered = f"{{{(''.join(ass_tags))}}}{w_text}{{\\r{style_name}}}" if ass_tags else w_text

                        w_pos = w.get('position_data')
                        if w_pos and (w_pos.get('custom') or w_pos.get('x') is not None):
                            w_tag = build_pos_and_anim_tags(w_pos, anim_data, seg_dur)
                            overridden_events.append(f"{w_tag}{word_rendered}")
                        else:
                            base_formatted_words.append(word_rendered)

                    if base_formatted_words:
                        sub_text = base_pos_and_anim + " ".join(base_formatted_words)
                        events_lines.append(f"Dialogue: 0,{sub_start_str},{sub_end_str},{style_name},,0,0,0,,{sub_text}\n")
                    for ov_txt in overridden_events:
                        events_lines.append(f"Dialogue: 0,{sub_start_str},{sub_end_str},{style_name},,0,0,0,,{ov_txt}\n")

            elif words:
                start_str = format_ass_time(seg_start)
                end_str = format_ass_time(seg_end)
                base_formatted_words = []
                overridden_events = []

                for w_idx, w in enumerate(words):
                    w_text = apply_casing(w.get('text', ''))
                    target = target_map.get(w_idx, {})
                    ov = target.get('styleOverrides', {})

                    w_font = ov.get('fontFamily') or w.get('fontFamily') or w.get('font')
                    w_font_size = ov.get('fontSize') or w.get('fontSize')
                    w_col = ov.get('textColor') or w.get('color') or (hl_color if target else None)

                    ass_tags = []
                    if w_font and w_font != font_name:
                        ass_tags.append(f"\\fn{w_font}")
                    if w_font_size:
                        scaled_w_fs = int(w_font_size * scale_factor) if w_font_size < 120 else int(w_font_size)
                        ass_tags.append(f"\\fs{scaled_w_fs}")
                    if w_col:
                        ass_col = hex_to_ass_color(w_col)
                        ass_tags.append(f"\\c{ass_col}")
                    if ov.get('fontWeight'):
                        ass_tags.append(f"\\b{ov.get('fontWeight')}")
                    if ov.get('italic'):
                        ass_tags.append("\\i1")
                    if ov.get('underline'):
                        ass_tags.append("\\u1")
                    if ov.get('scale'):
                        sc = int(ov.get('scale', 100))
                        ass_tags.append(f"\\fscx{sc}\\fscy{sc}")

                    word_rendered = f"{{{(''.join(ass_tags))}}}{w_text}{{\\r{style_name}}}" if ass_tags else w_text

                    w_pos = w.get('position_data')
                    if w_pos and (w_pos.get('custom') or w_pos.get('x') is not None):
                        w_tag = build_pos_and_anim_tags(w_pos, anim_data, seg_dur)
                        overridden_events.append(f"{w_tag}{word_rendered}")
                    else:
                        base_formatted_words.append(word_rendered)

                if base_formatted_words:
                    text_out = base_pos_and_anim + " ".join(base_formatted_words)
                    events_lines.append(f"Dialogue: 0,{start_str},{end_str},{style_name},,0,0,0,,{text_out}\n")
                for ov_txt in overridden_events:
                    events_lines.append(f"Dialogue: 0,{start_str},{end_str},{style_name},,0,0,0,,{ov_txt}\n")

            elif text:
                start_str = format_ass_time(seg_start)
                end_str = format_ass_time(seg_end)
                events_lines.append(f"Dialogue: 0,{start_str},{end_str},{style_name},,0,0,0,,{base_pos_and_anim}{apply_casing(text)}\n")

        # 3. Process Independent Text Layers (Ordered by zIndex)
        if text_layers and len(text_layers) > 0:
            sorted_layers = sorted(text_layers, key=lambda l: l.get('zIndex', 1))
            for l_idx, layer in enumerate(sorted_layers):
                if layer.get('visible') is False:
                    continue
                l_text = layer.get('text', '')
                if not l_text:
                    continue

                l_style = layer.get('style_data') or {}
                l_pos = layer.get('position_data') or {}
                l_anim = layer.get('animation_data') or {}
                l_zindex = int(layer.get('zIndex', l_idx + 1))

                l_font = l_style.get('font', 'Inter')
                raw_l_fs = float(l_style.get('fontSize', 52))
                l_font_size = max(16, int(raw_l_fs * scale_factor)) if raw_l_fs < 120 else int(raw_l_fs)
                l_pri_col = hex_to_ass_color(l_style.get('textColor', '#FFFFFF'))
                l_out_col = hex_to_ass_color(l_style.get('strokeColor', '#000000'))
                l_out_w = int(max(1, l_style.get('strokeWidth', 2) * (scale_factor * 0.75))) if l_style.get('strokeEnabled', True) else 0

                # Track font for download
                if l_font and l_font not in all_font_names:
                    all_font_names.append(l_font)

                l_style_name = f"LayerStyle_{l_idx}_{layer.get('id', 'l')}"
                # Use bold=1 (not numeric weight) for layer styles
                l_style_line = f"Style: {l_style_name},{l_font},{l_font_size},{l_pri_col},&H0000D6FF,{l_out_col},&H80000000,1,0,0,0,100,100,0,0,1,{l_out_w},2,5,20,20,160,1\n"
                header_lines.append(l_style_line)

                l_start = float(layer.get('startTime', 0.0))
                l_end = float(layer.get('endTime', 3600.0)) # Default to end of video
                l_dur = max(0.1, l_end - l_start)

                l_tags = build_pos_and_anim_tags(l_pos, l_anim, l_dur)
                events_lines.append(f"Dialogue: {l_zindex},{format_ass_time(l_start)},{format_ass_time(l_end)},{l_style_name},,0,0,0,,{l_tags}{l_text}\n")

        # Write ASS file with UTF-8 encoding (BOM helps some libass versions on Windows)
        with open(ass_path, "w", encoding="utf-8-sig") as f:
            f.writelines(header_lines + events_lines)

        # Store the collected font names on the instance so render_burned_captions can use them
        self._last_used_fonts = all_font_names

        return ass_path

    async def render_exact_preview_captions(
        self,
        input_video_path: str,
        output_video_path: str,
        segments: List[Dict[str, Any]],
        template_config: Dict[str, Any],
        text_layers: List[Dict[str, Any]],
        aspect_ratio: str,
        export_id: str,
        node_script: str,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> Dict[str, Any]:
        """Render captions frame-by-frame using the exact preview engine via Node.js + Playwright"""
        self.ensure_dirs()
        job_file = os.path.join(self.temp_dir, f"{export_id}_job.json")
        try:
            job_data = {
                "segments": segments,
                "templateConfig": template_config,
                "textLayers": text_layers,
                "aspectRatio": aspect_ratio,
            }
            with open(job_file, "w", encoding="utf-8") as jf:
                import json
                json.dump(job_data, jf)

            if progress_callback:
                progress_callback(12.0, "Launching preview render engine...")

            frontend_port = "3000"
            try:
                from urllib.parse import urlparse
                parsed = urlparse(settings.FRONTEND_URL)
                if parsed.port:
                    frontend_port = str(parsed.port)
            except Exception:
                pass

            cmd = [
                "node",
                node_script,
                "--job", job_file,
                "--input", input_video_path,
                "--output", output_video_path,
                "--ffmpeg", self.ffmpeg_path,
                "--port", frontend_port
            ]

            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=os.path.dirname(node_script)
            )

            if proc.stdout:
                import json
                for line in proc.stdout:
                    line = line.strip()
                    if line.startswith("{"):
                        try:
                            data = json.loads(line)
                            if data.get("type") == "progress" and progress_callback:
                                pct = float(data.get("pct", 0))
                                msg = data.get("message", f"Rendering captions: {int(pct)}%")
                                progress_callback(pct, msg)
                            elif data.get("type") == "status" and progress_callback:
                                progress_callback(15.0, data.get("message", "Rendering..."))
                        except Exception:
                            pass

            proc.wait()

            if proc.returncode != 0:
                stderr_text = proc.stderr.read() if proc.stderr else "Unknown error"
                logger.error("Node exact renderer failed", stderr=stderr_text)
                return {"success": False, "error": stderr_text}

            if os.path.exists(output_video_path):
                if progress_callback:
                    progress_callback(100.0, "Export completed successfully")
                return {"success": True, "output_path": output_video_path}

            return {"success": False, "error": "Output video file was not generated"}

        except Exception as e:
            logger.error("Exact preview render exception", error=str(e))
            return {"success": False, "error": str(e)}
        finally:
            if os.path.exists(job_file):
                try:
                    os.remove(job_file)
                except Exception:
                    pass

    async def render_burned_captions(
        self,
        project_id: str,
        input_video_path: str,
        segments: List[Dict[str, Any]],
        export_id: str,
        text_layers: Optional[List[Dict[str, Any]]] = None,
        template_config: Optional[Dict[str, Any]] = None,
        aspect_ratio: Optional[str] = "9:16",
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> Dict[str, Any]:
        """Render captions onto input video using exact preview rendering with ASS fallback"""

        self.ensure_dirs()
        output_video_path = os.path.join(self.render_dir, f"{export_id}.mp4")

        # 1. Primary: Frame-by-frame exact preview renderer using Chrome + Playwright
        curr_path = Path(os.path.abspath(__file__)).resolve()
        # Look up parent hierarchy for repo root containing frontend directory
        repo_root = None
        for parent in curr_path.parents:
            candidate = parent / "frontend" / "scripts" / "render_export.js"
            if candidate.exists():
                repo_root = parent
                node_script = str(candidate)
                break
        else:
            node_script = str(curr_path.parents[4] / "frontend" / "scripts" / "render_export.js")

        if os.path.exists(node_script) and shutil.which("node"):
            logger.info("Using exact preview frame renderer for export", export_id=export_id, node_script=node_script)
            exact_res = await self.render_exact_preview_captions(
                input_video_path=input_video_path,
                output_video_path=output_video_path,
                segments=segments,
                template_config=template_config or {},
                text_layers=text_layers or [],
                aspect_ratio=aspect_ratio or "9:16",
                export_id=export_id,
                node_script=node_script,
                progress_callback=progress_callback
            )
            if exact_res.get("success"):
                return exact_res
            wants_behind = any(l.get("visible", True) is not False and l.get("layering") == "behind" for l in (text_layers or [])) or (
                bool(segments)
                and (segments[0].get("caption_layer") or {}).get("visible", True) is not False
                and (segments[0].get("caption_layer") or {}).get("layering") == "behind"
            )
            if wants_behind:
                # The ASS fallback cannot place text behind the person, so fail honestly instead of exporting the wrong result.
                return {"success": False, "error": f"Behind Character render failed: {exact_res.get('error')}"}
            logger.warning("Exact preview renderer failed, falling back to ASS subtitle render", error=exact_res.get("error"))

        try:
            if progress_callback:
                progress_callback(10.0, "Analyzing video metadata...")

            meta = await self.get_video_metadata(input_video_path)
            video_w = meta.get('width', 1080)
            video_h = meta.get('height', 1920)
            duration = float(meta.get('duration', 0.0))
            has_audio = meta.get('has_audio', True)
            audio_is_aac = meta.get('audio_is_aac', False)

            if progress_callback:
                progress_callback(15.0, "Generating styled subtitle track...")

            ass_path = self.generate_ass_subtitle_file(
                project_id,
                segments,
                play_res_x=video_w,
                play_res_y=video_h,
                text_layers=text_layers
            )

            if progress_callback:
                progress_callback(20.0, "Verifying font assets for libass...")

            # Download all required fonts for server-side libass rendering.
            used_fonts = getattr(self, '_last_used_fonts', []) or []
            used_fonts = list(set(used_fonts + ['Noto Sans Telugu', 'Noto Sans Devanagari', 'Noto Sans']))
            fonts_dir = ensure_fonts_available(used_fonts)

            # Path formatting for FFmpeg subtitles filter on Windows.
            clean_ass_path = ass_path.replace("\\", "/").replace(":", "\\:")
            clean_fonts_dir = fonts_dir.replace("\\", "/").replace(":", "\\:")
            subtitles_filter = f"subtitles='{clean_ass_path}':fontsdir='{clean_fonts_dir}'"

            # Construct high-performance FFmpeg command
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", input_video_path,
                "-vf", subtitles_filter,
                "-vcodec", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-threads", "0"
            ]

            # Audio handling: copy audio if already AAC to avoid re-encoding overhead
            if has_audio:
                if audio_is_aac:
                    cmd.extend(["-c:a", "copy"])
                else:
                    cmd.extend(["-c:a", "aac", "-b:a", "192k"])
            else:
                cmd.extend(["-an"])

            cmd.extend([
                "-progress", "pipe:1",
                output_video_path
            ])

            logger.info("Executing FFmpeg with real-time progress", command=" ".join(cmd[:8]) + "...")

            # Run FFmpeg asynchronously with real-time stdout progress monitoring
            # Stderr is directed to a temporary file to avoid OS pipe buffer deadlocks on Windows
            stderr_log_path = os.path.join(self.temp_dir, f"{export_id}_ffmpeg_stderr.log")
            with open(stderr_log_path, "w", encoding="utf-8", errors="replace") as err_file:
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=err_file,
                    text=True
                )

                current_speed = "1.0x"
                last_reported_pct = 20.0

                if proc.stdout:
                    for line in proc.stdout:
                        line = line.strip()
                        if line.startswith("speed="):
                            current_speed = line.split("=")[1].strip()
                        elif line.startswith("out_time_us="):
                            try:
                                us = int(line.split("=")[1])
                                cur_sec = us / 1_000_000.0
                                if duration > 0:
                                    pct = min(98.0, 20.0 + (cur_sec / duration) * 78.0)
                                    if pct - last_reported_pct >= 1.0 or pct >= 97.0:
                                        last_reported_pct = pct
                                        cur_m, cur_s = int(cur_sec // 60), int(cur_sec % 60)
                                        dur_m, dur_s = int(duration // 60), int(duration % 60)
                                        msg = f"Encoding video: {round(pct)}% ({cur_m:02d}:{cur_s:02d} / {dur_m:02d}:{dur_s:02d}) • {current_speed}"
                                        if progress_callback:
                                            progress_callback(pct, msg)
                            except Exception:
                                pass
                        elif line == "progress=end":
                            break

                proc.wait()

            stderr_text = ""
            if os.path.exists(stderr_log_path):
                with open(stderr_log_path, "r", encoding="utf-8", errors="replace") as ef:
                    stderr_text = ef.read()
                try:
                    os.remove(stderr_log_path)
                except Exception:
                    pass

            if proc.returncode != 0:
                logger.error("FFmpeg render failed", error=stderr_text[-500:])
                return {
                    "success": False,
                    "error": f"FFmpeg error: {stderr_text[-300:]}"
                }

            if progress_callback:
                progress_callback(99.0, "Finalizing MP4 container...")

            logger.info("Video export rendering completed", output_path=output_video_path)
            return {
                "success": True,
                "output_path": output_video_path
            }

        except Exception as e:
            logger.error("Render failed", error=str(e))
            return {"success": False, "error": str(e)}


ffmpeg_service = FFmpegService()
