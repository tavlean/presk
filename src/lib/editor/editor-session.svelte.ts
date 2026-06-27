import { untrack } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import {
  BROWSER_ENCODER_IDS,
  COMPARE_FORMAT_IDS,
  compressFile,
  getDefaultOptions,
  getSupportedFormatIds,
  IDENTITY,
  OUTPUT_FORMATS,
  type CompressOutcome,
  type OutputFormat,
  type SideFormat,
} from '$lib/compress';
import type { ResizeOptionsState } from './options/processor-types';
import { snackbar } from './snackbar-store.svelte';
import {
  defaultPreprocessorState,
  defaultProcessorState,
} from 'client/lazy-app/feature-meta';
import type { ProcessorState } from 'client/lazy-app/feature-meta';

export type SideIndex = 0 | 1;
export type SideStatus = 'idle' | 'working' | 'done' | 'error';

export interface SideState {
  format: SideFormat;
  optionsByFormat: Record<string, Record<string, unknown>>;
}

type SavedSide = {
  format?: string;
  optionsByFormat?: Record<string, Record<string, unknown>>;
};

// Bumped v2 → v3 when the default WebP options changed (quality 80 / method 6)
// and to discard pre-existing persisted side settings that would otherwise mask
// the new defaults (e.g. a stale AVIF-on-both-sides config). Old keys are simply
// ignored; a fresh default (left = Original, right = WebP) loads instead.
const STORAGE_KEY = 'sqush:settings:v3';
// v2 (2026-06-11): side presets no longer capture processorState — resize/
// palette is image-specific job state, not part of a reusable format recipe.
// v1 payloads still import (their processorState is simply ignored).
const SAVE_VERSION = 2;
const IMAGE_UPDATE_DELAY = 100;
const SPINNER_DELAY = 500;
const SETTINGS_PERSIST_DELAY = 200;

const sideSaveKey = (index: SideIndex) =>
  `sqush:side-settings:${index === 0 ? 'left' : 'right'}`;

const sideLabel = (index: SideIndex) => (index === 0 ? 'Left' : 'Right');

/** Compact SI size for snackbar messages (matches Results' 3-sig-fig style). */
function prettyBytes(bytes: number): string {
  if (bytes < 1) return '0 B';
  const units = ['B', 'kB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log10(bytes) / 3),
    units.length - 1,
  );
  return `${(bytes / 1000 ** exponent).toPrecision(3)} ${units[exponent]}`;
}

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function isValidFormat(format: unknown): format is SideFormat {
  return (
    format === IDENTITY || OUTPUT_FORMATS.some((option) => option.id === format)
  );
}

function readSaved(): { sides?: SavedSide[] } {
  if (!canUseLocalStorage()) return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') ?? {};
  } catch {
    return {};
  }
}

type ParsedSide = {
  format: SideFormat;
  optionsByFormat?: Record<string, Record<string, unknown>>;
};

/** Parse + validate a stored side payload; null if absent, corrupt, or invalid. */
function parseSavedSide(raw: string | null): ParsedSide | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const data = parsed as {
    version?: number;
    settings?: Record<string, unknown>;
  } & Record<string, unknown>;
  const incoming = (data?.settings ?? data) as {
    format?: unknown;
    optionsByFormat?: Record<string, Record<string, unknown>>;
  };
  if (!isValidFormat(incoming.format)) return null;
  // v1 payloads also carried a processorState — ignored since v2 (presets are
  // format recipes; resize/palette is per-image job state).
  return {
    format: incoming.format,
    optionsByFormat: incoming.optionsByFormat,
  };
}

function hasSavedSide(index: SideIndex): boolean {
  // Validate the payload (not just key presence) so a corrupt entry correctly
  // reports as not-importable and the Import button stays disabled.
  if (!canUseLocalStorage()) return false;
  return parseSavedSide(localStorage.getItem(sideSaveKey(index))) !== null;
}

function buildSide(
  saved: SavedSide | undefined,
  fallback: SideFormat,
): SideState {
  const optionsByFormat = Object.fromEntries(
    OUTPUT_FORMATS.map((format) => {
      const defaults = getDefaultOptions(format.id);
      const savedForFormat = saved?.optionsByFormat?.[format.id];
      return [
        format.id,
        savedForFormat ? { ...defaults, ...savedForFormat } : defaults,
      ];
    }),
  );

  return {
    format: isValidFormat(saved?.format)
      ? (saved!.format as SideFormat)
      : fallback,
    optionsByFormat,
  };
}

