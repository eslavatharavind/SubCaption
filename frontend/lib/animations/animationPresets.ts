import { PresetRegistryItem, AnimationConfig } from '@/types/animation';

export const PRIMARY_ENTRANCE_PRESETS: PresetRegistryItem[] = [
  { id: 'none', name: 'None', category: 'entrance', level: 'primary', description: 'Instant display without entrance animation', config: { entrance: 'none' } },
  { id: 'fade', name: 'Fade In', category: 'entrance', level: 'primary', description: 'Smooth opacity transition from 0% to 100%', config: { entrance: 'fade', duration: 0.3, easing: 'easeOut' } },
  { id: 'fade-up', name: 'Fade Up', category: 'entrance', level: 'primary', description: 'Fade in with upward vertical movement', config: { entrance: 'fade-up', duration: 0.35, easing: 'easeOut', direction: 'up' } },
  { id: 'fade-down', name: 'Fade Down', category: 'entrance', level: 'primary', description: 'Fade in with downward vertical movement', config: { entrance: 'fade-down', duration: 0.35, easing: 'easeOut', direction: 'down' } },
  { id: 'fade-left', name: 'Fade Left', category: 'entrance', level: 'primary', description: 'Fade in from left to right', config: { entrance: 'fade-left', duration: 0.35, easing: 'easeOut', direction: 'left' } },
  { id: 'fade-right', name: 'Fade Right', category: 'entrance', level: 'primary', description: 'Fade in from right to left', config: { entrance: 'fade-right', duration: 0.35, easing: 'easeOut', direction: 'right' } },
  { id: 'slide-up', name: 'Slide Up', category: 'entrance', level: 'primary', description: 'Slide up into position from below safe-area', config: { entrance: 'slide-up', duration: 0.4, easing: 'smooth', direction: 'up' } },
  { id: 'slide-down', name: 'Slide Down', category: 'entrance', level: 'primary', description: 'Slide down into position from above safe-area', config: { entrance: 'slide-down', duration: 0.4, easing: 'smooth', direction: 'down' } },
  { id: 'slide-left', name: 'Slide Left', category: 'entrance', level: 'primary', description: 'Slide in horizontally from left border', config: { entrance: 'slide-left', duration: 0.4, easing: 'smooth', direction: 'left' } },
  { id: 'slide-right', name: 'Slide Right', category: 'entrance', level: 'primary', description: 'Slide in horizontally from right border', config: { entrance: 'slide-right', duration: 0.4, easing: 'smooth', direction: 'right' } },
  { id: 'pop', name: 'Pop In', category: 'entrance', level: 'primary', description: 'Dynamic scale bounce with spring overshoot', config: { entrance: 'pop', duration: 0.35, easing: 'spring' } },
  { id: 'scale', name: 'Scale In', category: 'entrance', level: 'primary', description: 'Zoom scale entrance from 60% to 100%', config: { entrance: 'scale', duration: 0.35, easing: 'easeOut' } },
  { id: 'zoom-in', name: 'Zoom In', category: 'entrance', level: 'primary', description: 'Rapid zoom entrance from 200% down to 100%', config: { entrance: 'zoom-in', duration: 0.3, easing: 'easeOut' } },
  { id: 'bounce', name: 'Bounce In', category: 'entrance', level: 'primary', description: 'Elastic bounce entrance', config: { entrance: 'bounce', duration: 0.45, easing: 'bounce' } },
  { id: 'float-in', name: 'Float In', category: 'entrance', level: 'primary', description: 'Gentle floating upward drift', config: { entrance: 'float-in', duration: 0.5, easing: 'smooth' } },
  { id: 'wipe-in', name: 'Wipe In', category: 'entrance', level: 'primary', description: 'Linear clip mask wipe from left to right', config: { entrance: 'wipe-in', duration: 0.4, easing: 'easeInOut', direction: 'right' } },
  { id: 'reveal', name: 'Reveal', category: 'entrance', level: 'primary', description: 'Center mask reveal expansion', config: { entrance: 'reveal', duration: 0.35, easing: 'easeOut', direction: 'center' } },
  { id: 'typewriter', name: 'Typewriter', category: 'entrance', level: 'primary', description: 'Classic typewriter character reveal', config: { entrance: 'typewriter', duration: 0.4, stagger: 0.04 } },
];

