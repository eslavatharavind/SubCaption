import { AdvancedCategory, AdvancedSpec, AnchorPosition, TemplateConfig } from '@/types/template';

/**
 * Advanced Template Library: 100 templates in 10 categories of 10.
 * Each template opts into AdvancedCaptionRenderer through its `advanced` spec.
 * Labels, keywords and numbers are always taken from the real caption words; nothing is invented.
 */

interface Look {
  font: string;
  weight?: number;
  size?: number;
  casing?: 'uppercase' | 'lowercase' | 'none';
  italic?: boolean;
  text?: string;
  accent: string;
  secondary?: string;
  bg?: string;
  y?: number;
  x?: number;
  anchor?: AnchorPosition;
}

const ALL_RATIOS: TemplateConfig['supportedAspectRatios'] = ['9:16', '16:9', '1:1', '4:5', '4:3', '21:9'];

function T(id: string, name: string, category: AdvancedCategory, description: string, look: Look, spec: AdvancedSpec): TemplateConfig {
  return {
    id: `adv-${id}`,
    name,
    category,
    description,
    tag: 'Advanced',
    supportedAspectRatios: ALL_RATIOS,
    typography: {
      fontFamily: look.font,
      fontWeight: look.weight ?? 800,
      fontSize: look.size ?? 46,
      textCasing: look.casing ?? 'none',
      italic: look.italic,
    },
    colors: {
      primaryTextColor: look.text ?? '#FFFFFF',
      highlightColor: look.accent,
      accentColor: look.secondary ?? look.accent,
    },
    background: { type: 'none', color: look.bg ?? 'rgba(12,14,18,0.82)' },
    highlight: { mode: 'active-word' },
    animation: { entrance: 'fade', wordBehavior: 'none', characterBehavior: 'none' },
    position: { x: look.x ?? 50, y: look.y ?? 78, anchor: look.anchor ?? 'bottom-center' },
    advanced: spec,
  };
}

const HOOKS: AdvancedCategory = 'Viral Hooks';
const MIXED: AdvancedCategory = 'Mixed Typography & Scale';
const KINETIC: AdvancedCategory = 'Kinetic Word & Letter Motion';
const HILITE: AdvancedCategory = 'Advanced Highlight & Annotation';
const LAYERED: AdvancedCategory = 'Layered & Experimental';
const CINEMA: AdvancedCategory = 'Cinematic & Editorial';
const CREATOR: AdvancedCategory = 'Creator, Podcast & Dialogue';
const NEWS: AdvancedCategory = 'News, Data & Education';
const TECH: AdvancedCategory = 'Gaming, Tech & Digital';
const CREATIVE: AdvancedCategory = 'Transparent & Creative';