function snapshotProcessorStateForEncode(
  state: ProcessorState,
): ProcessorState {
  // `enabled` is read tracked (toggling resize must re-encode). When resize is
  // OFF, snapshot its width/height UNtracked: those values don't affect a
  // disabled-resize output, and `seedResizeDimensions()` writes them once a
  // result lands — so tracking them here would make the encode `$effect` depend
  // on width/height and fire a redundant re-encode right after the first one.
  const resizeEnabled = state.resize.enabled;
  return {
    quantize: $state.snapshot(state.quantize),
    resize: resizeEnabled
      ? $state.snapshot(state.resize)
      : untrack(() => $state.snapshot(state.resize)),
  };
}

function buildInitialSides(): [SideState, SideState] {
  // Read persisted settings once (not per side) and hydrate both sides.
  const saved = readSaved();
  return [
    buildSide(saved.sides?.[0], IDENTITY),
    buildSide(saved.sides?.[1], 'webP'),
  ];
}

export class EditorSession {
  sides = $state<[SideState, SideState]>(buildInitialSides());

  preprocessorState = $state(structuredClone(defaultPreprocessorState));
  // ONE Adjust (resize / reduce-palette) state shared by both sides. Resizing
  // is a property of the job ("I want this 1200px wide"), not of a side —
  // per-side copies (the Squoosh model) made users wonder which side they had
  // set and skewed format A/B comparisons. Both panels bind this same object.
  processorState = $state(structuredClone(defaultProcessorState));
  file = $state<File | null>(null);
  loadId = $state(0);
  // Raw, not deeply proxied: each CompressOutcome holds heavy browser host
  // objects (File, ImageData, and a Blob object URL) that must stay out of
  // reactive state. Updates trigger by reassigning the array (see encodeSide),
  // not by mutating an element in place.
  results = $state.raw<[CompressOutcome | null, CompressOutcome | null]>([
    null,
    null,
  ]);
  statuses = $state<[SideStatus, SideStatus]>(['idle', 'idle']);
  // The 500ms delayed loading spinner. `spinnerDelayPassed` is flipped true by
  // the updateSpinner effect once a side has been working for 500ms; showSpinner
  // AND-gates it with the live status so the spinner can never show outside a
  // 'working' spell and hides the instant a side stops working.
  spinnerDelayPassed = $state<[boolean, boolean]>([false, false]);
  showSpinner = $derived([
    this.statuses[0] === 'working' && this.spinnerDelayPassed[0],
    this.statuses[1] === 'working' && this.spinnerDelayPassed[1],
  ] as [boolean, boolean]);
  errors = $state<[string, string]>(['', '']);
  // Seed with the always-available (WASM) encoders only. The browser-native
  // ones (canvas.toBlob — GIF is usually unsupported) are added once
  // loadSupportedFormats() probes them, so an unsupported encoder never appears
  // in the dropdown, even briefly. Matches the original's "show only supported".
  supportedFormatIds = $state(
    new SvelteSet<OutputFormat>(
      OUTPUT_FORMATS.filter(
        (format) => !BROWSER_ENCODER_IDS.includes(format.id),
      ).map((format) => format.id),
    ),
  );
  canImport = $state<[boolean, boolean]>([hasSavedSide(0), hasSavedSide(1)]);

  // "Compare sizes": per-side encoded byte-size of each COMPARE_FORMAT_IDS
  // format at that side's current settings — the numbers shown on the format
  // chips. Cleared (and any in-flight run aborted) whenever anything that
  // would change the outcome changes (file, rotate, adjust, any option).
  compareSizes = $state<
    [
      Partial<Record<OutputFormat, number>>,
      Partial<Record<OutputFormat, number>>,
    ]
  >([{}, {}]);
  compareBusy = $state<[boolean, boolean]>([false, false]);
  // "Fit to size": true while a side's quality binary-search is running.
  fitting = $state<[boolean, boolean]>([false, false]);

  private compareControllers: [AbortController | null, AbortController | null] =
    [null, null];
  private fitControllers: [AbortController | null, AbortController | null] = [
    null,
    null,
  ];