export const PRIMARY_WORD_PRESETS: PresetRegistryItem[] = [
  { id: 'none', name: 'None', category: 'word', level: 'primary', description: 'Render all words simultaneously', config: { wordAnimation: 'none' } },
  { id: 'word-by-word', name: 'Word by Word', category: 'word', level: 'primary', description: 'Reveal words sequentially as spoken', config: { wordAnimation: 'word-by-word', stagger: 0.1 } },
  { id: 'pop-word', name: 'Word Pop', category: 'word', level: 'primary', description: 'Pop scale animation as each word appears', config: { wordAnimation: 'pop-word', stagger: 0.08, easing: 'spring' } },
  { id: 'scale-word', name: 'Word Scale', category: 'word', level: 'primary', description: 'Smooth scale enlargement per word', config: { wordAnimation: 'scale-word', stagger: 0.08 } },
  { id: 'fade-word', name: 'Word Fade', category: 'word', level: 'primary', description: 'Sequential word opacity fade in', config: { wordAnimation: 'fade-word', stagger: 0.08 } },
  { id: 'slide-word', name: 'Word Slide', category: 'word', level: 'primary', description: 'Words slide upward into position', config: { wordAnimation: 'slide-word', stagger: 0.08, direction: 'up' } },
  { id: 'bounce-word', name: 'Word Bounce', category: 'word', level: 'primary', description: 'Words bounce in with spring elasticity', config: { wordAnimation: 'bounce-word', stagger: 0.1, easing: 'bounce' } },
  { id: 'reveal-word', name: 'Word Reveal', category: 'word', level: 'primary', description: 'Clip mask reveal word-by-word', config: { wordAnimation: 'reveal-word', stagger: 0.08 } },
  { id: 'blur-sharp-word', name: 'Word Blur to Sharp', category: 'word', level: 'primary', description: 'Transitions word from blurred to crisp focus', config: { wordAnimation: 'blur-sharp-word', stagger: 0.08 } },
  { id: 'type-word', name: 'Word Type', category: 'word', level: 'primary', description: 'Fast typewriter word insertion', config: { wordAnimation: 'type-word', stagger: 0.06 } },
];

export const PRIMARY_KARAOKE_PRESETS: PresetRegistryItem[] = [
  { id: 'none', name: 'None', category: 'karaoke', level: 'primary', description: 'Standard static text display', config: { karaokeAnimation: 'none' } },
  { id: 'classic-karaoke', name: 'Classic Karaoke', category: 'karaoke', level: 'primary', description: 'High-contrast text color shift on active word', config: { karaokeAnimation: 'classic-karaoke' } },
  { id: 'color-fill', name: 'Color Fill', category: 'karaoke', level: 'primary', description: 'Smooth color transition during word audio duration', config: { karaokeAnimation: 'color-fill' } },
  { id: 'progressive-fill', name: 'Progressive Fill', category: 'karaoke', level: 'primary', description: 'Sub-word precise gradient color sweep', config: { karaokeAnimation: 'progressive-fill' } },
  { id: 'active-word', name: 'Active Word', category: 'karaoke', level: 'primary', description: 'Emphasize current active word with highlight color', config: { karaokeAnimation: 'active-word' } },
  { id: 'active-word-scale', name: 'Active Word Scale', category: 'karaoke', level: 'primary', description: 'Active word scales up 120% while spoken', config: { karaokeAnimation: 'active-word-scale' } },
  { id: 'active-word-glow', name: 'Active Word Glow', category: 'karaoke', level: 'primary', description: 'Active word emits neon glow aura while spoken', config: { karaokeAnimation: 'active-word-glow' } },
  { id: 'active-word-bg', name: 'Active Word Background', category: 'karaoke', level: 'primary', description: 'Pill/Marker background container tracks active word', config: { karaokeAnimation: 'active-word-bg' } },
  { id: 'underline-progress', name: 'Underline Progress', category: 'karaoke', level: 'primary', description: 'Animated underline bar sweeps under active word', config: { karaokeAnimation: 'underline-progress' } },
  { id: 'highlight-sweep', name: 'Highlight Sweep', category: 'karaoke', level: 'primary', description: 'Horizontal marker highlight sweeps active word', config: { karaokeAnimation: 'highlight-sweep' } },
  { id: 'word-by-word-reveal', name: 'Word-by-Word Reveal', category: 'karaoke', level: 'primary', description: 'Reveals text word-by-word exactly matching spoken timestamps', config: { karaokeAnimation: 'word-by-word-reveal' } },
];