export const ADVANCED_TEMPLATES: TemplateConfig[] = [
  // ───────────── 1. VIRAL HOOKS ─────────────
  T('hook-slam', 'Hook Slam', HOOKS, 'Opening phrase slams in oversized with a short tilt-and-settle impact; the longest word dominates.', { font: 'Anton', weight: 400, casing: 'uppercase', accent: '#FFD23F' }, {
    layout: 'flow', keyword: 'longest', keywordStyle: { scale: 1.6, color: 'accent' }, reveal: 'all', active: 'color', intro: 'slam', introDuration: 0.55,
    sample: 'Nobody tells you this secret', useCase: 'First line of Reels and Shorts', differs: 'Closest: Basic Big Keyword (static pop). Adds a whole-caption slam with tilt and a scaled keyword.',
  }),
  T('curiosity-reveal', 'Curiosity Reveal', HOOKS, 'Two-line phrase where each word surfaces out of blur exactly when it is spoken.', { font: 'Montserrat', weight: 800, accent: '#7DD3FC' }, {
    layout: 'lines', lineWords: 3, keyword: 'last', keywordStyle: { color: 'accent' }, reveal: 'word', motion: 'blur', motionDuration: 0.45,
    sample: 'What happened next shocked everyone here', useCase: 'Story hooks that build anticipation', differs: 'Closest: Basic Masked Wipe (words just appear). Adds per-word blur emergence on fixed two-word lines.',
  }),
  T('question-punch', 'Question Punch', HOOKS, 'The question word is set huge while supporting words shrink; the question word keeps pulsing after it lands.', { font: 'Archivo Black', weight: 400, casing: 'uppercase', accent: '#FF5C8A' }, {
    layout: 'flow', keyword: 'question', keywordStyle: { scale: 2.0, color: 'accent' }, support: { scale: 0.6, opacity: 0.9 }, reveal: 'word', motion: 'zoom', keywordFx: 'pulse',
    sample: 'Why does nobody talk about this', useCase: 'Question-led hooks', differs: 'Closest: Basic Mixed Size (uniform render). Picks the question word from the transcript and scales it 2x.',
  }),
  T('shock-emphasis', 'Shock Emphasis', HOOKS, 'Uniform caption where one key word turns accent and receives a controlled shake when spoken.', { font: 'Montserrat', weight: 900, casing: 'uppercase', accent: '#FF3B30' }, {
    layout: 'flow', keyword: 'longest', keywordStyle: { color: 'accent' }, reveal: 'all', active: 'color', keywordFx: 'shake', intro: 'fade',
    sample: 'This changed absolutely everything', useCase: 'Surprising statements', differs: 'Closest: Basic Green Accent. Only the chosen keyword shakes; other words keep size.',
  }),
  T('number-shock', 'Number Shock', HOOKS, 'Any number in the caption is enlarged 2.6x and slams in; supporting words reveal one at a time.', { font: 'Bebas Neue', weight: 400, casing: 'uppercase', accent: '#22D3EE' }, {
    layout: 'flow', keyword: 'numeric', keywordStyle: { scale: 2.6, color: 'accent' }, support: { scale: 0.8 }, reveal: 'word', motion: 'slam', keywordFx: 'slam',
    sample: 'I made 10000 dollars in 30 days', useCase: 'Stats and results hooks', differs: 'Closest: Basic Big Numeric Focus (number not detected). Detects digits in the transcript and slams them.',
  }),
  T('myth-fact', 'Myth vs Fact', HOOKS, 'Caption splits in two: the first half is small and struck through, the second half lands large in accent.', { font: 'Poppins', weight: 800, accent: '#4ADE80', text: '#F8FAFC' }, {
    layout: 'split', splitAt: 0.5, zones: [{ scale: 0.7, color: 'muted', strike: true, weight: 600 }, { scale: 1.15, color: 'accent', weight: 900 }], reveal: 'line', motion: 'slide', intro: 'split',
    sample: 'Carbs make you fat Calories do', useCase: 'Myth-busting and comparisons', differs: 'Closest: Basic Dual-Tone Split. Adds a strike-through zone versus an emphasised zone entering from opposite sides.',
  }),
  T('warning-hook', 'Warning Hook', HOOKS, 'The first word becomes an accent label tag above a bold headline inside a lower-third bar that shakes in.', { font: 'Oswald', weight: 700, casing: 'uppercase', accent: '#FACC15', bg: 'rgba(10,10,10,0.88)' }, {
    layout: 'label', splitAt: 1, reveal: 'all', active: 'color', frame: 'bar', intro: 'shake',
    sample: 'Stop doing this before bed', useCase: 'Warnings and do-not lists', differs: 'Closest: Basic Corporate Slate (bar never drawn). Real bar plus a label tag taken from the first spoken word.',
  }),
  T('suspense-stack', 'Suspense Stack', HOOKS, 'One word per line; each word drops into the stack exactly as it is spoken.', { font: 'League Gothic', weight: 400, size: 54, casing: 'uppercase', accent: '#F97316' }, {
    layout: 'stack', reveal: 'word', motion: 'drop', motionDuration: 0.4,
    sample: 'You will not believe this', useCase: 'Slow-build suspense openers', differs: 'Closest: Basic Staggered Cascade (single line). Builds a vertical stack word by word.',
  }),
  T('challenge-hook', 'Challenge Hook', HOOKS, 'Tilted boxed caption; lines slide in and the final word is enlarged as the challenge.', { font: 'Rubik', weight: 900, casing: 'uppercase', accent: '#A3E635', bg: 'rgba(17,24,39,0.9)' }, {
    layout: 'lines', lineWords: 2, keyword: 'last', keywordStyle: { scale: 1.4, color: 'accent' }, reveal: 'line', motion: 'slide', active: 'color', frame: 'box', tilt: -4,
    sample: 'Try this for seven days', useCase: 'Challenges and dares', differs: 'Closest: Basic Slanted Banner (no box rendered). Real tilted box, line slide-in and last-word emphasis.',
  }),
  T('cta-spotlight', 'CTA Spotlight', HOOKS, 'When the final word is spoken, every other word dims and the call-to-action word glows and pulses.', { font: 'Poppins', weight: 800, accent: '#38BDF8' }, {
    layout: 'flow', keyword: 'last', reveal: 'all', active: 'spotlight', keywordFx: 'pulse', intro: 'elastic',
    sample: 'Save this and follow for more', useCase: 'Calls to action at the end', differs: 'Closest: Basic Glow presets. Dims the rest of the caption to spotlight the final word.',
  }),

  // ───────────── 2. MIXED TYPOGRAPHY & SCALE ─────────────
  T('scale-contrast', 'Scale Contrast', MIXED, 'Light, small supporting words around a heavy keyword at 2.2x.', { font: 'Montserrat', weight: 900, accent: '#FDE047' }, {
    layout: 'flow', keyword: 'longest', keywordStyle: { scale: 2.2, weight: 900, color: 'accent' }, support: { scale: 0.55, weight: 300 }, reveal: 'word', motion: 'rise', active: 'color',
    sample: 'This is the most important lesson', useCase: 'Quotable key points', differs: 'Closest: Basic Mixed Size (renders uniform). Real weight and size contrast in one line.',
  }),
  T('editorial-mix', 'Editorial Mix', MIXED, 'Small italic serif kicker (first two words) above a heavy sans headline; lines rise in.', { font: 'Inter', weight: 900, accent: '#F472B6' }, {
    layout: 'label', splitAt: 2, zones: [{ scale: 0.6, font: 'Playfair Display', italic: true, weight: 500, color: 'accent' }, { scale: 1.1, weight: 900 }], reveal: 'line', motion: 'rise',
    sample: 'Here is why your content works', useCase: 'Editorial explainers', differs: 'Closest: Basic Script Accent (secondary font ignored). Two fonts actually render in two tiers.',
  }),
  T('mixed-weight', 'Mixed Weight', MIXED, 'Words alternate heavy and hairline weights, fading in as spoken.', { font: 'Manrope', weight: 800, accent: '#C4B5FD' }, {
    layout: 'flow', alternate: { weight: 200, opacity: 0.85 }, alternateBy: 'word', reveal: 'word', motion: 'fade',
    sample: 'Less noise more signal every day', useCase: 'Minimal lifestyle content', differs: 'Closest: Basic Lowercase Modern. Rhythm comes from alternating weights, not colour.',
  }),
  T('condensed-impact', 'Condensed Impact', MIXED, 'Narrow condensed stack with the keyword at 1.5x, revealed by a left-to-right curtain.', { font: 'League Gothic', weight: 400, size: 58, casing: 'uppercase', accent: '#FB923C' }, {
    layout: 'stack', keyword: 'longest', keywordStyle: { scale: 1.5, color: 'accent' }, reveal: 'all', active: 'color', intro: 'curtain',
    sample: 'Discipline beats motivation daily', useCase: 'Motivation and fitness', differs: 'Closest: Basic Condensed (single row). Vertical condensed stack with curtain reveal.',
  }),
  T('serif-sans-fusion', 'Serif Sans Fusion', MIXED, 'Lines alternate between an italic serif and a modern sans; spoken words get a drawn underline.', { font: 'DM Sans', weight: 700, accent: '#FCA5A5' }, {
    layout: 'lines', lineWords: 3, alternate: { font: 'Fraunces', italic: true, weight: 600 }, alternateBy: 'line', reveal: 'line', motion: 'fade', active: 'underline',
    sample: 'Good design is quiet but it speaks loudly', useCase: 'Design and brand storytelling', differs: 'Closest: Basic Editorial Column. Two typefaces alternate by line with a progressive underline.',
  }),
  T('split-scale', 'Split Scale', MIXED, 'Small first half at top-left, large second half at bottom-right; halves enter from opposite sides.', { font: 'Syne', weight: 800, accent: '#5EEAD4' }, {
    layout: 'split', splitAt: 0.4, zones: [{ scale: 0.6, weight: 500, color: 'muted' }, { scale: 1.5, weight: 800 }], reveal: 'all', active: 'color', intro: 'split',
    sample: 'The real secret is consistency', useCase: 'Two-part statements', differs: 'Closest: Basic Top-Bottom Split Banner. Asymmetric zones with different scales and opposing entrances.',
  }),
  T('vertical-word-stack', 'Vertical Word Stack', MIXED, 'Every word on its own line; the focal word is 1.8x and scales up when spoken.', { font: 'Barlow Condensed', weight: 800, casing: 'uppercase', accent: '#FBBF24' }, {
    layout: 'stack', keyword: 'longest', keywordStyle: { scale: 1.8, color: 'accent' }, support: { scale: 0.75 }, reveal: 'all', active: 'scale', intro: 'fade',
    sample: 'Build something meaningful today', useCase: 'Vertical video centrepieces', differs: 'Closest: Basic Stacked Bold (single row render). True word-per-line stack with focal scaling.',
  }),
  T('offset-typography', 'Offset Typography', MIXED, 'Two-word lines alternate left and right alignment, sliding in line by line.', { font: 'Space Grotesk', weight: 700, accent: '#86EFAC' }, {
    layout: 'offset', lineWords: 2, reveal: 'line', motion: 'slide', active: 'color',
    sample: 'Ideas move fast when you start', useCase: 'Dynamic talking-head captions', differs: 'Closest: Basic Staggered Line Cascade (centered row). Lines zig-zag across the frame.',
  }),
  T('justified-block', 'Justified Block', MIXED, 'Lines are measured and scaled so every line has the same width, forming a solid block.', { font: 'Anton', weight: 400, casing: 'uppercase', accent: '#F87171' }, {
    layout: 'justified', lineWords: 2, reveal: 'all', active: 'color', intro: 'fade',
    sample: 'Make it simple make it memorable', useCase: 'Quotes and statements', differs: 'Closest: Basic Vintage Newspaper Headline. Measures each line (script-aware) and scales it to a common width.',
  }),
  T('oversized-ghost', 'Oversized Ghost Word', MIXED, 'The keyword appears huge and translucent behind the caption while foreground words rise in.', { font: 'Inter', weight: 800, accent: '#A78BFA' }, {
    layout: 'flow', keyword: 'longest', keywordStyle: { color: 'accent' }, reveal: 'word', motion: 'rise', active: 'color', layers: 'ghost-word',
    sample: 'Creativity is a daily practice', useCase: 'Brand and mood pieces', differs: 'Closest: Basic Giant Watermark Glyph (no glyph drawn). Renders a real oversized ghost of the spoken keyword.',
  }),

  // ───────────── 3. KINETIC WORD & LETTER MOTION ─────────────
  T('letter-drop', 'Letter Drop', KINETIC, 'Each grapheme cluster drops and settles in sequence while its word is spoken (Telugu/Hindi safe).', { font: 'Poppins', weight: 800, accent: '#FDE68A' }, {
    layout: 'flow', reveal: 'letter', motion: 'drop',
    sample: 'Letters falling into place', useCase: 'Titles and kinetic typography', differs: 'Closest: Basic Typewriter (letters never hidden). Real per-grapheme drop animation.',
  }),
  T('word-stagger', 'Word Stagger', KINETIC, 'All words rise in on a fixed 80ms stagger at caption start, independent of speech timing.', { font: 'Montserrat', weight: 800, accent: '#93C5FD' }, {
    layout: 'flow', reveal: 'all', stagger: 0.08, motion: 'rise',
    sample: 'Every word enters on its own beat', useCase: 'Punchy social captions', differs: 'Closest: Basic Staggered Cascade (no stagger rendered). Real per-word delays.',
  }),
  T('elastic-word-pop', 'Elastic Word Pop', KINETIC, 'Words spring in with an elastic overshoot when spoken; the active word takes the accent.', { font: 'Rubik', weight: 900, accent: '#F472B6' }, {
    layout: 'flow', reveal: 'word', motion: 'elastic', motionDuration: 0.6, active: 'color',
    sample: 'Bounce into the next big idea', useCase: 'Playful creator content', differs: 'Closest: Basic Bouncy Kinetic Pop (whole caption). Elastic motion per word on its timestamp.',
  }),
  T('travelling-highlight', 'Travelling Highlight', KINETIC, 'One accent box glides and resizes from word to word as speech progresses.', { font: 'Inter', weight: 800, accent: '#FACC15' }, {
    layout: 'flow', reveal: 'all', active: 'box', intro: 'fade',
    sample: 'Watch the highlight follow my voice', useCase: 'Talking heads', differs: 'Closest: Basic Yellow Pill (highlight jumps). The box physically travels between word positions.',
  }),
  T('progressive-fill', 'Progressive Fill', KINETIC, 'Dimmed words fill left-to-right in accent across each word\'s spoken duration and stay filled.', { font: 'Montserrat', weight: 900, accent: '#34D399' }, {
    layout: 'lines', lineWords: 3, reveal: 'all', active: 'fill', persist: true,
    sample: 'Read along as the colour fills in', useCase: 'Karaoke-style reading', differs: 'Closest: Basic Liquid Karaoke Wave (colour switch only). Fills within each word over its duration.',
  }),
  T('word-by-word-scale', 'Word-by-Word Scale', KINETIC, 'The spoken word scales up with an overshoot and settles; others stay at rest.', { font: 'Poppins', weight: 800, accent: '#FB7185' }, {
    layout: 'flow', reveal: 'word', motion: 'rise', active: 'scale',
    sample: 'Each word grows when it is spoken', useCase: 'Energetic voiceovers', differs: 'Closest: Basic Active Word (1.08x tint). Pronounced time-based scale bump per word.',
  }),
  T('directional-word-flow', 'Directional Word Flow', KINETIC, 'Words enter from left, right, top and bottom in rotation as they are spoken, on two-word lines.', { font: 'Space Grotesk', weight: 700, accent: '#67E8F9' }, {
    layout: 'lines', lineWords: 2, reveal: 'word', motion: 'alternate',
    sample: 'Words arrive from every direction now', useCase: 'Dynamic edits', differs: 'Closest: Basic Multi-Anchor Corners (renders centered). Four-direction per-word entrances.',
  }),
  T('stomp-reveal', 'Stomp Reveal', KINETIC, 'Words stomp down from oversized to rest with a small drop, line by line in upper case.', { font: 'Archivo Black', weight: 400, casing: 'uppercase', accent: '#FDBA74' }, {
    layout: 'lines', lineWords: 2, reveal: 'word', motion: 'stomp', active: 'color',
    sample: 'Hit every beat with weight', useCase: 'Music and sports edits', differs: 'Closest: Basic Meme Style. Per-word stomp scale-down instead of a whole-caption bounce.',
  }),
  T('wave-stagger', 'Wave Stagger', KINETIC, 'Words ripple in on a sine wave stagger; the spoken word glows.', { font: 'Outfit', weight: 800, accent: '#A5B4FC' }, {
    layout: 'flow', reveal: 'all', stagger: 0.06, motion: 'wave', active: 'glow',
    sample: 'Ride the wave of every sentence', useCase: 'Chill and travel content', differs: 'Closest: Word Stagger. Wave-shaped settle plus glow on the spoken word.',
  }),
  T('blur-to-sharp', 'Blur-to-Sharp', KINETIC, 'Letters resolve from blur to sharp one grapheme at a time; the spoken word turns accent.', { font: 'DM Sans', weight: 700, accent: '#FDE047' }, {
    layout: 'flow', reveal: 'letter', motion: 'blur', active: 'color',
    sample: 'Bring every letter into focus', useCase: 'Reveals and transitions', differs: 'Closest: Letter Drop. Blur-resolve per grapheme instead of drop, with accent active word.',
  }),

  // ───────────── 4. ADVANCED HIGHLIGHT & ANNOTATION ─────────────
  T('outline-to-fill', 'Outline-to-Fill', HILITE, 'Words start as hollow outlines and fill solid across their spoken duration, staying filled.', { font: 'Montserrat', weight: 900, casing: 'uppercase', accent: '#FFFFFF' }, {
    layout: 'flow', reveal: 'all', active: 'fill', face: 'outline', persist: true,
    sample: 'Fill the words as you speak them', useCase: 'Transparent-background talking heads', differs: 'Closest: Basic Outline (static). Outline fills progressively with speech.',
  }),
  T('circle-annotation', 'Circle Annotation', HILITE, 'A hand-drawn loop draws itself around the keyword when it is spoken.', { font: 'Poppins', weight: 800, accent: '#F43F5E' }, {
    layout: 'flow', keyword: 'longest', reveal: 'all', active: 'circle',
    sample: 'Remember this one important rule', useCase: 'Tutorials and explainers', differs: 'Closest: Basic Underline Draw (static underline). Animated SVG circle around the keyword.',
  }),
  T('marker-sweep', 'Marker Sweep', HILITE, 'A marker strip sweeps in behind the active word; spoken words keep a faded mark.', { font: 'Montserrat', weight: 800, casing: 'uppercase', accent: '#FDE047' }, {
    layout: 'flow', reveal: 'all', active: 'marker', persist: true, intro: 'curtain',
    sample: 'Highlight what really matters here', useCase: 'Study and productivity', differs: 'Closest: Basic Marker Highlight (marker never drawn). Real sweeping marker strip.',
  }),
  T('underline-draw-pro', 'Underline Draw', HILITE, 'Words fade in on their timestamps and an underline draws beneath each across its duration.', { font: 'Inter', weight: 700, accent: '#60A5FA' }, {
    layout: 'flow', reveal: 'word', motion: 'fade', active: 'underline',
    sample: 'Draw attention one word at a time', useCase: 'Clean explainers', differs: 'Closest: Basic Underline Draw (full static underline). Underline progresses with the spoken word.',
  }),
  T('travelling-word-box', 'Travelling Word Box', HILITE, 'Two-word lines rise in; a solid box follows the active word across lines.', { font: 'Poppins', weight: 800, accent: '#22D3EE' }, {
    layout: 'lines', lineWords: 2, reveal: 'line', motion: 'rise', active: 'box',
    sample: 'Follow the box across every line', useCase: 'Multi-line captions', differs: 'Closest: Travelling Highlight. Line-based layout and reveal; box travels between lines.',
  }),
  T('redaction-reveal', 'Redaction Reveal', HILITE, 'Black redaction bars cover every word and lift away as each word is spoken.', { font: 'Space Mono', weight: 700, casing: 'uppercase', accent: '#EF4444' }, {
    layout: 'flow', reveal: 'all', active: 'redact', intro: 'scan', introDuration: 0.6,
    sample: 'The truth was hidden all along', useCase: 'True crime and storytelling', differs: 'Closest: Basic Masked Wipe. Words are covered by bars that peel back on speech.',
  }),
  T('keyword-spotlight', 'Keyword Spotlight', HILITE, 'Three-word lines; once the keyword is spoken the rest of the caption dims around it.', { font: 'DM Sans', weight: 800, accent: '#FBBF24' }, {
    layout: 'lines', lineWords: 3, keyword: 'longest', reveal: 'all', active: 'spotlight', intro: 'fade',
    sample: 'Focus on the single most important idea', useCase: 'Lessons and key takeaways', differs: 'Closest: CTA Spotlight. Keyword chosen by length on multi-line layout, no pulse.',
  }),
  T('dual-highlight', 'Dual Highlight', HILITE, 'Keyword gets a solid accent chip; every other spoken word gets a secondary-colour underline.', { font: 'Inter', weight: 800, accent: '#FACC15', secondary: '#38BDF8' }, {
    layout: 'flow', keyword: 'longest', reveal: 'all', active: 'dual', frame: 'box',
    sample: 'Two kinds of emphasis working together', useCase: 'Explainers with a key term', differs: 'Closest: Basic Active Word. Two simultaneous highlight rules with different colours.',
  }),
  T('progress-rail', 'Progress Rail', HILITE, 'Boxed caption with a rail that fills over the caption duration and a dot that tracks the spoken word.', { font: 'Inter', weight: 700, accent: '#4ADE80' }, {
    layout: 'flow', reveal: 'all', active: 'color', frame: 'box', progress: 'rail',
    sample: 'Track progress through every sentence', useCase: 'Education and podcasts', differs: 'Closest: Basic Audio Waveform (nothing drawn). Real timing rail and word-position dot.',
  }),
  T('highlight-trail', 'Highlight Trail', HILITE, 'The active word sits in an accent box that leaves a short fading trail on the previous words.', { font: 'Poppins', weight: 800, accent: '#C084FC' }, {
    layout: 'flow', reveal: 'all', stagger: 0.04, motion: 'slide', active: 'trail',
    sample: 'Leave a trail behind every word', useCase: 'Fast-paced speech', differs: 'Closest: Travelling Highlight. Previous words keep a fading highlight instead of a sliding box.',
  }),

  // ───────────── 5. LAYERED & EXPERIMENTAL ─────────────
  T('echo-stack', 'Echo Stack', LAYERED, 'Two outlined echo copies spread out behind the caption on entrance; active word in accent.', { font: 'Anton', weight: 400, casing: 'uppercase', accent: '#F472B6' }, {
    layout: 'flow', reveal: 'all', active: 'color', layers: 'echo', intro: 'fade',
    sample: 'Say it again louder', useCase: 'Music and hype edits', differs: 'Closest: Basic Ghost Translucent (glow only). Real layered outlined copies.',
  }),
  T('shadow-offset-layers', 'Shadow Offset Layers', LAYERED, 'Stacked words with two solid colour layers offset behind for a 3D print look.', { font: 'Archivo Black', weight: 400, casing: 'uppercase', accent: '#F97316', secondary: '#7C3AED' }, {
    layout: 'stack', reveal: 'word', motion: 'rise', layers: 'offset',
    sample: 'Depth makes it pop', useCase: 'Retro and poster styles', differs: 'Closest: Basic Retro VHS (soft shadow). Two hard offset colour layers on a stacked layout.',
  }),
  T('split-ghost-layers', 'Split Ghost Layers', LAYERED, 'Translucent copies sit above-left and below-right while the main caption fades in word by word.', { font: 'Syne', weight: 800, accent: '#5EEAD4' }, {
    layout: 'flow', reveal: 'word', motion: 'fade', active: 'color', layers: 'split-ghost',
    sample: 'Echoes of every word you say', useCase: 'Atmospheric edits', differs: 'Closest: Echo Stack. Translucent fills in opposite directions rather than outlines.',
  }),
  T('sticker-cutouts', 'Sticker Cutouts', LAYERED, 'Each word is a die-cut sticker with its own tilt that springs on when spoken; the keyword sticker is accent.', { font: 'Rubik', weight: 900, accent: '#FDE047' }, {
    layout: 'flow', keyword: 'longest', reveal: 'word', motion: 'elastic', face: 'sticker',
    sample: 'Stick every word onto the screen', useCase: 'Lifestyle and vlogs', differs: 'Closest: Basic Word Box (chip not drawn). Per-word sticker containers with individual rotation.',
  }),
  T('floating-word-islands', 'Floating Word Islands', LAYERED, 'Two-word groups float as separate islands at offset positions, rising in group by group.', { font: 'Outfit', weight: 700, accent: '#93C5FD', bg: 'rgba(15,23,42,0.8)' }, {
    layout: 'islands', lineWords: 2, reveal: 'line', motion: 'rise', active: 'color',
    sample: 'Small ideas grouped together feel lighter', useCase: 'Conversational captions', differs: 'Closest: Basic Chip Style (chip not drawn). Separate floating containers per word group.',
  }),
  T('double-exposure-type', 'Double Exposure Type', LAYERED, 'Two tinted copies drift slightly apart behind the text using screen blending.', { font: 'Bebas Neue', weight: 400, size: 54, casing: 'uppercase', accent: '#F43F5E', secondary: '#06B6D4' }, {
    layout: 'flow', reveal: 'all', layers: 'double', intro: 'fade',
    sample: 'Two moments one frame', useCase: 'Music videos and fashion', differs: 'Closest: Basic Glitch (glow only). Drifting dual-tone blended copies.',
  }),
  T('frame-edge-typography', 'Frame Edge Typography', LAYERED, 'Left-aligned lines anchored to the frame edge with an accent rule; lines slide in.', { font: 'Space Grotesk', weight: 700, accent: '#FACC15', anchor: 'bottom-left', x: 8 }, {
    layout: 'edge', lineWords: 2, align: 'left', reveal: 'word', motion: 'slide', active: 'color',
    sample: 'Anchored to the edge of the frame', useCase: 'Documentary and interviews', differs: 'Closest: Basic Frame-Edge Docked Column (centered render). Real left anchoring and accent rule.',
  }),
  T('bracket-composition', 'Bracket Composition', LAYERED, 'Four corner brackets close in around the caption as it appears.', { font: 'Inter', weight: 800, casing: 'uppercase', accent: '#FFFFFF' }, {
    layout: 'flow', reveal: 'all', active: 'color', frame: 'brackets', intro: 'iris', introDuration: 0.6,
    sample: 'Frame the message clearly', useCase: 'Clean branded content', differs: 'Closest: Basic Square Bracket Frame (no brackets drawn). Animated corner brackets.',
  }),
  T('diagonal-word-flow', 'Diagonal Word Flow', LAYERED, 'Lines step diagonally across a tilted composition; words flow in from bottom-left.', { font: 'Montserrat', weight: 900, casing: 'uppercase', accent: '#A3E635' }, {
    layout: 'diagonal', lineWords: 2, reveal: 'word', motion: 'flow', active: 'color', tilt: -7,
    sample: 'Climb up the diagonal line', useCase: 'Sports and action edits', differs: 'Closest: Basic Vertical Side Margin. Stepped diagonal layout with diagonal word entrances.',
  }),
  T('experimental-scale-mix', 'Experimental Scale Mix', LAYERED, 'Alternating serif italics and heavy sans with a 1.9x keyword, words zooming in as spoken.', { font: 'Archivo Black', weight: 400, accent: '#FB7185' }, {
    layout: 'lines', lineWords: 3, keyword: 'longest', keywordStyle: { scale: 1.9, color: 'accent' }, alternate: { font: 'Playfair Display', italic: true, weight: 600, scale: 0.8 }, alternateBy: 'word', reveal: 'word', motion: 'zoom', active: 'color',
    sample: 'Break the rules but keep it readable', useCase: 'Creative and art content', differs: 'Closest: Mixed Weight. Combines font alternation, keyword scale and zoom entrances in one composition.',
  }),

  // ───────────── 6. CINEMATIC & EDITORIAL ─────────────
  T('rack-focus', 'Rack Focus', CINEMA, 'Unspoken words sit blurred and dim; each pulls into focus as it is spoken.', { font: 'Cormorant Garamond', weight: 600, size: 50, accent: '#F5E6C8', text: '#F5F1E8' }, {
    layout: 'flow', reveal: 'all', active: 'focus', intro: 'iris', introDuration: 0.8,
    sample: 'Some moments only make sense later', useCase: 'Cinematic storytelling', differs: 'Closest: Basic Cinematic Glow (glow only). Time-based focus pull per word.',
  }),
  T('cinematic-light-sweep', 'Cinematic Light Sweep', CINEMA, 'A band of light passes across the tracked-out title as it appears.', { font: 'Cinzel', weight: 700, casing: 'uppercase', accent: '#FCD34D', text: '#FDF6E3' }, {
    layout: 'flow', support: { tracking: 0.12 }, reveal: 'all', intro: 'sweep', introDuration: 1.1,
    sample: 'Chapter one the beginning', useCase: 'Trailers and openers', differs: 'Closest: Basic Film Title. Adds a time-based light sweep across the text.',
  }),
  T('film-title-reveal', 'Film Title Reveal', CINEMA, 'Small tracked kicker over a large serif title, revealed by a horizontal curtain.', { font: 'Playfair Display', weight: 700, accent: '#E5C07B', text: '#F8F4EA' }, {
    layout: 'split', splitAt: 0.35, zones: [{ scale: 0.45, tracking: 0.3, casing: 'upper', weight: 500, color: 'muted' }, { scale: 1.3, italic: true }], reveal: 'all', intro: 'curtain', introDuration: 0.9,
    sample: 'A story about finding home', useCase: 'Short films and vlogs', differs: 'Closest: Basic Letter Spacing Expansion. Two-tier title hierarchy with curtain reveal.',
  }),
  T('editorial-pull-quote', 'Editorial Pull Quote', CINEMA, 'Large quotation mark with three-word lines fading in; the spoken word takes the accent.', { font: 'Libre Baskerville', weight: 700, accent: '#F59E0B', text: '#FAFAF9' }, {
    layout: 'lines', lineWords: 3, reveal: 'line', motion: 'fade', active: 'color', frame: 'quote',
    sample: 'Talent is cheap but dedication is rare', useCase: 'Quotes and interviews', differs: 'Closest: Basic Editorial Column. Drawn quote mark and line-by-line quote structure.',
  }),
  T('magazine-headline', 'Magazine Headline', CINEMA, 'Justified block whose lines alternate heavy sans and italic serif, rising line by line.', { font: 'Anton', weight: 400, casing: 'uppercase', accent: '#F87171' }, {
    layout: 'justified', lineWords: 2, alternate: { font: 'Playfair Display', italic: true, weight: 700, casing: 'none' }, alternateBy: 'line', reveal: 'line', motion: 'rise',
    sample: 'The new rules of modern creativity', useCase: 'Fashion and editorial', differs: 'Closest: Justified Block. Mixed typefaces per line with line-rise reveal.',
  }),
  T('silent-emphasis', 'Silent Emphasis', CINEMA, 'Light, quiet typography; only the keyword turns italic accent, with no motion beyond a fade.', { font: 'Inter', weight: 300, accent: '#E2E8F0', text: '#CBD5E1' }, {
    layout: 'flow', keyword: 'longest', keywordStyle: { italic: true, weight: 600, color: 'accent', font: 'Fraunces' }, reveal: 'all', intro: 'fade',
    sample: 'Sometimes less really is more', useCase: 'Minimal and emotional content', differs: 'Closest: Basic Minimalist Italian Serif. Emphasis on one word through typeface change only.',
  }),
  T('dramatic-split-title', 'Dramatic Split Title', CINEMA, 'Huge upper-case first half above a small italic second half, opened by an iris.', { font: 'Bebas Neue', weight: 400, size: 56, accent: '#FCA5A5' }, {
    layout: 'split', splitAt: 0.5, zones: [{ scale: 1.5, casing: 'upper' }, { scale: 0.55, italic: true, font: 'Lora', color: 'accent' }], reveal: 'line', motion: 'zoom', intro: 'iris',
    sample: 'Everything changes tonight after midnight', useCase: 'Trailers and drama', differs: 'Closest: Film Title Reveal. Inverted hierarchy (large first) with iris opening.',
  }),
  T('cinematic-letterbox', 'Cinematic Letterbox Type', CINEMA, 'Full-width letterbox band with tracked type; active word lifts to accent.', { font: 'Cinzel', weight: 600, size: 40, casing: 'uppercase', accent: '#FDE68A' }, {
    layout: 'flow', support: { tracking: 0.15 }, reveal: 'word', motion: 'fade', active: 'color', frame: 'letterbox',
    sample: 'In a world without silence', useCase: 'Film-style subtitles', differs: 'Closest: Basic Film Title (no band). Real full-width letterbox band.',
  }),
  T('documentary-label', 'Documentary Label', CINEMA, 'First word becomes a small label tag; the caption fades in word by word with drawn underlines.', { font: 'Inter', weight: 600, accent: '#FBBF24' }, {
    layout: 'label', splitAt: 1, reveal: 'word', motion: 'fade', active: 'underline',
    sample: 'Location the northern coastline at dawn', useCase: 'Documentaries', differs: 'Closest: Warning Hook. Word-timed reveal and underline instead of bar and shake.',
  }),
  T('slow-reveal', 'Slow Reveal', CINEMA, 'Graphemes fade in slowly on two-word lines for measured storytelling.', { font: 'Lora', weight: 600, accent: '#E9D5FF', text: '#F5F3FF' }, {
    layout: 'lines', lineWords: 2, reveal: 'letter', motion: 'fade', motionDuration: 0.6,
    sample: 'Take your time with this moment', useCase: 'Narration and poetry', differs: 'Closest: Letter Drop. Gentle fade per grapheme on structured lines.',
  }),

  // ───────────── 7. CREATOR, PODCAST & DIALOGUE ─────────────
  T('chat-thread', 'Chat Thread', CREATOR, 'Caption chunks appear as message bubbles; earlier bubbles stack above and fade, sides alternate.', { font: 'Inter', weight: 600, size: 40, accent: '#3B82F6', bg: 'rgba(38,45,54,0.95)' }, {
    layout: 'thread', lineWords: 3, reveal: 'word', motion: 'fade',
    sample: 'Are you coming tonight Yes I will be there soon', useCase: 'Texting stories and dialogue', differs: 'Closest: Basic Speech Bubble (single, not drawn). Real stacking bubble history within a caption.',
  }),
  T('dual-speaker-contrast', 'Dual Speaker Contrast', CREATOR, 'Alternate lines switch to an italic accent treatment inside a speech bubble, sliding in.', { font: 'DM Sans', weight: 700, accent: '#F9A8D4', bg: 'rgba(17,24,39,0.85)' }, {
    layout: 'lines', lineWords: 3, alternate: { italic: true, color: 'accent' }, alternateBy: 'line', reveal: 'line', motion: 'slide', frame: 'bubble',
    sample: 'So what do you think Honestly it surprised me', useCase: 'Two-person conversations', differs: 'Closest: Basic Dual-Speaker Dialogue (uniform render). Visibly different treatment per alternating line. Uses no speaker names (none exist in the data).',
  }),
  T('podcast-quote', 'Podcast Quote', CREATOR, 'Caption sits on a card with an accent top rule; the active word gets a marker sweep.', { font: 'Manrope', weight: 800, accent: '#FDE047', bg: 'rgba(15,17,21,0.92)' }, {
    layout: 'flow', keyword: 'longest', reveal: 'all', active: 'marker', frame: 'card',
    sample: 'The best advice I ever got was simple', useCase: 'Podcast clips', differs: 'Closest: Basic Podcast Speaker Card (card never drawn). Real card plus marker sweep.',
  }),
  T('reaction-emphasis', 'Reaction Emphasis', CREATOR, 'The reaction word is enlarged and tilts into place with a glow on the active word.', { font: 'Rubik', weight: 900, accent: '#FB923C' }, {
    layout: 'flow', keyword: 'longest', keywordStyle: { scale: 1.5, color: 'accent' }, reveal: 'word', motion: 'zoom', active: 'glow', keywordFx: 'rotate',
    sample: 'Wait what that is insane', useCase: 'Reaction videos', differs: 'Closest: Question Punch. Rotating keyword and glow instead of pulse.',
  }),
  T('conversation-stack', 'Conversation Stack', CREATOR, 'Two-word lines rise into a rounded bubble, building a short stacked exchange.', { font: 'Outfit', weight: 700, accent: '#86EFAC', bg: 'rgba(17,24,39,0.85)' }, {
    layout: 'lines', lineWords: 2, reveal: 'line', motion: 'rise', active: 'color', frame: 'bubble',
    sample: 'Tell me more about that part', useCase: 'Interviews and Q&A', differs: 'Closest: Chat Thread. One bubble with stacked lines instead of separate message bubbles.',
  }),
  T('speaker-spotlight', 'Speaker Spotlight', CREATOR, 'Lower-third bar revealed by a curtain; the spoken word glows.', { font: 'Inter', weight: 700, accent: '#38BDF8', bg: 'rgba(8,10,14,0.88)' }, {
    layout: 'flow', reveal: 'all', active: 'glow', frame: 'bar', intro: 'curtain',
    sample: 'Here is what I learned building this', useCase: 'Talking heads', differs: 'Closest: Interview Lower Third. Curtain reveal and glow focus rather than word slide.',
  }),
  T('quote-card-motion', 'Quote Card Motion', CREATOR, 'Card with three-word lines that rise in, entering with an elastic pop.', { font: 'Lora', weight: 700, accent: '#FCA5A5', bg: 'rgba(24,24,27,0.92)' }, {
    layout: 'lines', lineWords: 3, reveal: 'line', motion: 'rise', frame: 'card', intro: 'elastic',
    sample: 'Done is better than perfect every time', useCase: 'Shareable quotes', differs: 'Closest: Podcast Quote. Multi-line structure and elastic card entrance.',
  }),
  T('call-and-response', 'Call-and-Response', CREATOR, 'Alternate lines switch to accent italics and arrive from alternating directions.', { font: 'Poppins', weight: 800, accent: '#FDE047' }, {
    layout: 'lines', lineWords: 3, alternate: { italic: true, color: 'accent', weight: 600 }, alternateBy: 'line', reveal: 'line', motion: 'alternate',
    sample: 'Are you ready Yes we are ready', useCase: 'Call-and-response moments', differs: 'Closest: Dual Speaker Contrast. Directional entrances without a bubble.',
  }),
  T('interview-lower-third', 'Interview Lower Third', CREATOR, 'Lower-third bar with words sliding in on their timestamps; no speaker name is invented.', { font: 'Inter', weight: 700, size: 40, accent: '#F97316', bg: 'rgba(10,12,16,0.9)', anchor: 'bottom-left', x: 6 }, {
    layout: 'flow', align: 'left', reveal: 'word', motion: 'slide', active: 'color', frame: 'bar', intro: 'fade',
    sample: 'We started with almost nothing', useCase: 'Interviews', differs: 'Closest: Basic Corporate Slate (bar not drawn). Real bar, left anchored, word slide.',
  }),
  T('social-reply', 'Social Reply Style', CREATOR, 'Compact reply bubble with a tail; words rise in as spoken.', { font: 'Inter', weight: 600, size: 38, accent: '#60A5FA', bg: 'rgba(38,45,54,0.95)' }, {
    layout: 'flow', reveal: 'word', motion: 'rise', active: 'color', frame: 'bubble',
    sample: 'Replying to your question about editing', useCase: 'Comment replies', differs: 'Closest: Conversation Stack. Single-line compact bubble with word reveal.',
  }),

  // ───────────── 8. NEWS, DATA & EDUCATION ─────────────
  T('broadcast-headline', 'Broadcast Headline', NEWS, 'First word as a label tag over a headline inside a bar; lines slide in.', { font: 'Oswald', weight: 700, casing: 'uppercase', accent: '#EF4444', bg: 'rgba(12,16,24,0.92)' }, {
    layout: 'label', splitAt: 1, reveal: 'line', motion: 'slide', frame: 'bar',
    sample: 'Update markets rally after the announcement', useCase: 'News recaps', differs: 'Closest: Warning Hook. Line slide reveal without active colour or shake.',
  }),
  T('financial-ticker-pro', 'Financial Ticker', NEWS, 'Monospace word chips slide in on a quick stagger like a ticker.', { font: 'Roboto Mono', weight: 700, size: 38, casing: 'uppercase', accent: '#22C55E', bg: 'rgba(5,10,8,0.85)' }, {
    layout: 'flow', face: 'chip', reveal: 'all', stagger: 0.05, motion: 'slide', active: 'color',
    sample: 'Revenue up 12 percent this quarter', useCase: 'Finance content', differs: 'Closest: Basic Financial Stock Ticker. Per-word chips with staggered slide.',
  }),
  T('sports-scorebug', 'Sports Scorebug', NEWS, 'Two-zone chip layout: small first part, large second part, entering from opposite sides.', { font: 'Teko', weight: 600, size: 52, casing: 'uppercase', accent: '#FACC15', bg: 'rgba(17,24,39,0.9)' }, {
    layout: 'split', splitAt: 0.5, zones: [{ scale: 0.7, color: 'muted' }, { scale: 1.2 }], face: 'chip', reveal: 'all', active: 'color', intro: 'split', frame: 'box',
    sample: 'Final quarter last chance to win', useCase: 'Sports commentary', differs: 'Closest: Split Scale. Chip faces and condensed sports typography.',
  }),
  T('number-explainer', 'Number Explainer', NEWS, 'Stacked layout where any number is set 2.2x; lines rise in as spoken.', { font: 'Barlow Condensed', weight: 800, accent: '#38BDF8' }, {
    layout: 'stack', keyword: 'numeric', keywordStyle: { scale: 2.2, color: 'accent' }, reveal: 'line', motion: 'rise',
    sample: 'Over 70 percent of people agree', useCase: 'Data explainers', differs: 'Closest: Number Shock. Vertical stack and calm rise instead of slam.',
  }),
  T('step-progress', 'Step Progress', NEWS, 'Three-word lines slide in with step dots showing which part of the caption is playing.', { font: 'Inter', weight: 700, accent: '#A78BFA' }, {
    layout: 'lines', lineWords: 3, reveal: 'line', motion: 'slide', active: 'color', progress: 'steps',
    sample: 'First open the app then tap settings and save', useCase: 'Tutorials and how-tos', differs: 'Closest: Basic Chapter Index (nothing drawn). Real step indicators tied to caption timing.',
  }),
  T('definition-highlight', 'Definition Highlight', NEWS, 'The first word is the term label on a card; the definition follows with dual highlighting.', { font: 'DM Sans', weight: 700, accent: '#FDE047', secondary: '#60A5FA', bg: 'rgba(15,23,42,0.9)' }, {
    layout: 'label', splitAt: 1, reveal: 'all', active: 'dual', keyword: 'longest', frame: 'card',
    sample: 'Inflation means prices rise over time', useCase: 'Education', differs: 'Closest: Documentary Label. Card frame and dual highlight instead of word reveal.',
  }),
  T('fact-card-motion', 'Fact Card Motion', NEWS, 'Fact sits on a card that slams in; any number is accent.', { font: 'Poppins', weight: 800, accent: '#34D399', bg: 'rgba(17,24,39,0.92)' }, {
    layout: 'flow', keyword: 'numeric', keywordStyle: { color: 'accent' }, reveal: 'all', active: 'color', frame: 'card', intro: 'slam',
    sample: 'Honey never spoils for 3000 years', useCase: 'Fun facts', differs: 'Closest: Podcast Quote. Slam entrance and numeric accent instead of marker.',
  }),
  T('timeline-marker', 'Timeline Marker', NEWS, 'Left-aligned lines beside a vertical timeline whose marker moves with caption progress.', { font: 'Inter', weight: 700, accent: '#F472B6', anchor: 'bottom-left', x: 10 }, {
    layout: 'lines', lineWords: 3, align: 'left', reveal: 'line', motion: 'fade', progress: 'timeline',
    sample: 'In 2019 it started and by 2023 it grew', useCase: 'History and timelines', differs: 'Closest: Step Progress. Vertical timeline marker driven by caption time.',
  }),
  T('news-bulletin', 'News Bulletin', NEWS, 'Two-word label tag over the bulletin text in a box; lines rise in.', { font: 'Roboto', weight: 700, accent: '#F59E0B', bg: 'rgba(10,12,16,0.88)' }, {
    layout: 'label', splitAt: 2, reveal: 'line', motion: 'rise', active: 'color', frame: 'box',
    sample: 'Breaking now the city announced new plans', useCase: 'Bulletins', differs: 'Closest: Broadcast Headline. Box frame, two-word label and rise motion.',
  }),
  T('educational-focus-rail', 'Educational Focus Rail', NEWS, 'Two-word lines rise in above a timing rail; spoken words underline progressively.', { font: 'Manrope', weight: 700, accent: '#22D3EE' }, {
    layout: 'lines', lineWords: 2, reveal: 'line', motion: 'rise', active: 'underline', progress: 'rail',
    sample: 'Photosynthesis turns light into energy', useCase: 'Lessons', differs: 'Closest: Progress Rail. Line reveal and underline instead of box and colour.',
  }),

  // ───────────── 9. GAMING, TECH & DIGITAL ─────────────
  T('terminal-reveal', 'Terminal Reveal', TECH, 'Monospace text types in grapheme by grapheme inside a dark terminal box.', { font: 'JetBrains Mono', weight: 700, size: 36, accent: '#4ADE80', text: '#D1FAE5', bg: 'rgba(3,7,5,0.9)' }, {
    layout: 'flow', align: 'left', reveal: 'letter', motion: 'fade', active: 'color', frame: 'box',
    sample: 'Initializing your next big project', useCase: 'Coding and tech', differs: 'Closest: Basic Code IDE Terminal (no box, no typing). Real per-character reveal in a box.',
  }),
  T('hud-corners', 'HUD Corners', TECH, 'Corner markers, a status tick and blinking indicator frame the caption, revealed by a scanline.', { font: 'Rajdhani', weight: 700, casing: 'uppercase', accent: '#22D3EE' }, {
    layout: 'flow', reveal: 'all', active: 'color', frame: 'hud', intro: 'scan',
    sample: 'Target acquired mission ready', useCase: 'Gaming and sci-fi', differs: 'Closest: Basic Tech HUD (HUD not drawn). Real corner frame and scan reveal.',
  }),
  T('pixel-drop', 'Pixel Drop', TECH, 'Pixel font words drop in on a grid backdrop as they are spoken.', { font: 'Press Start 2P', weight: 400, size: 26, casing: 'uppercase', accent: '#FDE047', bg: 'rgba(10,10,20,0.75)' }, {
    layout: 'flow', reveal: 'word', motion: 'drop', active: 'color', frame: 'grid',
    sample: 'Level up your game today', useCase: 'Retro gaming', differs: 'Closest: Basic Pixel (static). Word drops on a drawn grid.',
  }),
  T('glitch-slice', 'Glitch Slice', TECH, 'Deterministic glitch entrance with RGB split and stepped jitter, settling to clean text.', { font: 'Space Grotesk', weight: 700, casing: 'uppercase', accent: '#F0ABFC' }, {
    layout: 'flow', reveal: 'all', active: 'color', intro: 'glitch', introDuration: 0.6,
    sample: 'System override in progress', useCase: 'Tech and edgy edits', differs: 'Closest: Basic Glitch (entrance ignored). Real time-based RGB split and jitter.',
  }),
  T('scanline-reveal', 'Scanline Reveal', TECH, 'Text is revealed top-down behind a glowing scan bar and stays under moving scanlines.', { font: 'Share Tech Mono', weight: 400, size: 42, casing: 'uppercase', accent: '#67E8F9' }, {
    layout: 'flow', reveal: 'all', frame: 'scanlines', intro: 'scan', introDuration: 0.7,
    sample: 'Signal detected stand by', useCase: 'Sci-fi intros', differs: 'Closest: HUD Corners. Scanline texture and no active highlight.',
  }),
  T('digital-grid', 'Digital Grid', TECH, 'Two-word lines on a grid backdrop; words zoom in on their timestamps.', { font: 'Orbitron', weight: 700, size: 36, casing: 'uppercase', accent: '#818CF8', bg: 'rgba(8,10,24,0.7)' }, {
    layout: 'lines', lineWords: 2, reveal: 'word', motion: 'zoom', active: 'color', frame: 'grid',
    sample: 'Data drives every decision', useCase: 'Tech explainers', differs: 'Closest: Pixel Drop. Structured lines and zoom motion.',
  }),
  T('neon-trace', 'Neon Trace', TECH, 'Hollow neon outlines revealed by a curtain; the spoken word glows.', { font: 'Audiowide', weight: 400, casing: 'uppercase', accent: '#F472B6', text: '#F9A8D4' }, {
    layout: 'flow', face: 'outline', reveal: 'all', active: 'glow', intro: 'curtain',
    sample: 'Lights on the city at night', useCase: 'Nightlife and music', differs: 'Closest: Basic Neon Outline (static). Curtain trace and active glow.',
  }),
  T('system-alert', 'System Alert', TECH, 'First word becomes an alert label above a boxed message; words zoom in as spoken.', { font: 'Rajdhani', weight: 700, casing: 'uppercase', accent: '#F87171', bg: 'rgba(20,6,6,0.88)' }, {
    layout: 'label', splitAt: 1, reveal: 'word', motion: 'zoom', active: 'color', frame: 'box',
    sample: 'Alert battery level critically low', useCase: 'Gaming and tech warnings', differs: 'Closest: News Bulletin. Word-timed zoom with an alert-style label.',
  }),
  T('data-stream', 'Data Stream', TECH, 'Monospace three-word lines stream in on a fast stagger.', { font: 'Space Mono', weight: 700, size: 36, accent: '#2DD4BF' }, {
    layout: 'lines', lineWords: 3, reveal: 'all', stagger: 0.07, motion: 'slide', active: 'color',
    sample: 'Streaming every word in sequence now', useCase: 'Tech montages', differs: 'Closest: Financial Ticker. Multi-line stream without chips.',
  }),
  T('retro-crt', 'Retro CRT', TECH, 'Chromatic CRT text with scanlines and a gentle, readable flicker.', { font: 'VT323', weight: 400, size: 56, casing: 'uppercase', accent: '#FDE68A', text: '#E9FCE9' }, {
    layout: 'flow', reveal: 'all', active: 'color', frame: 'crt', intro: 'fade',
    sample: 'Rewind to the good old days', useCase: 'Retro and nostalgia', differs: 'Closest: Basic Retro VHS (shadow only). Chromatic split, scanlines and deterministic flicker.',
  }),

  // ───────────── 10. TRANSPARENT & CREATIVE ─────────────
  T('transparent-outline-fill', 'Transparent Outline Fill', CREATIVE, 'One outlined word per line rises in and fills solid as it is spoken; no background.', { font: 'Anton', weight: 400, size: 54, casing: 'uppercase', accent: '#FFFFFF' }, {
    layout: 'stack', face: 'outline', reveal: 'word', motion: 'rise', active: 'fill', persist: true,
    sample: 'See through every word', useCase: 'Clean overlays on busy footage', differs: 'Closest: Outline-to-Fill. Stacked one-word lines with word-timed entrance.',
  }),
  T('floating-marker', 'Floating Marker', CREATIVE, 'A slanted marker strip floats behind the line currently being spoken and glides between lines.', { font: 'Montserrat', weight: 800, accent: '#F472B6' }, {
    layout: 'lines', lineWords: 3, reveal: 'line', motion: 'fade', active: 'line-box',
    sample: 'Glide the marker along each line of text', useCase: 'Explainers with longer captions', differs: 'Closest: Marker Sweep (per word). Highlights whole lines and travels between them.',
  }),
  T('paper-annotation', 'Paper Annotation', CREATIVE, 'A hand-drawn wavy underline scribbles itself beneath the keyword.', { font: 'Kalam', weight: 700, size: 50, accent: '#F97316' }, {
    layout: 'flow', keyword: 'longest', reveal: 'word', motion: 'fade', active: 'scribble',
    sample: 'Write this down and keep it close', useCase: 'Journaling and study', differs: 'Closest: Circle Annotation. Wavy underline stroke instead of a loop.',
  }),
  T('rotating-word-accent', 'Rotating Word Accent', CREATIVE, 'Only the keyword switches to italic accent and rotates a few degrees into place.', { font: 'Poppins', weight: 800, accent: '#FDE047' }, {
    layout: 'flow', keyword: 'longest', keywordStyle: { italic: true, color: 'accent', font: 'Fraunces' }, reveal: 'all', keywordFx: 'rotate',
    sample: 'Add a little personality to it', useCase: 'Lifestyle captions', differs: 'Closest: Reaction Emphasis. No scale or glow; a single safe rotation on the keyword.',
  }),
  T('elastic-frame', 'Elastic Frame', CREATIVE, 'An outline frame springs open around the caption with elastic motion.', { font: 'Outfit', weight: 800, accent: '#5EEAD4' }, {
    layout: 'flow', reveal: 'all', active: 'color', frame: 'elastic', intro: 'elastic', introDuration: 0.8,
    sample: 'Stretch the frame around your words', useCase: 'Playful brand content', differs: 'Closest: Bracket Composition. A full elastic outline frame instead of corners.',
  }),
  T('mask-curtain', 'Mask Curtain', CREATIVE, 'Two-word lines revealed by a directional curtain mask; no other effect.', { font: 'Syne', weight: 800, accent: '#FCA5A5' }, {
    layout: 'lines', lineWords: 2, reveal: 'all', intro: 'curtain', introDuration: 0.7,
    sample: 'Pull back the curtain slowly', useCase: 'Reveals and transitions', differs: 'Closest: Condensed Impact. Pure curtain mask on uniform lines.',
  }),
  T('shape-reveal', 'Shape Reveal', CREATIVE, 'A diamond mask opens from the centre; words zoom in on their timestamps.', { font: 'Montserrat', weight: 900, casing: 'uppercase', accent: '#A78BFA' }, {
    layout: 'flow', reveal: 'word', motion: 'zoom', active: 'color', intro: 'shape', introDuration: 0.7,
    sample: 'Open up a new perspective', useCase: 'Creative intros', differs: 'Closest: Dramatic Split Title (iris). Diamond geometric mask with word zoom.',
  }),
  T('multi-line-cascade', 'Multi-Line Cascade', CREATIVE, 'Lines cascade in diagonally one after another as they are spoken.', { font: 'DM Sans', weight: 800, accent: '#FDBA74' }, {
    layout: 'lines', lineWords: 2, reveal: 'line', motion: 'flow',
    sample: 'Line after line the story unfolds', useCase: 'Narrative captions', differs: 'Closest: Diagonal Word Flow. Straight lines that cascade, no tilt or active colour.',
  }),
  T('split-reveal', 'Split Reveal', CREATIVE, 'Alternate lines slide in from opposite sides at the same time.', { font: 'Bebas Neue', weight: 400, size: 54, casing: 'uppercase', accent: '#38BDF8' }, {
    layout: 'lines', lineWords: 2, reveal: 'all', active: 'color', intro: 'split', introDuration: 0.6,
    sample: 'Two halves meet in the middle', useCase: 'Transitions and openers', differs: 'Closest: Split Scale. Uniform lines meeting from both sides without zone sizing.',
  }),
  T('adaptive-creative', 'Adaptive Creative Composition', CREATIVE, 'Ghosted keyword behind outlined lines that fill as spoken, with a scaled focal word.', { font: 'Archivo Black', weight: 400, casing: 'uppercase', accent: '#FFFFFF', secondary: '#F472B6' }, {
    layout: 'lines', lineWords: 2, keyword: 'longest', keywordStyle: { scale: 1.6 }, face: 'outline', reveal: 'all', active: 'fill', persist: true, layers: 'ghost-word', intro: 'fade',
    sample: 'Design that adapts to every story', useCase: 'Signature creative captions', differs: 'Closest: Oversized Ghost Word. Combines outline fill, focal scale and ghost layer.',
  }),
];