  private lastUrls: [string | null, string | null] = [null, null];
  // Bookkeeping keyed to `loadId` (bumped on every new file). Comparing against
  // the live loadId replaces the old mutable prevFiles/dimsSeeded guards, so a
  // new file is detected automatically with no hand-reset in pickFiles/clearFile:
  //  - encodedLoadId: loadId each side last (re)started an encode at — a new
  //    file therefore encodes immediately, while option tweaks stay debounced.
  //  - seededLoadId: loadId the resize dims were last seeded at (one-shot/file).
  private encodedLoadId: [number, number] = [-1, -1];
  private seededLoadId = -1;
  // Disposes the per-side encode/spinner effects this instance owns (constructor).
  private stopEffects: (() => void) | null = null;
  // Debounced localStorage write for persistSettings (see flushSettings).
  private settingsTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSettings: string | null = null;

  naturalWidth = $derived(
    this.results[0]?.preprocessedWidth ??
      this.results[1]?.preprocessedWidth ??
      0,
  );

  naturalHeight = $derived(
    this.results[0]?.preprocessedHeight ??
      this.results[1]?.preprocessedHeight ??
      0,
  );

  isVectorSource = $derived(this.file?.type === 'image/svg+xml');

  availableFormats = $derived(
    OUTPUT_FORMATS.filter((format) => this.supportedFormatIds.has(format.id)),
  );

  contain = $derived(
    this.processorState.resize.enabled &&
      this.processorState.resize.fitMethod === 'contain',
  );
  leftContain = $derived(this.contain);
  rightContain = $derived(this.contain);
  firstError = $derived(this.errors.find((error) => error) ?? '');

  docTitle = $derived(
    (this.statuses.some((status) => status === 'working') ? '⏳ ' : '') +
      (this.file ? `${this.file.name} - ` : '') +
      'Sqush — Compress an image',
  );

  constructor() {
    // The class owns its per-side encode + spinner reactivity rather than having
    // +page.svelte create these effects and forward their cleanup-returning
    // methods. A component-detached $effect.root lets the instance set them up
    // here and tear them down in dispose().
    this.stopEffects = $effect.root(() => {
      for (const index of [0, 1] as const) {
        $effect(() => this.encodeSide(index));
        $effect(() => this.updateSpinner(index));
        // Invalidate that side's compare sizes whenever any input that shaped
        // them changes (file, rotate, adjust, any encoder option) — stale
        // numbers on the chips would be worse than none. The cleanup itself is
        // UNtracked: it reads (and clears) compareSizes, and tracking that
        // read would re-trigger the effect on the compare run's own writes,
        // aborting it after its first result.
        $effect(() => {
          void this.compareKey(index);
          untrack(() => {
            this.cancelCompare(index);
            if (Object.keys(this.compareSizes[index]).length) {
              this.compareSizes[index] = {};
            }
          });
        });
      }
    });
  }

  /** Reactive fingerprint of everything a side's compare sizes depend on. */
  private compareKey(index: SideIndex): string {
    return JSON.stringify([
      this.loadId,
      $state.snapshot(this.preprocessorState),
      $state.snapshot(this.processorState),
      $state.snapshot(this.sides[index].optionsByFormat),
    ]);
  }

  async loadSupportedFormats(): Promise<void> {
    this.supportedFormatIds = new SvelteSet(await getSupportedFormatIds());
  }

  encodeSide(index: SideIndex): (() => void) | void {
    const current = this.file;
    const side = this.sides[index];
    const request = {
      format: side.format,
      options: $state.snapshot(side.optionsByFormat[side.format] ?? {}),
      processorState: snapshotProcessorStateForEncode(this.processorState),
      preprocessorState: $state.snapshot(this.preprocessorState),
    };
    // A new file bumps loadId; compare against the loadId this side last encoded
    // at, so a fresh image encodes immediately and option tweaks stay debounced.
    const fileChanged = this.loadId !== this.encodedLoadId[index];
    this.encodedLoadId[index] = this.loadId;

    if (!current) {
      this.statuses[index] = 'idle';
      return;
    }

    this.statuses[index] = 'working';
    this.errors[index] = '';

    const controller = new AbortController();
    const run = () => {
      this.statuses[index] = 'working';
      this.errors[index] = '';
      compressFile(current, request, controller.signal)
        .then((outcome) => {
          if (controller.signal.aborted) {
            URL.revokeObjectURL(outcome.outputUrl);
            return;
          }
          this.revokeSideUrl(index);
          this.lastUrls[index] = outcome.outputUrl;
          // results is $state.raw, so reassign the array rather than mutating an
          // element in place — only reassignment triggers reactive updates.
          const nextResults: [CompressOutcome | null, CompressOutcome | null] =
            [this.results[0], this.results[1]];
          nextResults[index] = outcome;
          this.results = nextResults;
          this.statuses[index] = 'done';
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          this.errors[index] =
            error instanceof Error ? error.message : String(error);
          this.statuses[index] = 'error';
        });
    };

    if (fileChanged) {
      run();
      return () => controller.abort();
    }

    const timer = setTimeout(run, IMAGE_UPDATE_DELAY);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }

