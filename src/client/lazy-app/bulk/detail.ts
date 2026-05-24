import { getBulkJobSizeSummary, type BulkJobSizeSummary } from './export';
import {
  getJobEffectiveSettings,
  getSelectedJobContext,
  type BulkSession,
  type ImageJob,
  type SelectedJobContext,
} from './session';
import type { BulkImageSettings } from './settings';
import { getSettingsOverridePaths } from './settings';

export interface BulkSelectedJobDetail {
  job: ImageJob;
  context: SelectedJobContext;
  effectiveSettings: BulkImageSettings;
  size: BulkJobSizeSummary;
  overridePaths: string[];
  hasOverrides: boolean;
}

export function getBulkSelectedJobDetail(
  session: BulkSession,
): BulkSelectedJobDetail | undefined {
  const context = getSelectedJobContext(session);
  if (!context.job) return;

  const effectiveSettings = getJobEffectiveSettings(session, context.job.id);
  if (!effectiveSettings) return;

  const overridePaths = getSettingsOverridePaths(context.job.overrides);

  return {
    job: context.job,
    context,
    effectiveSettings,
    size: getBulkJobSizeSummary(session, context.job),
    overridePaths,
    hasOverrides: overridePaths.length > 0,
  };
}