export const PRIMARY_EMPHASIS_PRESETS: PresetRegistryItem[] = [
  { id: 'none', name: 'None', category: 'impact', level: 'primary', description: 'No emphasis effect', config: { emphasisAnimation: 'none' } },
  { id: 'pop', name: 'Pop', category: 'impact', level: 'primary', description: 'Quick pop scale emphasis on target word', config: { emphasisAnimation: 'pop', intensity: 'medium' } },
  { id: 'punch', name: 'Punch', category: 'impact', level: 'primary', description: 'Heavy scale punch impact', config: { emphasisAnimation: 'punch', intensity: 'strong' } },
  { id: 'impact', name: 'Impact', category: 'impact', level: 'primary', description: 'High-energy impact scale and color pulse', config: { emphasisAnimation: 'impact', intensity: 'strong' } },
  { id: 'bounce', name: 'Bounce', category: 'impact', level: 'primary', description: 'Playful elastic bounce loop', config: { emphasisAnimation: 'bounce', easing: 'bounce' } },
  { id: 'scale-up', name: 'Scale Up', category: 'impact', level: 'primary', description: 'Smooth 130% scale enlargement', config: { emphasisAnimation: 'scale-up' } },
  { id: 'pulse', name: 'Pulse', category: 'impact', level: 'primary', description: 'Rhythmic scale pulsing', config: { emphasisAnimation: 'pulse' } },
  { id: 'shake', name: 'Shake', category: 'impact', level: 'primary', description: 'Horizontal camera-shake jitter', config: { emphasisAnimation: 'shake', intensity: 'medium' } },
  { id: 'wobble', name: 'Wobble', category: 'impact', level: 'primary', description: 'Rotational wobble tilt oscillation', config: { emphasisAnimation: 'wobble' } },
  { id: 'flash', name: 'Flash', category: 'impact', level: 'primary', description: 'Bright color strobe flash', config: { emphasisAnimation: 'flash' } },
  { id: 'glow-pulse', name: 'Glow Pulse', category: 'impact', level: 'primary', description: 'Neon outer glow pulsing aura', config: { emphasisAnimation: 'glow-pulse' } },
  { id: 'stomp', name: 'Stomp', category: 'impact', level: 'primary', description: 'Vertical drop stomp impact', config: { emphasisAnimation: 'stomp', intensity: 'extreme' } },
  { id: 'elastic-pop', name: 'Elastic Pop', category: 'impact', level: 'primary', description: 'Elastic spring pop effect', config: { emphasisAnimation: 'elastic-pop', easing: 'elastic' } },
];

