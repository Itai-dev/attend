import type { ReactNode } from 'react';

/** CanvasKit is loaded by index.web.js before the app starts; nothing to wait for here. */
export function SkiaGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
