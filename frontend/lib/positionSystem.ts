import { PositionData, PresetPositionName } from '@/types/caption';
import { TemplateConfig, AspectRatio } from '@/types/template';

/**
 * Normalized Quick Position Presets
 * Safe-zone aware normalized coordinates (0.0 to 1.0)
 */
export interface PositionPresetConfig {
  id: PresetPositionName;
  label: string;
  x: number;
  y: number;
  anchorX: 'left' | 'center' | 'right';
  anchorY: 'top' | 'center' | 'bottom';
  row: 'top' | 'middle' | 'bottom';
}

export const POSITION_PRESETS: PositionPresetConfig[] = [
  // TOP ROW
  {
    id: 'top-left',
    label: 'Top Left',
    x: 0.08,
    y: 0.10,
    anchorX: 'left',
    anchorY: 'top',
    row: 'top',
  },
  {
    id: 'top-center',
    label: 'Top Center',
    x: 0.50,
    y: 0.10,
    anchorX: 'center',
    anchorY: 'top',
    row: 'top',
  },
  {
    id: 'top-right',
    label: 'Top Right',
    x: 0.92,
    y: 0.10,
    anchorX: 'right',
    anchorY: 'top',
    row: 'top',
  },
  // MIDDLE ROW
  {
    id: 'center-left',
    label: 'Center Left',
    x: 0.08,
    y: 0.50,
    anchorX: 'left',
    anchorY: 'center',
    row: 'middle',
  },
  {
    id: 'center',
    label: 'Center',
    x: 0.50,
    y: 0.50,
    anchorX: 'center',
    anchorY: 'center',
    row: 'middle',
  },
  {
    id: 'center-right',
    label: 'Center Right',
    x: 0.92,
    y: 0.50,
    anchorX: 'right',
    anchorY: 'center',
    row: 'middle',
  },
  // BOTTOM ROW
  {
    id: 'bottom-left',
    label: 'Bottom Left',
    x: 0.08,
    y: 0.88,
    anchorX: 'left',
    anchorY: 'bottom',
    row: 'bottom',
  },
  {
    id: 'bottom-center',
    label: 'Bottom Center',
    x: 0.50,
    y: 0.88,
    anchorX: 'center',
    anchorY: 'bottom',
    row: 'bottom',
  },
  {
    id: 'bottom-right',
    label: 'Bottom Right',
    x: 0.92,
    y: 0.88,
    anchorX: 'right',
    anchorY: 'bottom',
    row: 'bottom',
  },
];

export const SAFE_ZONES = {
  top: 0.10,
  bottom: 0.88,
  left: 0.08,
  right: 0.92,
  centerH: 0.50,
  centerV: 0.50,
};

/**
 * Normalizes preset identifier to standard PresetPositionName
 */
export function normalizePresetName(name?: string | null): PresetPositionName | null {
  if (!name) return null;
  if (name === 'middle-left') return 'center-left';
  if (name === 'middle-right') return 'center-right';
  const match = POSITION_PRESETS.find((p) => p.id === name);
  return match ? match.id : null;
}

/**
 * Resolves full position coordinates, anchors, and CSS transform
 * Architecture hierarchy:
 * 1. Word / Phrase Position Override
 * 2. Caption Position Override (posData.custom or explicit x/y)
 * 3. Caption Preset (posData.position)
 * 4. Template Position
 * 5. Default Fallback (bottom-center)
 */
export interface ResolvedPosition {
  x: number; // 0.0 - 1.0
  y: number; // 0.0 - 1.0
  anchorX: 'left' | 'center' | 'right';
  anchorY: 'top' | 'center' | 'bottom';
  transform: string;
  preset?: PresetPositionName;
  custom?: boolean;
}