export const PRIMARY_EXIT_PRESETS: PresetRegistryItem[] = [
  { id: 'none', name: 'None', category: 'exit', level: 'primary', description: 'Instant removal on segment end', config: { exit: 'none' } },
  { id: 'fade-out', name: 'Fade Out', category: 'exit', level: 'primary', description: 'Smooth opacity fade to 0%', config: { exit: 'fade-out', duration: 0.3 } },
  { id: 'fade-up-out', name: 'Fade Up Exit', category: 'exit', level: 'primary', description: 'Fade out while drifting upward', config: { exit: 'fade-up-out', duration: 0.3, direction: 'up' } },
  { id: 'fade-down-out', name: 'Fade Down Exit', category: 'exit', level: 'primary', description: 'Fade out while drifting downward', config: { exit: 'fade-down-out', duration: 0.3, direction: 'down' } },
  { id: 'fade-left-out', name: 'Fade Left Exit', category: 'exit', level: 'primary', description: 'Fade out drifting left', config: { exit: 'fade-left-out', duration: 0.3, direction: 'left' } },
  { id: 'fade-right-out', name: 'Fade Right Exit', category: 'exit', level: 'primary', description: 'Fade out drifting right', config: { exit: 'fade-right-out', duration: 0.3, direction: 'right' } },
  { id: 'slide-out', name: 'Slide Out', category: 'exit', level: 'primary', description: 'Slide out of screen boundary', config: { exit: 'slide-out', duration: 0.35, direction: 'down' } },
  { id: 'scale-out', name: 'Scale Out', category: 'exit', level: 'primary', description: 'Shrink scale to zero', config: { exit: 'scale-out', duration: 0.3 } },
  { id: 'zoom-out', name: 'Zoom Out', category: 'exit', level: 'primary', description: 'Zoom out into background', config: { exit: 'zoom-out', duration: 0.3 } },
  { id: 'blur-out', name: 'Blur Out', category: 'exit', level: 'primary', description: 'Gaussian blur dissolution', config: { exit: 'blur-out', duration: 0.3 } },
  { id: 'wipe-out', name: 'Wipe Out', category: 'exit', level: 'primary', description: 'Clip mask wipe exit', config: { exit: 'wipe-out', duration: 0.35 } },
  { id: 'collapse', name: 'Collapse', category: 'exit', level: 'primary', description: 'Vertical height collapse', config: { exit: 'collapse', duration: 0.3 } },
  { id: 'flip-out', name: 'Flip Out', category: 'exit', level: 'primary', description: '3D horizontal flip rotation out', config: { exit: 'flip-out', duration: 0.35 } },
];

export const PRIMARY_LOOP_PRESETS: PresetRegistryItem[] = [
  { id: 'none', name: 'None', category: 'loop', level: 'primary', description: 'Static resting caption state', config: { loop: 'none' } },
  { id: 'float', name: 'Float', category: 'loop', level: 'primary', description: 'Gentle vertical floating movement', config: { loop: 'float' } },
  { id: 'pulse', name: 'Pulse', category: 'loop', level: 'primary', description: 'Rhythmic subtle scale breathing', config: { loop: 'pulse' } },
  { id: 'breathing', name: 'Breathing', category: 'loop', level: 'primary', description: 'Subtle 102% opacity & scale wave', config: { loop: 'breathing' } },
  { id: 'gentle-scale', name: 'Gentle Scale', category: 'loop', level: 'primary', description: 'Continuous smooth zoom oscillation', config: { loop: 'gentle-scale' } },
  { id: 'glow-pulse', name: 'Glow Pulse', category: 'loop', level: 'primary', description: 'Continuous outer glow aura pulsing', config: { loop: 'glow-pulse' } },
  { id: 'shake', name: 'Micro Shake', category: 'loop', level: 'primary', description: 'Subtle low-amplitude jitter', config: { loop: 'shake' } },
  { id: 'wobble', name: 'Wobble', category: 'loop', level: 'primary', description: 'Gentle rotation tilt oscillation', config: { loop: 'wobble' } },
  { id: 'swing', name: 'Swing', category: 'loop', level: 'primary', description: 'Pendulum tilt swing', config: { loop: 'swing' } },
  { id: 'bob', name: 'Bob', category: 'loop', level: 'primary', description: 'Up-down rhythm bobbing', config: { loop: 'bob' } },
  { id: 'wave', name: 'Wave', category: 'loop', level: 'primary', description: 'Sine wave vertical position loop', config: { loop: 'wave' } },
  { id: 'neon-flicker', name: 'Neon Flicker', category: 'loop', level: 'primary', description: 'Electric neon tube flicker simulation', config: { loop: 'neon-flicker' } },
  { id: 'gentle-rotation', name: 'Gentle Rotation', category: 'loop', level: 'primary', description: 'Subtle +/- 2 degree angle rocking', config: { loop: 'gentle-rotation' } },
];

