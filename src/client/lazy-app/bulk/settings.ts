import type {
  EncoderState,
  ProcessorState,
} from 'client/lazy-app/feature-meta';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface BulkImageSettings {
  encoderState?: EncoderState;
  processorState: ProcessorState;
}

export interface BulkImageOverrides {
  encoderState?: EncoderState;
  processorState?: DeepPartial<ProcessorState>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (!override) return base;
  if (!isRecord(base) || !isRecord(override)) return override as T;

  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    result[key] = mergeDeep(result[key], value as any);
  }

  return result as T;
}

function stableStringify(value: unknown): string {
  if (!isRecord(value)) return JSON.stringify(value);

  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);

  return `{${entries.join(',')}}`;
}

export function getEffectiveSettings(
  globalSettings: BulkImageSettings,
  overrides: BulkImageOverrides = {},
): BulkImageSettings {
  return {
    encoderState: overrides.encoderState ?? globalSettings.encoderState,
    processorState: mergeDeep(
      globalSettings.processorState,
      overrides.processorState,
    ),
  };
}

export function hasSettingsOverrides(
  overrides: BulkImageOverrides | undefined,
): boolean {
  if (!overrides) return false;
  return Boolean(
    overrides.encoderState ||
      (overrides.processorState &&
        Object.keys(overrides.processorState).length > 0),
  );
}

export function settingsHash(settings: BulkImageSettings): string {
  return stableStringify(settings);
}
