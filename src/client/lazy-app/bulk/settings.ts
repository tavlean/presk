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
    overrides.encoderState || hasDefinedOverride(overrides.processorState),
  );
}

function hasDefinedOverride(value: unknown): boolean {
  if (value === undefined) return false;
  if (!isRecord(value)) return true;
  return Object.values(value).some(hasDefinedOverride);
}

function collectDefinedOverridePaths(
  value: unknown,
  parentPath: string,
  paths: string[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    if (parentPath) paths.push(parentPath);
    return;
  }

  for (const [key, childValue] of Object.entries(value)) {
    collectDefinedOverridePaths(
      childValue,
      parentPath ? `${parentPath}.${key}` : key,
      paths,
    );
  }
}

export function getSettingsOverridePaths(
  overrides: BulkImageOverrides | undefined,
): string[] {
  if (!overrides) return [];
  const paths: string[] = [];
  if (overrides.encoderState) paths.push('encoderState');
  collectDefinedOverridePaths(
    overrides.processorState,
    'processorState',
    paths,
  );
  return paths;
}

export function settingsHash(settings: BulkImageSettings): string {
  return stableStringify(settings);
}