export const ADVANCED_CHARACTER_PRESETS: PresetRegistryItem[] = [
  { id: 'char-fade', name: 'Character Fade', category: 'character', level: 'advanced', description: 'Individual character opacity fade in', config: { characterAnimation: 'char-fade', stagger: 0.03 } },
  { id: 'char-pop', name: 'Character Pop', category: 'character', level: 'advanced', description: 'Character scale pop entrance', config: { characterAnimation: 'char-pop', stagger: 0.03, easing: 'spring' } },
  { id: 'char-scale', name: 'Character Scale', category: 'character', level: 'advanced', description: 'Zoom scale per character', config: { characterAnimation: 'char-scale', stagger: 0.03 } },
  { id: 'char-bounce', name: 'Character Bounce', category: 'character', level: 'advanced', description: 'Elastic character bounce drop', config: { characterAnimation: 'char-bounce', stagger: 0.04, easing: 'bounce' } },
  { id: 'char-slide', name: 'Character Slide', category: 'character', level: 'advanced', description: 'Character vertical slide into line', config: { characterAnimation: 'char-slide', stagger: 0.03, direction: 'up' } },
  { id: 'char-reveal', name: 'Character Reveal', category: 'character', level: 'advanced', description: 'Grapheme-safe character mask reveal', config: { characterAnimation: 'char-reveal', stagger: 0.03 } },
  { id: 'char-typewriter', name: 'Character Typewriter', category: 'character', level: 'advanced', description: 'Precise character-by-character typewriter reveal', config: { characterAnimation: 'char-typewriter', stagger: 0.04 } },
  { id: 'char-blur-sharp', name: 'Character Blur to Sharp', category: 'character', level: 'advanced', description: 'Individual character de-blur focus transition', config: { characterAnimation: 'char-blur-sharp', stagger: 0.03 } },
  { id: 'letter-spacing-reveal', name: 'Letter Spacing Reveal', category: 'character', level: 'advanced', description: 'Letter spacing expands from tight to normal', config: { characterAnimation: 'letter-spacing-reveal', duration: 0.4 } },
  { id: 'char-wave', name: 'Character Wave', category: 'character', level: 'advanced', description: 'Staggered vertical wave motion across characters', config: { characterAnimation: 'char-wave', stagger: 0.04 } },
  { id: 'char-stagger', name: 'Character Stagger', category: 'character', level: 'advanced', description: 'Multi-property staggered entrance', config: { characterAnimation: 'char-stagger', stagger: 0.03 } },
  { id: 'char-rotate', name: 'Character Rotate', category: 'character', level: 'advanced', description: '3D angle spin per character', config: { characterAnimation: 'char-rotate', stagger: 0.03 } },
];

