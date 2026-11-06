import type { ReactNode } from 'react';
import './DotBackground.css';

export function DotBackground({ children }: { children: ReactNode }) {
  return <div className="dot-background">{children}</div>;
}
