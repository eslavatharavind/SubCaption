export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | '4:3' | '21:9';

export type TemplateCategory =
  | 'All'
  | 'Clean'
  | 'Minimal'
  | 'Bold'
  | 'Modern'
  | 'Cinematic'
  | 'Social'
  | 'News'
  | 'Podcast'
  | 'Education'
  | 'Tech'
  | 'Gaming'
  | 'Meme'
  | 'Karaoke'
  | 'Active Word'
  | 'Highlight'
  | 'Keyword Highlight'
  | 'Neon'
  | 'Glow'
  | 'Outline'
  | 'Kinetic'
  | 'Typewriter'
  | 'Multi-line'
  | 'Big Word'
  | 'Split Layout'
  | 'Word Stack'
  | 'Underline'
  | 'Gradient'
  | 'Side Layout'
  | 'Creative'
  | AdvancedCategory;

/** Categories of the separate Advanced template library (10 x 10 templates). */
export type AdvancedCategory =
  | 'Viral Hooks'
  | 'Mixed Typography & Scale'
  | 'Kinetic Word & Letter Motion'
  | 'Advanced Highlight & Annotation'
  | 'Layered & Experimental'
  | 'Cinematic & Editorial'
  | 'Creator, Podcast & Dialogue'
  | 'News, Data & Education'
  | 'Gaming, Tech & Digital'
  | 'Transparent & Creative';

export type AdvLayout = 'flow' | 'stack' | 'lines' | 'split' | 'label' | 'justified' | 'diagonal' | 'offset' | 'islands' | 'thread' | 'edge';
export type AdvReveal = 'all' | 'word' | 'letter' | 'line';
export type AdvMotion = 'none' | 'fade' | 'drop' | 'rise' | 'slide' | 'alternate' | 'elastic' | 'stomp' | 'wave' | 'blur' | 'zoom' | 'rotate' | 'slam' | 'flow';
export type AdvActive =
  | 'none' | 'color' | 'scale' | 'box' | 'line-box' | 'marker' | 'underline' | 'fill' | 'circle' | 'scribble'
  | 'redact' | 'trail' | 'spotlight' | 'focus' | 'glow' | 'dual';
export type AdvFace = 'solid' | 'outline' | 'sticker' | 'chip';
export type AdvLayers = 'none' | 'echo' | 'offset' | 'ghost-word' | 'double' | 'split-ghost';
export type AdvFrame = 'none' | 'box' | 'card' | 'bubble' | 'bar' | 'brackets' | 'hud' | 'elastic' | 'letterbox' | 'grid' | 'scanlines' | 'crt' | 'quote';
export type AdvProgress = 'none' | 'rail' | 'steps' | 'timeline';
export type AdvIntro = 'none' | 'fade' | 'slam' | 'curtain' | 'iris' | 'shape' | 'split' | 'scan' | 'glitch' | 'sweep' | 'elastic' | 'shake';
export type AdvKeywordFx = 'none' | 'shake' | 'pulse' | 'rotate' | 'slam';

export interface AdvTextStyle {
  scale?: number;
  font?: string;
  weight?: number;
  italic?: boolean;
  casing?: 'upper' | 'lower' | 'none';
  color?: 'text' | 'accent' | 'secondary' | 'muted';
  opacity?: number;
  tracking?: number; // em
  strike?: boolean;
}

/**
 * Opt-in configuration for Advanced templates. Only templates that define `advanced`
 * are rendered by AdvancedCaptionRenderer; Basic templates never read these fields.
 */
export interface AdvancedSpec {
  layout: AdvLayout;
  lineWords?: number;
  splitAt?: number;
  align?: 'center' | 'left' | 'right';
  keyword?: 'none' | 'longest' | 'numeric' | 'first' | 'last' | 'question' | 'alternate';
  keywordStyle?: AdvTextStyle;
  support?: AdvTextStyle;
  zones?: [AdvTextStyle, AdvTextStyle];
  alternate?: AdvTextStyle;
  alternateBy?: 'word' | 'line';
  reveal: AdvReveal;
  motion?: AdvMotion;
  motionDuration?: number;
  stagger?: number;
  active?: AdvActive;
  persist?: boolean;
  face?: AdvFace;
  layers?: AdvLayers;
  frame?: AdvFrame;
  progress?: AdvProgress;
  intro?: AdvIntro;
  introDuration?: number;
  keywordFx?: AdvKeywordFx;
  tilt?: number;
  /** English sample line used by gallery previews to show the defining feature. */
  sample: string;
  /** Short note on the closest related template and how this one differs. */
  differs: string;
  useCase: string;
}

export type TextLayoutMode =
  | 'single-line'
  | 'two-line'
  | 'multi-line'
  | 'big-keyword'
  | 'word-stack'
  | 'phrase-focus'
  | 'split-layout'
  | 'side-layout'
  | 'news-headline'
  | 'kinetic-stack'
  | 'label-headline'
  | 'mixed-scale'
  | 'standard';

export type BackgroundTreatment =
  | 'none'
  | 'transparent'
  | 'solid'
  | 'solid-box'
  | 'rounded-box'
  | 'pill'
  | 'chip'
  | 'plate'
  | 'glass'
  | 'underline-bar'
  | 'marker'
  | 'brush'
  | 'slanted-banner'
  | 'HUD'
  | 'bubble'
  | 'semi-transparent'
  | 'highlight-strip'
  | 'gradient'
  | 'blur'
  | 'underline'
  | 'glow'
  | 'shadow-only'
  | 'outline-only';