export function resolvePosition(
  posData?: Partial<PositionData> | null,
  templateConfig?: TemplateConfig | null
): ResolvedPosition {
  // 1. Explicit normalized coordinates in segment posData
  if (posData?.x !== undefined && posData?.y !== undefined) {
    const rawX = Math.max(0.02, Math.min(0.98, Number(posData.x)));
    const rawY = Math.max(0.02, Math.min(0.98, Number(posData.y)));

    const anchorX = posData.anchorX || (rawX < 0.35 ? 'left' : rawX > 0.65 ? 'right' : 'center');
    const anchorY = posData.anchorY || (rawY < 0.35 ? 'top' : rawY > 0.65 ? 'bottom' : 'center');

    const transX = anchorX === 'left' ? '0%' : anchorX === 'right' ? '-100%' : '-50%';
    const transY = anchorY === 'top' ? '0%' : anchorY === 'bottom' ? '-100%' : '-50%';

    return {
      x: rawX,
      y: rawY,
      anchorX,
      anchorY,
      transform: `translate(${transX}, ${transY})`,
      preset: normalizePresetName(posData.preset || posData.position) || undefined,
      custom: posData.custom ?? true,
    };
  }

  // 2. Preset in posData
  const presetKey = normalizePresetName(posData?.position || posData?.preset);
  if (presetKey) {
    const preset = POSITION_PRESETS.find((p) => p.id === presetKey) || POSITION_PRESETS[7];
    const transX = preset.anchorX === 'left' ? '0%' : preset.anchorX === 'right' ? '-100%' : '-50%';
    const transY = preset.anchorY === 'top' ? '0%' : preset.anchorY === 'bottom' ? '-100%' : '-50%';
    return {
      x: preset.x,
      y: preset.y,
      anchorX: preset.anchorX,
      anchorY: preset.anchorY,
      transform: `translate(${transX}, ${transY})`,
      preset: preset.id,
      custom: false,
    };
  }

  // 3. Template Position fallback
  if (templateConfig?.position) {
    const tp = templateConfig.position;
    if (tp.x !== undefined && tp.y !== undefined) {
      const px = tp.x > 1 ? tp.x / 100 : tp.x;
      const py = tp.y > 1 ? tp.y / 100 : tp.y;
      const ax: 'left' | 'center' | 'right' = tp.anchor?.includes('left')
        ? 'left'
        : tp.anchor?.includes('right')
        ? 'right'
        : 'center';
      const ay: 'top' | 'center' | 'bottom' = tp.anchor?.includes('top')
        ? 'top'
        : tp.anchor?.includes('bottom')
        ? 'bottom'
        : 'center';

      const transX = ax === 'left' ? '0%' : ax === 'right' ? '-100%' : '-50%';
      const transY = ay === 'top' ? '0%' : ay === 'bottom' ? '-100%' : '-50%';
      return {
        x: px,
        y: py,
        anchorX: ax,
        anchorY: ay,
        transform: `translate(${transX}, ${transY})`,
        custom: false,
      };
    }

    if (tp.anchor) {
      const tPresetKey = normalizePresetName(tp.anchor);
      if (tPresetKey) {
        const preset = POSITION_PRESETS.find((p) => p.id === tPresetKey) || POSITION_PRESETS[7];
        const transX = preset.anchorX === 'left' ? '0%' : preset.anchorX === 'right' ? '-100%' : '-50%';
        const transY = preset.anchorY === 'top' ? '0%' : preset.anchorY === 'bottom' ? '-100%' : '-50%';
        return {
          x: preset.x,
          y: preset.y,
          anchorX: preset.anchorX,
          anchorY: preset.anchorY,
          transform: `translate(${transX}, ${transY})`,
          preset: preset.id,
          custom: false,
        };
      }
    }
  }

  // 4. Default Fallback: Bottom Center
  const def = POSITION_PRESETS[7]; // bottom-center
  return {
    x: def.x,
    y: def.y,
    anchorX: def.anchorX,
    anchorY: def.anchorY,
    transform: 'translate(-50%, -100%)',
    preset: 'bottom-center',
    custom: false,
  };
}

/**
 * Intelligent Snapping Calculation
 * Snaps to Center Horizontal/Vertical and Platform Safe Zones
 */
export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: {
    centerH: boolean;
    centerV: boolean;
    topSafe: boolean;
    bottomSafe: boolean;
    leftSafe: boolean;
    rightSafe: boolean;
  };
}

