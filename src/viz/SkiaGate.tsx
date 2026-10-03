import type { ReactNode } from 'react';

/** Native: Skia is ready at launch. (The web variant waits for CanvasKit.) */
export function SkiaGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