export type HighlightMode =
  | 'none'
  | 'active-word'
  | 'word'
  | 'phrase'
  | 'keyword'
  | 'one-keyword'
  | 'underline'
  | 'background-box'
  | 'color-change'
  | 'color-switch'
  | 'scale'
  | 'bounce'
  | 'multi-color'
  | 'marker'
  | 'word-box';

export type EntranceAnimation =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale'
  | 'pop'
  | 'bounce'
  | 'blur-to-sharp'
  | 'wipe'
  | 'typewriter'
  | 'underline-draw'
  | 'glitch';

export type WordAnimationBehavior =
  | 'none'
  | 'word-by-word'
  | 'active-word'
  | 'karaoke'
  | 'pop-word'
  | 'scale-word'
  | 'bounce-word';

export type CharacterAnimationBehavior =
  | 'none'
  | 'character-by-character'
  | 'typing'
  | 'letter-reveal'
  | 'letter-spacing-reveal';

export type ExitAnimation =
  | 'none'
  | 'fade-out'
  | 'slide-out'
  | 'scale-out';

export type AnchorPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'middle-left'
  | 'middle-right';

export interface TypographyConfig {
  fontFamily: string;
  secondaryFontFamily?: string;
  fontWeight: number;
  secondaryWeight?: number;
  fontSize: number; // base size in px
  italic?: boolean;
  underline?: boolean;
  letterSpacing?: number; // letter spacing in px
  lineHeight?: number; // multiplier e.g. 1.25
  textOpacity?: number; // 0.0 to 1.0
  textAlign?: 'left' | 'center' | 'right';
  textCasing?: 'uppercase' | 'lowercase' | 'capitalize' | 'normal' | 'none';
}

export interface LayoutConfig {
  textLayout?: TextLayoutMode;
  lineBreakStrategy?: 'balance' | 'words-per-line' | 'strict-width' | 'single-word-lines';
  maxCaptionWidth?: number; // in % of canvas width
  maxLines?: number;
  textAlignment?: 'left' | 'center' | 'right';
  paddingX?: number; // in px
  paddingY?: number; // in px
  lineSpacing?: number; // in px
}

export interface ColorsConfig {
  primaryTextColor: string;
  secondaryTextColor?: string;
  highlightColor: string;
  multipleHighlightColors?: string[];
  gradientWaveColors?: string[];
  accentColor?: string;
  opacity?: number;
}

export interface BackgroundConfig {
  type: BackgroundTreatment;
  containerScope?: 'caption' | 'line' | 'word' | 'keyword';
  color?: string; // hex or rgba
  gradient?: string; // e.g. 'linear-gradient(135deg, #FF007A 0%, #7928CA 100%)'
  blurAmount?: number; // in px
  borderRadius?: number; // in px
  containerPaddingX?: number;
  containerPaddingY?: number;
  opacity?: number;
}

export interface StrokeConfig {
  enabled: boolean;
  width?: number; // in px
  color?: string;
  level?: 'thin' | 'medium' | 'heavy';
}

export interface ShadowConfig {
  enabled: boolean;
  color?: string;
  opacity?: number;
  blur?: number; // in px
  distance?: number; // in px
  angle?: number; // in deg
}

export interface GlowConfig {
  enabled: boolean;
  color?: string;
  intensity?: number;
  blur?: number;
  opacity?: number;
}

export interface HighlightConfig {
  mode: HighlightMode;
  highlightColors?: string[];
  boxColor?: string;
  underlineColor?: string;
  scaleFactor?: number;
  keywordRule?: 'first' | 'last' | 'longest' | 'all-capital' | 'middle' | 'alternating';
}

export interface AnimationConfig {
  entrance: EntranceAnimation;
  wordBehavior: WordAnimationBehavior;
  characterBehavior: CharacterAnimationBehavior;
  exit?: ExitAnimation;
  durationSeconds?: number;
}

export interface PositionConfig {
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  anchor: AnchorPosition;
}

export interface TransformConfig {
  scale?: number;
  rotation?: number; // in deg
  opacity?: number;
}

export interface SpacingConfig {
  horizontalPadding?: number;
  verticalPadding?: number;
  lineSpacing?: number;
}

export interface TemplateConfig {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  tag?: string;

  supportedAspectRatios?: AspectRatio[];

  // Component Primitives
  typography?: TypographyConfig;
  layout?: LayoutConfig;
  colors?: ColorsConfig;
  background?: BackgroundConfig | any;
  stroke?: StrokeConfig | any;
  shadow?: ShadowConfig | any;
  glow?: GlowConfig | any;
  highlight?: HighlightConfig | any;
  animation?: AnimationConfig | any;
  position?: PositionConfig | any;
  transform?: TransformConfig;
  spacing?: SpacingConfig;

  // Additional options
  textLayout?: TextLayoutMode;
  backgroundTreatment?: BackgroundTreatment;
  container?: { type?: BackgroundTreatment; color?: string; borderRadius?: number; paddingX?: number; paddingY?: number } | any;
  highlightMode?: HighlightMode;
  revealMode?: 'word' | 'phrase' | 'line' | 'all';
  revealBehavior?: string;
  speakerName?: string;
  showCursor?: boolean;
  newsCategoryLabel?: string;
  underline?: boolean;
  underlineColor?: string;
  borderRadius?: number;

  // Backward compatibility flat fields
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textColor?: string;
  highlightColor?: string;
  accentColor?: string;
  strokeWidth?: number;
  strokeColor?: string;
  shadowBlur?: number;
  shadowColor?: string;
  glowColor?: string;

  /** Present only on Advanced-library templates. */
  advanced?: AdvancedSpec;

  // Future AI subject aware architecture hook (disabled)
  layerStack?: 'standard' | 'behind-subject' | 'foreground-subject';
  isSubjectAware?: boolean;
}
