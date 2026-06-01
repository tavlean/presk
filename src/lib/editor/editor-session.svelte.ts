import { untrack } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import {
  BROWSER_ENCODER_IDS,
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
  processorState: ProcessorState;
}

type SavedSide = {
  format?: string;
  optionsByFormat?: Record<string, Record<string, unknown>>;
};

const STORAGE_KEY = 'sqush:settings:v2';
const SAVE_VERSION = 1;
const IMAGE_UPDATE_DELAY = 100;
const SPINNER_DELAY = 500;
const SETTINGS_PERSIST_DELAY = 200;

const sideSaveKey = (index: SideIndex) =>
  `sqush:side-settings:${index === 0 ? 'left' : 'right'}`;

const sideLabel = (index: SideIndex) => (index === 0 ? 'Left' : 'Right');

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function isValidFormat(format: unknown): format is SideFormat {
  return (
    format === IDENTITY || OUTPUT_FORMATS.some((option) => option.id === format)
  );
}

function isValidProcessorState(value: unknown): value is ProcessorState {
  const state = value as ProcessorState | undefined;
  return (
    !!state &&
    typeof state === 'object' &&
    !!state.resize &&
    typeof state.resize.enabled === 'boolean' &&
    // Match the original: every inner value must be present (reject a partial
    // payload like { enabled: true, width: null }).
    Object.values(state.resize).every((v) => v != null) &&
    !!state.quantize &&
    typeof state.quantize.enabled === 'boolean' &&
    Object.values(state.quantize).every((v) => v != null)
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
  processorState: ProcessorState;
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
    processorState?: unknown;
  };
  if (
    !isValidFormat(incoming.format) ||
    !isValidProcessorState(incoming.processorState)
  ) {
    return null;
  }
  return {
    format: incoming.format,
    optionsByFormat: incoming.optionsByFormat,
    processorState: incoming.processorState,
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
    processorState: structuredClone(defaultProcessorState),
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
  showSpinner = $state<[boolean, boolean]>([false, false]);
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

  private dimsSeeded = false;
  private lastUrls: [string | null, string | null] = [null, null];
  private prevFiles: [File | null, File | null] = [null, null];
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

  leftContain = $derived(this.sideContains(0));
  rightContain = $derived(this.sideContains(1));
  firstError = $derived(this.errors.find((error) => error) ?? '');

  docTitle = $derived(
    (this.statuses.some((status) => status === 'working') ? '⏳ ' : '') +
      (this.file ? `${this.file.name} - ` : '') +
      'Sqush — Compress an image',
  );

  async loadSupportedFormats(): Promise<void> {
    this.supportedFormatIds = new SvelteSet(await getSupportedFormatIds());
  }

  encodeSide(index: SideIndex): (() => void) | void {
    const current = this.file;
    const side = this.sides[index];
    const request = {
      format: side.format,
      options: $state.snapshot(side.optionsByFormat[side.format] ?? {}),
      processorState: snapshotProcessorStateForEncode(side.processorState),
      preprocessorState: $state.snapshot(this.preprocessorState),
    };
    const fileChanged = current !== this.prevFiles[index];
    this.prevFiles[index] = current;

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
    if (this.statuses[index] !== 'working') {
      this.showSpinner[index] = false;
      return;
    }

    const timer = setTimeout(() => {
      this.showSpinner[index] = true;
    }, SPINNER_DELAY);

    return () => clearTimeout(timer);
  }

  syncRouteState(editorOpen: boolean): void {
    if (this.file && !editorOpen) this.clearFile();
  }

  seedResizeDimensions(): void {
    const result = this.results[0] ?? this.results[1];
    if (!result || this.dimsSeeded) return;

    this.dimsSeeded = true;
    for (const side of this.sides) {
      if (side.processorState.resize.enabled) continue;
      side.processorState.resize.width = result.preprocessedWidth;
      side.processorState.resize.height = result.preprocessedHeight;
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
    this.showSpinner = [false, false];
    this.prevFiles = [null, null];
    this.preprocessorState = structuredClone(defaultPreprocessorState);
    this.dimsSeeded = false;

    const isVector = next.type === 'image/svg+xml';
    for (const side of this.sides) {
      side.processorState = structuredClone(defaultProcessorState);
      // Match the original: vector (SVG) sources default the resize method to
      // "vector" so re-rasterising at a new size stays crisp.
      if (isVector) {
        (side.processorState.resize as unknown as ResizeOptionsState).method =
          'vector';
      }
    }

    if (opening) pushEditorHistory();
  }

  clearFile(): void {
    this.file = null;
    this.results = [null, null];
    this.errors = ['', ''];
    this.statuses = ['idle', 'idle'];
    this.showSpinner = [false, false];
    this.prevFiles = [null, null];
    this.preprocessorState = structuredClone(defaultPreprocessorState);
    this.dimsSeeded = false;
    this.revokeAllUrls();
  }

  dispose(): void {
    // Persist any pending settings change before teardown so the debounce never
    // drops the user's last edit.
    this.flushSettings();
    this.revokeAllUrls();
  }

  rotate(): void {
    const previous = this.preprocessorState.rotate.rotate;
    const next = ((previous + 90) % 360) as 0 | 90 | 180 | 270;
    this.preprocessorState.rotate.rotate = next;

    // Match the original: on an orientation-changing rotate (90/270), swap each
    // side's resize width/height so the Resize fields + preset stay aligned with
    // the now-rotated source. Done for both sides regardless of resize.enabled.
    if (previous % 180 !== next % 180) {
      for (const side of this.sides) {
        const resize = side.processorState.resize;
        const { width, height } = resize;
        resize.width = height;
        resize.height = width;
      }
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
            processorState: $state.snapshot(this.sides[index].processorState),
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
    this.sides[index].processorState = structuredClone(incoming.processorState);
    snackbar
      .show(`${label} side settings imported`, {
        actions: ['undo'],
        timeout: 5000,
      })
      .then((action) => {
        if (action === 'undo') this.applySide(index, previous);
      });
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
    this.sides[index].processorState = structuredClone(snapshot.processorState);
  }

  private sideContains(index: SideIndex): boolean {
    return (
      this.sides[index].processorState.resize.enabled &&
      this.sides[index].processorState.resize.fitMethod === 'contain'
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