export const ADVANCED_MOTION_PRESETS: PresetRegistryItem[] = [
  { id: 'position-motion', name: 'Position Motion', category: 'motion', level: 'advanced', description: 'Custom Start/End X & Y trajectory', config: { advancedMotion: 'position-motion', transform: { startY: 40, endY: 0 } } },
  { id: 'scale-motion', name: 'Scale Motion', category: 'motion', level: 'advanced', description: 'Custom Start/End scale interpolation', config: { advancedMotion: 'scale-motion', transform: { startScale: 0.5, endScale: 1.0 } } },
  { id: 'rotation-motion', name: 'Rotation Motion', category: 'motion', level: 'advanced', description: 'Custom angle rotation trajectory', config: { advancedMotion: 'rotation-motion', transform: { startRotation: -15, endRotation: 0 } } },
  { id: 'opacity-motion', name: 'Opacity Motion', category: 'motion', level: 'advanced', description: 'Custom opacity curve interpolation', config: { advancedMotion: 'opacity-motion', transform: { startOpacity: 0, endOpacity: 1 } } },
  { id: 'blur-motion', name: 'Blur Motion', category: 'motion', level: 'advanced', description: 'Custom gaussian blur focus shift', config: { advancedMotion: 'blur-motion', transform: { startBlur: 12, endBlur: 0 } } },
  { id: 'zoom-motion', name: 'Zoom Motion', category: 'motion', level: 'advanced', description: 'Multi-property camera zoom-in effect', config: { advancedMotion: 'zoom-motion', transform: { startScale: 1.8, endScale: 1.0, startBlur: 6 } } },
  { id: 'pan-motion', name: 'Pan Motion', category: 'motion', level: 'advanced', description: 'Horizontal camera pan motion', config: { advancedMotion: 'pan-motion', transform: { startX: -60, endX: 0 } } },
  { id: 'float-motion', name: 'Float Motion', category: 'motion', level: 'advanced', description: 'Multi-axis float trajectory', config: { advancedMotion: 'float-motion', transform: { startY: 30, startRotation: 5, endY: 0, endRotation: 0 } } },
  { id: 'orbit-motion', name: 'Orbit Motion', category: 'motion', level: 'advanced', description: 'Curved rotational orbit trajectory', config: { advancedMotion: 'orbit-motion' } },
  { id: 'swing-motion', name: 'Swing Motion', category: 'motion', level: 'advanced', description: 'Pendulum swing motion curve', config: { advancedMotion: 'swing-motion', easing: 'spring' } },
  { id: 'elastic-motion', name: 'Elastic Motion', category: 'motion', level: 'advanced', description: 'High-amplitude spring elasticity', config: { advancedMotion: 'elastic-motion', easing: 'elastic' } },
  { id: 'spring-motion', name: 'Spring Motion', category: 'motion', level: 'advanced', description: 'Physically modeled spring dynamics', config: { advancedMotion: 'spring-motion', easing: 'spring' } },
  { id: 'multi-axis', name: 'Multi-Axis Motion', category: 'motion', level: 'advanced', description: 'Simultaneous X, Y, Scale & Rotation trajectory', config: { advancedMotion: 'multi-axis', transform: { startX: -40, startY: 20, startScale: 0.7, startRotation: -10 } } },
];

export const ADVANCED_REVEAL_PRESETS: PresetRegistryItem[] = [
  { id: 'mask-reveal', name: 'Mask Reveal', category: 'reveal', level: 'advanced', description: 'Text revealed through expanding geometric mask', config: { advancedReveal: 'mask-reveal' } },
  { id: 'clip-reveal', name: 'Clip Reveal', category: 'reveal', level: 'advanced', description: 'Clip-path rectangular reveal', config: { advancedReveal: 'clip-reveal' } },
  { id: 'directional-reveal', name: 'Directional Reveal', category: 'reveal', level: 'advanced', description: 'Directional wipe reveal path', config: { advancedReveal: 'directional-reveal', direction: 'right' } },
  { id: 'center-reveal', name: 'Center Reveal', category: 'reveal', level: 'advanced', description: 'Expand outwards from center focal point', config: { advancedReveal: 'center-reveal' } },
  { id: 'edge-reveal', name: 'Edge Reveal', category: 'reveal', level: 'advanced', description: 'Sliding edge reveal boundary', config: { advancedReveal: 'edge-reveal' } },
  { id: 'split-reveal', name: 'Split Reveal', category: 'reveal', level: 'advanced', description: 'Text split into top/bottom halves during reveal', config: { advancedReveal: 'split-reveal' } },
  { id: 'letter-reveal', name: 'Letter Reveal', category: 'reveal', level: 'advanced', description: 'Grapheme-safe letter mask expansion', config: { advancedReveal: 'letter-reveal' } },
  { id: 'word-reveal', name: 'Word Reveal', category: 'reveal', level: 'advanced', description: 'Word box clip reveal', config: { advancedReveal: 'word-reveal' } },
  { id: 'line-reveal', name: 'Line Reveal', category: 'reveal', level: 'advanced', description: 'Line-by-line curtain wipe', config: { advancedReveal: 'line-reveal' } },
  { id: 'shape-reveal', name: 'Shape Reveal', category: 'reveal', level: 'advanced', description: 'Circular shape mask reveal', config: { advancedReveal: 'shape-reveal' } },
  { id: 'curtain-reveal', name: 'Curtain Reveal', category: 'reveal', level: 'advanced', description: 'Dual curtain opening reveal', config: { advancedReveal: 'curtain-reveal' } },
  { id: 'stretch-reveal', name: 'Stretch Reveal', category: 'reveal', level: 'advanced', description: 'Horizontal aspect stretch reveal', config: { advancedReveal: 'stretch-reveal' } },
];

