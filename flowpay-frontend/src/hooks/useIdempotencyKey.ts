import { useCallback, useRef } from "react";

export function useIdempotencyKey() {
  const keyRef = useRef<string | null>(null);

  const next = useCallback(() => {
    if (!keyRef.current) {
      keyRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return keyRef.current;
  }, []);

  const reset = useCallback(() => {
    keyRef.current = null;
  }, []);

  return { next, reset, current: keyRef.current };
}