  updateSpinner(index: SideIndex): (() => void) | void {
    // Manages only the 500ms delay; showSpinner is the $derived AND-gate above.
    if (this.statuses[index] !== 'working') {
      this.spinnerDelayPassed[index] = false;
      return;
    }

    const timer = setTimeout(() => {
      this.spinnerDelayPassed[index] = true;
    }, SPINNER_DELAY);

    return () => clearTimeout(timer);
  }

  syncRouteState(editorOpen: boolean): void {
    if (this.file && !editorOpen) this.clearFile();
  }

  seedResizeDimensions(): void {
    const result = this.results[0] ?? this.results[1];
    if (!result || this.seededLoadId === this.loadId) return;

    this.seededLoadId = this.loadId;
    if (!this.processorState.resize.enabled) {
      this.processorState.resize.width = result.preprocessedWidth;
      this.processorState.resize.height = result.preprocessedHeight;
    }
  }

  persistSettings(): void {
    if (!canUseLocalStorage()) return;
    // Serialise synchronously so the calling $effect tracks `format` and
    // `optionsByFormat` as dependencies (reads inside the deferred timer would
    // not be tracked)...
    this.pendingSettings = JSON.stringify({
      sides: this.sides.map((side) => ({
        format: side.format,
        optionsByFormat: $state.snapshot(side.optionsByFormat),
      })),
    });

    // ...but coalesce the actual write: dragging a slider would otherwise
    // serialise and hit localStorage on every reactive tick (~60×/s).
    if (this.settingsTimer !== null) clearTimeout(this.settingsTimer);
    this.settingsTimer = setTimeout(
      () => this.flushSettings(),
      SETTINGS_PERSIST_DELAY,
    );
  }

  private flushSettings(): void {
    if (this.settingsTimer !== null) {
      clearTimeout(this.settingsTimer);
      this.settingsTimer = null;
    }
    if (this.pendingSettings === null) return;
    const payload = this.pendingSettings;
    this.pendingSettings = null;
    try {
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // Storage may be unavailable in private browsing modes.
    }
  }

  pickFiles(
    list: FileList | null | undefined,
    pushEditorHistory: () => void,
  ): void {
    const next = list?.[0];
    if (!next) return;

    if (!next.type.startsWith('image/')) {
      snackbar.show(`"${next.name}" doesn't look like an image.`);
      return;
    }

    const opening = !this.file;
    this.revokeAllUrls();
    this.file = next;
    this.loadId += 1;
    this.results = [null, null];
    this.errors = ['', ''];
    this.statuses = ['idle', 'idle'];
    // Reset the spinner delay so the new file re-earns the 500ms grace; loadId
    // (bumped above) re-arms the encode + seed bookkeeping with no manual reset.
    this.spinnerDelayPassed = [false, false];
    this.preprocessorState = structuredClone(defaultPreprocessorState);

    this.processorState = structuredClone(defaultProcessorState);
    // Match the original: vector (SVG) sources default the resize method to
    // "vector" so re-rasterising at a new size stays crisp.
    if (next.type === 'image/svg+xml') {
      (this.processorState.resize as unknown as ResizeOptionsState).method =
        'vector';
    }

    if (opening) pushEditorHistory();
  }

  clearFile(): void {
    this.cancelCompare(0);
    this.cancelCompare(1);
    this.fitControllers.forEach((c) => c?.abort());
    this.file = null;
    this.results = [null, null];
    this.errors = ['', ''];
    this.statuses = ['idle', 'idle'];
    this.spinnerDelayPassed = [false, false];
    this.preprocessorState = structuredClone(defaultPreprocessorState);
    this.revokeAllUrls();
  }

  dispose(): void {
    this.cancelCompare(0);
    this.cancelCompare(1);
    this.fitControllers.forEach((c) => c?.abort());
    // Tear down the encode/spinner effects this instance set up in its
    // constructor.
    this.stopEffects?.();
    this.stopEffects = null;
    // Persist any pending settings change before teardown so the debounce never
    // drops the user's last edit.
    this.flushSettings();
    this.revokeAllUrls();
  }