export const CREATIVE_EFFECT_PRESETS: PresetRegistryItem[] = [
  { id: 'none', name: 'None', category: 'creative', level: 'advanced', description: 'Clean rendering without effect shaders', config: { creativeEffect: 'none' } },
  { id: 'rgb-split', name: 'RGB Split', category: 'creative', level: 'advanced', description: 'Chromatic aberration Red/Blue offset split', config: { creativeEffect: 'rgb-split' } },
  { id: 'digital-glitch', name: 'Digital Glitch', category: 'creative', level: 'advanced', description: 'Digital signal corruption & slice displacement', config: { creativeEffect: 'digital-glitch' } },
  { id: 'scanline', name: 'Scanline', category: 'creative', level: 'advanced', description: 'CRT TV scanline overlay lines', config: { creativeEffect: 'scanline' } },
  { id: 'flicker', name: 'Strobe Flicker', category: 'creative', level: 'advanced', description: 'Rapid intensity strobe flicker', config: { creativeEffect: 'flicker' } },
  { id: 'film-reveal', name: 'Film Reveal', category: 'creative', level: 'advanced', description: 'Vintage film reel light leak reveal', config: { creativeEffect: 'film-reveal' } },
  { id: 'camera-push', name: 'Camera Push', category: 'creative', level: 'advanced', description: '3D camera push impact zoom', config: { creativeEffect: 'camera-push' } },
  { id: 'cinematic-fade', name: 'Cinematic Fade', category: 'creative', level: 'advanced', description: 'Anamorphic letterbox blur fade', config: { creativeEffect: 'cinematic-fade' } },
  { id: 'light-sweep', name: 'Light Sweep', category: 'creative', level: 'advanced', description: 'Specular lens flare beam sweep across text', config: { creativeEffect: 'light-sweep' } },
  { id: 'neon-flicker-effect', name: 'Neon Flicker Shader', category: 'creative', level: 'advanced', description: 'Gas-discharge neon tube spark flicker', config: { creativeEffect: 'neon-flicker-effect' } },
  { id: 'glow-pulse-effect', name: 'Glow Pulse Shader', category: 'creative', level: 'advanced', description: 'Multi-pass diffuse neon aura pulse', config: { creativeEffect: 'glow-pulse-effect' } },
  { id: 'vhs', name: 'VHS Tape', category: 'creative', level: 'advanced', description: 'Retro 80s VHS tracking noise & color bleed', config: { creativeEffect: 'vhs' } },
  { id: 'crt-flicker', name: 'CRT Monitor', category: 'creative', level: 'advanced', description: 'Phosphor cathode tube flicker & vignette', config: { creativeEffect: 'crt-flicker' } },
];
