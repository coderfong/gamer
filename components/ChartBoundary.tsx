"use client";

import { Component, type ReactNode } from "react";

// Keeps a charting library (recharts) from ever taking down the surrounding UI.
// If a chart throws — which can happen on some mobile browsers — we render a
// small fallback instead of blanking the whole page section.
export class ChartBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* swallow — the fallback is enough */
  }
  render() {
    return this.state.failed ? this.props.fallback ?? null : this.props.children;
  }
}
