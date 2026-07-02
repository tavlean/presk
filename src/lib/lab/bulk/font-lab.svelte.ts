// Dev-lab font experiment (maintainer request 2026-07-02): a top-bar toggle
// that swaps the UI font for the whole lab so typefaces can be compared in
// situ. `stack: null` means "inherit the app's default" (self-hosted Outfit
// from the root layout). The webfonts themselves are loaded by the lab page's
// <svelte:head> links — dev-only, nothing ships to production.

export type LabFontId =
  | 'outfit'
  | 'system'
  | 'windows'
  | 'inter'
  | 'geist'
  | 'mona'
  | 'satoshi';

export interface LabFontOption {
  id: LabFontId;
  /** Short pill label for the top bar. */
  label: string;
  /** Hover tooltip: what this option demonstrates. */
  title: string;
  /** CSS font-family stack; null = inherit the app default (Outfit). */
  stack: string | null;
}

export const LAB_FONT_OPTIONS: LabFontOption[] = [
  {
    id: 'outfit',
    label: 'Outfit',
    title: 'Current app font (self-hosted Outfit)',
    stack: null,
  },
  {
    id: 'system',
    label: 'System',
    title: 'Your OS system font (SF on macOS)',
    stack:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'windows',
    label: 'Segoe',
    title:
      'The Windows system font, explicitly (real Segoe UI on Windows; on other OSes Tahoma previews as its closest cousin — Segoe has no webfont)',
    stack: "'Segoe UI Variable Text', 'Segoe UI', Tahoma, sans-serif",
  },
  {
    id: 'inter',
    label: 'Inter',
    title: 'Inter (Google Fonts)',
    stack: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'geist',
    label: 'Geist',
    title: 'Geist (Vercel, via Google Fonts)',
    stack: "'Geist', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'mona',
    label: 'Mona',
    title: 'Mona Sans (GitHub, via Google Fonts)',
    stack: "'Mona Sans', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'satoshi',
    label: 'Satoshi',
    title: 'Satoshi (Fontshare) — the orchestrator’s designer pick',
    stack: "'Satoshi', ui-sans-serif, system-ui, sans-serif",
  },
];

export const fontLab = $state<{ choice: LabFontId }>({ choice: 'outfit' });