  rotate(): void {
    const previous = this.preprocessorState.rotate.rotate;
    const next = ((previous + 90) % 360) as 0 | 90 | 180 | 270;
    this.preprocessorState.rotate.rotate = next;

    // Match the original: on an orientation-changing rotate (90/270), swap the
    // resize width/height so the Resize fields + preset stay aligned with the
    // now-rotated source. Done regardless of resize.enabled.
    if (previous % 180 !== next % 180) {
      const resize = this.processorState.resize;
      const { width, height } = resize;
      resize.width = height;
      resize.height = width;
    }
  }

  setFormat(index: SideIndex, format: SideFormat): void {
    this.sides[index].format = format;
  }

  copyToOther(from: SideIndex): void {
    const to: SideIndex = from === 0 ? 1 : 0;
    const previous = $state.snapshot(this.sides[to]) as SideState;
    this.applySide(to, $state.snapshot(this.sides[from]) as SideState);
    snackbar
      .show('Settings copied across', { actions: ['undo'], timeout: 5000 })
      .then((action) => {
        if (action === 'undo') this.applySide(to, previous);
      });
  }

  saveSide(index: SideIndex): void {
    if (!canUseLocalStorage()) return;
    const label = sideLabel(index);

    try {
      localStorage.setItem(
        sideSaveKey(index),
        JSON.stringify({
          version: SAVE_VERSION,
          settings: {
            format: this.sides[index].format,
            optionsByFormat: $state.snapshot(this.sides[index].optionsByFormat),
          },
        }),
      );
      this.canImport[index] = true;
      snackbar.show(`${label} side settings saved`, { timeout: 1500 });
    } catch {
      snackbar.show(`${label} side settings could not be saved`, {
        timeout: 3000,
      });
    }
  }

  importSide(index: SideIndex): void {
    if (!canUseLocalStorage()) return;
    const label = sideLabel(index);
    const raw = localStorage.getItem(sideSaveKey(index));
    if (!raw) return;

    // Same parse + validation the Import button's enabled state uses, so the
    // two cannot drift.
    const incoming = parseSavedSide(raw);
    if (!incoming) {
      snackbar.show(`${label} side settings are invalid`, { timeout: 3000 });
      return;
    }

    const previous = $state.snapshot(this.sides[index]) as SideState;
    this.sides[index].format = incoming.format;
    if (incoming.optionsByFormat) {
      this.sides[index].optionsByFormat = {
        ...this.sides[index].optionsByFormat,
        ...structuredClone(incoming.optionsByFormat),
      };
    }
    snackbar
      .show(`${label} side settings imported`, {
        actions: ['undo'],
        timeout: 5000,
      })
      .then((action) => {
        if (action === 'undo') this.applySide(index, previous);
      });
  }

  /**
   * "Compare sizes": encode this image through every COMPARE_FORMAT_IDS
   * encoder at this side's current per-format settings and record the byte
   * sizes (shown on the format chips). Semantics are deliberately "what would
   * I get if I clicked that chip" — each format uses ITS OWN current options,
   * not a normalized quality. Runs sequentially so it never starves the live
   * encode; aborted + cleared by the compareKey effect when inputs change.
   */
  async runCompare(index: SideIndex): Promise<void> {
    const file = this.file;
    if (!file || this.compareBusy[index]) return;

    this.cancelCompare(index);
    const controller = new AbortController();
    this.compareControllers[index] = controller;
    this.compareBusy[index] = true;

    const side = this.sides[index];
    const processorState = snapshotProcessorStateForEncode(this.processorState);
    const preprocessorState = $state.snapshot(this.preprocessorState);

    try {
      for (const format of COMPARE_FORMAT_IDS) {
        if (controller.signal.aborted) return;
        if (!this.supportedFormatIds.has(format)) continue;

        // The side's own live result already answers its current format.
        if (
          format === side.format &&
          this.statuses[index] === 'done' &&
          this.results[index]
        ) {
          this.compareSizes[index][format] = this.results[index]!.outputSize;
          continue;
        }

        try {
          const outcome = await compressFile(
            file,
            {
              format,
              options: $state.snapshot(side.optionsByFormat[format] ?? {}),
              processorState,
              preprocessorState,
            },
            controller.signal,
          );
          URL.revokeObjectURL(outcome.outputUrl);
          if (controller.signal.aborted) return;
          this.compareSizes[index][format] = outcome.outputSize;
        } catch {
          // A format that fails to encode simply shows no size.
          if (controller.signal.aborted) return;
        }
      }
    } finally {
      if (this.compareControllers[index] === controller) {
        this.compareControllers[index] = null;
        this.compareBusy[index] = false;
      }
    }
  }

