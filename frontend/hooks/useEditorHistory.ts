import { useCallback, useEffect, useRef, useState } from 'react';

function sameContent(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Snapshot-based undo/redo for editor document state (captions + text layers).
 * - Only changes to the tracked values are recorded (never playback time).
 * - Rapid changes (slider drags, typing) inside `burstMs` collapse into one undo step.
 * - The first non-empty load becomes the baseline and is not undoable.
 */
export function useEditorHistory<T>(value: T, apply: (v: T) => void, isEmpty: (v: T) => boolean, burstMs = 500) {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const last = useRef<T>(value);
  const baselineSet = useRef(false);
  const restoring = useRef(false);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (restoring.current) {
      restoring.current = false;
      last.current = value;
      return;
    }
    if (value === last.current) return;
    if (!baselineSet.current) {
      if (!isEmpty(value)) baselineSet.current = true;
      last.current = value;
      return;
    }
    // A new object with identical content (e.g. a duplicate fetch of the same captions) is not an edit.
    if (sameContent(value, last.current)) {
      last.current = value;
      return;
    }
    if (!burstTimer.current) {
      past.current.push(last.current);
      if (past.current.length > 100) past.current.shift();
      future.current = [];
      bump();
    } else {
      clearTimeout(burstTimer.current);
    }
    burstTimer.current = setTimeout(() => {
      burstTimer.current = null;
    }, burstMs);
    last.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const closeBurst = () => {
    if (burstTimer.current) {
      clearTimeout(burstTimer.current);
      burstTimer.current = null;
    }
  };

  const undo = useCallback(() => {
    closeBurst();
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(last.current);
    restoring.current = true;
    apply(prev);
    bump();
  }, [apply]);

  const redo = useCallback(() => {
    closeBurst();
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(last.current);
    restoring.current = true;
    apply(next);
    bump();
  }, [apply]);

  return { undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