export function computeSnap(
  rawX: number,
  rawY: number,
  enableSafeZones: boolean = true,
  threshold: number = 0.025
): SnapResult {
  let x = Math.max(0.02, Math.min(0.98, rawX));
  let y = Math.max(0.02, Math.min(0.98, rawY));

  let snappedX = false;
  let snappedY = false;

  const guides = {
    centerH: false,
    centerV: false,
    topSafe: false,
    bottomSafe: false,
    leftSafe: false,
    rightSafe: false,
  };

  // Center Snapping (Primary)
  if (Math.abs(x - SAFE_ZONES.centerH) < threshold) {
    x = SAFE_ZONES.centerH;
    snappedX = true;
    guides.centerH = true;
  }
  if (Math.abs(y - SAFE_ZONES.centerV) < threshold) {
    y = SAFE_ZONES.centerV;
    snappedY = true;
    guides.centerV = true;
  }

  // Safe Zone Snapping
  if (enableSafeZones) {
    if (!snappedX) {
      if (Math.abs(x - SAFE_ZONES.left) < threshold) {
        x = SAFE_ZONES.left;
        snappedX = true;
        guides.leftSafe = true;
      } else if (Math.abs(x - SAFE_ZONES.right) < threshold) {
        x = SAFE_ZONES.right;
        snappedX = true;
        guides.rightSafe = true;
      }
    }

    if (!snappedY) {
      if (Math.abs(y - SAFE_ZONES.top) < threshold) {
        y = SAFE_ZONES.top;
        snappedY = true;
        guides.topSafe = true;
      } else if (Math.abs(y - SAFE_ZONES.bottom) < threshold) {
        y = SAFE_ZONES.bottom;
        snappedY = true;
        guides.bottomSafe = true;
      }
    }
  }

  return {
    x: Number(x.toFixed(4)),
    y: Number(y.toFixed(4)),
    snappedX,
    snappedY,
    guides,
  };
}

/**
 * Maps anchor alignment to ASS subtitle numeric alignment (1 - 9)
 * Numpad alignment:
 * 7: top-left    8: top-center    9: top-right
 * 4: mid-left    5: center        6: mid-right
 * 1: bot-left    2: bot-center    3: bot-right
 */
export function getAssAlignment(anchorX: string = 'center', anchorY: string = 'bottom'): number {
  if (anchorY === 'top') {
    if (anchorX === 'left') return 7;
    if (anchorX === 'right') return 9;
    return 8;
  }
  if (anchorY === 'center') {
    if (anchorX === 'left') return 4;
    if (anchorX === 'right') return 6;
    return 5;
  }
  // bottom
  if (anchorX === 'left') return 1;
  if (anchorX === 'right') return 3;
  return 2;
}

export const SUPPORTED_ASPECT_RATIOS: { id: AspectRatio; ratio: number; label: string }[] = [
  { id: '9:16', ratio: 9 / 16, label: '9:16 (Vertical)' },
  { id: '4:5', ratio: 4 / 5, label: '4:5 (Social)' },
  { id: '1:1', ratio: 1 / 1, label: '1:1 (Square)' },
  { id: '4:3', ratio: 4 / 3, label: '4:3 (Standard)' },
  { id: '16:9', ratio: 16 / 9, label: '16:9 (Landscape)' },
  { id: '21:9', ratio: 21 / 9, label: '21:9 (Ultrawide)' },
];

/**
 * Detect closest supported aspect ratio from actual video width & height.
 * Uses tolerance-based distance comparison so encoding discrepancies don't break mapping.
 */
export function detectClosestAspectRatio(width?: number, height?: number): AspectRatio {
  if (!width || !height || width <= 0 || height <= 0) {
    return '9:16';
  }
  const actualRatio = width / height;
  let closest: AspectRatio = '9:16';
  let minDiff = Infinity;
  for (const item of SUPPORTED_ASPECT_RATIOS) {
    const diff = Math.abs(actualRatio - item.ratio);
    if (diff < minDiff) {
      minDiff = diff;
      closest = item.id;
    }
  }
  return closest;
}
