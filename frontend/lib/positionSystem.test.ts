import { describe, test, expect } from 'vitest';
import {
  POSITION_PRESETS,
  SAFE_ZONES,
  resolvePosition,
  computeSnap,
  getAssAlignment,
  normalizePresetName,
} from './positionSystem';
import { PositionData } from '@/types/caption';
import { TemplateConfig } from '@/types/template';

describe('POSITION SYSTEM — UNIT TESTS', () => {
  describe('1. Presets Configuration', () => {
    test('contains all 9 canonical presets with valid normalized coordinates (0.0–1.0)', () => {
      expect(POSITION_PRESETS).toHaveLength(9);

      const expectedIds = [
        'top-left',
        'top-center',
        'top-right',
        'center-left',
        'center',
        'center-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ];

      expectedIds.forEach((id) => {
        const preset = POSITION_PRESETS.find((p) => p.id === id);
        expect(preset).toBeDefined();
        expect(preset!.x).toBeGreaterThanOrEqual(0.0);
        expect(preset!.x).toBeLessThanOrEqual(1.0);
        expect(preset!.y).toBeGreaterThanOrEqual(0.0);
        expect(preset!.y).toBeLessThanOrEqual(1.0);
      });
    });

    test('verifies normalized coordinates for Top, Center, and Bottom presets', () => {
      const topLeft = POSITION_PRESETS.find((p) => p.id === 'top-left')!;
      expect(topLeft.x).toBe(0.08);
      expect(topLeft.y).toBe(0.10);
      expect(topLeft.anchorX).toBe('left');
      expect(topLeft.anchorY).toBe('top');

      const center = POSITION_PRESETS.find((p) => p.id === 'center')!;
      expect(center.x).toBe(0.50);
      expect(center.y).toBe(0.50);
      expect(center.anchorX).toBe('center');
      expect(center.anchorY).toBe('center');

      const bottomCenter = POSITION_PRESETS.find((p) => p.id === 'bottom-center')!;
      expect(bottomCenter.x).toBe(0.50);
      expect(bottomCenter.y).toBe(0.88);
      expect(bottomCenter.anchorX).toBe('center');
      expect(bottomCenter.anchorY).toBe('bottom');

      const bottomRight = POSITION_PRESETS.find((p) => p.id === 'bottom-right')!;
      expect(bottomRight.x).toBe(0.92);
      expect(bottomRight.y).toBe(0.88);
      expect(bottomRight.anchorX).toBe('right');
      expect(bottomRight.anchorY).toBe('bottom');
    });

    test('normalizes legacy preset aliases (middle-left -> center-left, middle-right -> center-right)', () => {
      expect(normalizePresetName('middle-left')).toBe('center-left');
      expect(normalizePresetName('middle-right')).toBe('center-right');
      expect(normalizePresetName('bottom-center')).toBe('bottom-center');
      expect(normalizePresetName('non-existent')).toBeNull();
    });
  });

  describe('2. Position Resolution & Hierarchy', () => {
    test('resolves explicit custom normalized x/y coordinates over presets', () => {
      const posData: Partial<PositionData> = {
        x: 0.73,
        y: 0.81,
        anchorX: 'right',
        anchorY: 'bottom',
        custom: true,
      };

      const resolved = resolvePosition(posData);
      expect(resolved.x).toBe(0.73);
      expect(resolved.y).toBe(0.81);
      expect(resolved.anchorX).toBe('right');
      expect(resolved.anchorY).toBe('bottom');
      expect(resolved.transform).toBe('translate(-100%, -100%)');
    });

    test('resolves preset name when custom x/y are absent', () => {
      const posData: Partial<PositionData> = {
        position: 'top-right',
      };

      const resolved = resolvePosition(posData);
      expect(resolved.x).toBe(0.92);
      expect(resolved.y).toBe(0.10);
      expect(resolved.anchorX).toBe('right');
      expect(resolved.anchorY).toBe('top');
      expect(resolved.transform).toBe('translate(-100%, 0%)');
    });

    test('falls back to template position when segment posData is empty', () => {
      const templateConfig: TemplateConfig = {
        id: 'test-template',
        name: 'Test Template',
        category: 'Clean',
        description: 'Test',
        position: {
          x: 50,
          y: 20,
          anchor: 'top-center',
        },
      };

      const resolved = resolvePosition(null, templateConfig);
      expect(resolved.x).toBe(0.50);
      expect(resolved.y).toBe(0.20);
      expect(resolved.anchorX).toBe('center');
      expect(resolved.anchorY).toBe('top');
      expect(resolved.transform).toBe('translate(-50%, 0%)');
    });

    test('falls back to bottom-center default when neither segment nor template provides position', () => {
      const resolved = resolvePosition(null, null);
      expect(resolved.x).toBe(0.50);
      expect(resolved.y).toBe(0.88);
      expect(resolved.anchorX).toBe('center');
      expect(resolved.anchorY).toBe('bottom');
      expect(resolved.transform).toBe('translate(-50%, -100%)');
    });
  });

  describe('3. Intelligent Soft Snapping', () => {
    test('snaps softly to Center Horizontal (x = 0.50) when within threshold', () => {
      const result = computeSnap(0.515, 0.70);
      expect(result.x).toBe(0.50);
      expect(result.snappedX).toBe(true);
      expect(result.guides.centerH).toBe(true);
      expect(result.y).toBe(0.70);
      expect(result.snappedY).toBe(false);
    });

    test('snaps softly to Center Vertical (y = 0.50) when within threshold', () => {
      const result = computeSnap(0.30, 0.49);
      expect(result.x).toBe(0.30);
      expect(result.snappedX).toBe(false);
      expect(result.y).toBe(0.50);
      expect(result.snappedY).toBe(true);
      expect(result.guides.centerV).toBe(true);
    });

    test('snaps softly to Platform Safe Zones (top: 0.10, bottom: 0.88, left: 0.08, right: 0.92)', () => {
      const topSnap = computeSnap(0.30, 0.11);
      expect(topSnap.y).toBe(SAFE_ZONES.top);
      expect(topSnap.guides.topSafe).toBe(true);

      const bottomSnap = computeSnap(0.30, 0.87);
      expect(bottomSnap.y).toBe(SAFE_ZONES.bottom);
      expect(bottomSnap.guides.bottomSafe).toBe(true);

      const leftSnap = computeSnap(0.09, 0.30);
      expect(leftSnap.x).toBe(SAFE_ZONES.left);
      expect(leftSnap.guides.leftSafe).toBe(true);

      const rightSnap = computeSnap(0.93, 0.30);
      expect(rightSnap.x).toBe(SAFE_ZONES.right);
      expect(rightSnap.guides.rightSafe).toBe(true);
    });

    test('allows free dragging when outside threshold without aggressive snapping', () => {
      const result = computeSnap(0.35, 0.65);
      expect(result.x).toBe(0.35);
      expect(result.y).toBe(0.65);
      expect(result.snappedX).toBe(false);
      expect(result.snappedY).toBe(false);
      expect(result.guides.centerH).toBe(false);
      expect(result.guides.centerV).toBe(false);
    });
  });

  describe('4. ASS Subtitle Export Alignment', () => {
    test('maps all 9 anchors to correct ASS numpad alignment codes (1–9)', () => {
      expect(getAssAlignment('left', 'bottom')).toBe(1);
      expect(getAssAlignment('center', 'bottom')).toBe(2);
      expect(getAssAlignment('right', 'bottom')).toBe(3);

      expect(getAssAlignment('left', 'center')).toBe(4);
      expect(getAssAlignment('center', 'center')).toBe(5);
      expect(getAssAlignment('right', 'center')).toBe(6);

      expect(getAssAlignment('left', 'top')).toBe(7);
      expect(getAssAlignment('center', 'top')).toBe(8);
      expect(getAssAlignment('right', 'top')).toBe(9);
    });
  });
});