  private cancelCompare(index: SideIndex): void {
    this.compareControllers[index]?.abort();
    this.compareControllers[index] = null;
    this.compareBusy[index] = false;
  }

  /**
   * "Fit to size": binary-search this side's quality until the output fits
   * under `targetBytes`, then commit the found quality. Only meaningful for
   * formats with a numeric `quality` option. ~7 probe encodes.
   */
  async fitToSize(index: SideIndex, targetBytes: number): Promise<void> {
    const file = this.file;
    const side = this.sides[index];
    const format = side.format;
    if (!file || format === IDENTITY || this.fitting[index]) return;
    if (!Number.isFinite(targetBytes) || targetBytes <= 0) return;

    const base = $state.snapshot(side.optionsByFormat[format] ?? {});
    if (typeof base.quality !== 'number') return;

    // Per-format quality ceilings: AVIF/JXL treat max quality as lossless
    // (a different mode), and browser JPEG runs on a 0–1 scale.
    const isFractional = format === 'browserJPEG';
    const maxQ =
      format === 'avif' || format === 'jxl' ? 99 : isFractional ? 1 : 100;
    const step = isFractional ? 0.01 : 1;
    const round = (q: number) => Math.round(q / step) * step;

    this.fitControllers[index]?.abort();
    const controller = new AbortController();
    this.fitControllers[index] = controller;
    this.fitting[index] = true;

    const processorState = snapshotProcessorStateForEncode(this.processorState);
    const preprocessorState = $state.snapshot(this.preprocessorState);
    const encodeAt = async (quality: number): Promise<number> => {
      const outcome = await compressFile(
        file,
        {
          format,
          options: { ...base, quality },
          processorState,
          preprocessorState,
        },
        controller.signal,
      );
      URL.revokeObjectURL(outcome.outputUrl);
      return outcome.outputSize;
    };

    try {
      let lo = 0;
      let hi = maxQ;
      let best: number | null = null;
      let bestSize = 0;

      // Floor probe first: if even the lowest quality overshoots, say so
      // honestly instead of silently committing a too-big result.
      const floorSize = await encodeAt(0);
      if (floorSize > targetBytes) {
        snackbar.show(
          `Can't fit under ${prettyBytes(targetBytes)} — the lowest quality is ${prettyBytes(floorSize)}. Try resizing.`,
          { timeout: 5000 },
        );
        return;
      }
      best = 0;
      bestSize = floorSize;

      for (let i = 0; i < 7 && hi - lo > step; i++) {
        const mid = round((lo + hi) / 2);
        if (mid === lo || mid === hi) break;
        const size = await encodeAt(mid);
        if (size <= targetBytes) {
          best = mid;
          bestSize = size;
          lo = mid;
        } else {
          hi = mid;
        }
      }

      if (controller.signal.aborted) return;
      // Replace the options OBJECT (not mutate) so {#key options} remounts the
      // panel and seeded-state panels (AVIF/JXL) re-derive their UI.
      side.optionsByFormat = {
        ...side.optionsByFormat,
        [format]: { ...base, quality: best },
      };
      const shownQ = isFractional ? Math.round(best! * 100) : best;
      snackbar.show(`Quality ${shownQ} fits: ${prettyBytes(bestSize)}`, {
        timeout: 4000,
      });
    } catch {
      if (!controller.signal.aborted) {
        snackbar.show('Size search failed — try again.', { timeout: 3000 });
      }
    } finally {
      if (this.fitControllers[index] === controller) {
        this.fitControllers[index] = null;
        this.fitting[index] = false;
      }
    }
  }

  downloadName(index: SideIndex): string {
    if (!this.file) return 'image';
    const side = this.sides[index];
    if (side.format === IDENTITY) return this.file.name;
    const extension =
      OUTPUT_FORMATS.find((format) => format.id === side.format)?.ext ?? 'bin';
    return this.file.name.replace(/\.[^.]+$/, '') + '.' + extension;
  }

  private applySide(index: SideIndex, snapshot: SideState): void {
    this.sides[index].format = snapshot.format;
    this.sides[index].optionsByFormat = structuredClone(
      snapshot.optionsByFormat,
    );
  }

  private revokeSideUrl(index: SideIndex): void {
    const url = this.lastUrls[index];
    if (!url) return;
    URL.revokeObjectURL(url);
    this.lastUrls[index] = null;
  }

  private revokeAllUrls(): void {
    this.revokeSideUrl(0);
    this.revokeSideUrl(1);
  }
}
