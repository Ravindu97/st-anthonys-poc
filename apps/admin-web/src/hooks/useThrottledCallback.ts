"use client";

import { useCallback, useRef } from "react";

export function useThrottledCallback<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number
): T {
  const fnRef = useRef(fn);
  const lastRunRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  fnRef.current = fn;

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const elapsed = now - lastRunRef.current;

      const run = () => {
        lastRunRef.current = Date.now();
        fnRef.current(...args);
      };

      if (elapsed >= delayMs) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        run();
        return;
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(run, delayMs - elapsed);
    }) as T,
    [delayMs]
  );
}
