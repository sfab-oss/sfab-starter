"use client";

/**
 * GALLERY-ONLY, SHARED. A tiny factory for the preview "mode" seam that lets the
 * gallery flip a block through its states (loading / empty / error / …) without a
 * single production file importing gallery code. Each block instantiates it with
 * its own mode union + label list; the returned Provider / useMode / useControls
 * are the shared mechanism every block reuses.
 *
 * The only production seam per block is one fenced block in that block's data hook
 * that calls `useMode()`. Everything here is gallery-only and, like the other
 * `_shared/*` files, never appears in any block's `item.ts` `files` list — so it
 * never ships. `useMode()` returns the `defaultMode` when no Provider is mounted,
 * which is exactly what a production install (no gallery Provider) gets.
 */

import type { ReactElement, ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

export interface PreviewModeOption<TMode extends string> {
  value: TMode;
  label: string;
}

export interface PreviewModeControls<TMode extends string> {
  mode: TMode;
  setMode: (mode: TMode) => void;
}

export interface PreviewModeApi<TMode extends string> {
  /** Wrap the block preview to enable the switcher. */
  Provider: (props: { children: ReactNode }) => ReactElement;
  /** Current mode — `defaultMode` when no Provider is mounted (i.e. production). */
  useMode: () => TMode;
  /** Read + set the mode from the gallery dock. `null` outside a Provider. */
  useControls: () => PreviewModeControls<TMode> | null;
  /** The ordered option list, for the dock. */
  MODES: readonly PreviewModeOption<TMode>[];
}

export function createPreviewMode<TMode extends string>(config: {
  modes: readonly PreviewModeOption<TMode>[];
  defaultMode: TMode;
}): PreviewModeApi<TMode> {
  const Context = createContext<PreviewModeControls<TMode> | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<TMode>(config.defaultMode);
    const value = useMemo(() => ({ mode, setMode }), [mode]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useMode(): TMode {
    return useContext(Context)?.mode ?? config.defaultMode;
  }

  function useControls(): PreviewModeControls<TMode> | null {
    return useContext(Context);
  }

  return { Provider, useMode, useControls, MODES: config.modes };
}
