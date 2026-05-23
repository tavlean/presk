/**
 * Copyright 2026 Sqush Contributors.
 * Licensed under the Apache License, Version 2.0.
 */
const assert = require('assert/strict');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const { dirname, join } = require('path');
const ts = require('typescript');

const repoRoot = join(__dirname, '..');
const outDir = join(repoRoot, '.tmp', 'bulk-helper-tests');
const sourceFiles = [
  'src/client/lazy-app/bulk/settings.ts',
  'src/client/lazy-app/bulk/session.ts',
  'src/client/lazy-app/bulk/import.ts',
  'src/client/lazy-app/bulk/queue.ts',
  'src/client/lazy-app/bulk/export.ts',
  'src/client/lazy-app/util/clean-modify.ts',
  'src/client/lazy-app/Compress/Results/pretty-bytes.ts',
];

function compileTestModule(sourcePath) {
  const inputPath = join(repoRoot, sourcePath);
  const outputPath = join(
    outDir,
    sourcePath.replace(/^src\/client\/lazy-app\//, '').replace(/\.ts$/, '.js'),
  );
  const source = readFileSync(inputPath, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: inputPath,
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, result.outputText);
}

function makeFile(name, type, size, lastModified = 1) {
  return { name, type, size, lastModified };
}

mkdirSync(outDir, { recursive: true });
for (const sourceFile of sourceFiles) compileTestModule(sourceFile);

const settings = require(join(outDir, 'bulk', 'settings.js'));
const session = require(join(outDir, 'bulk', 'session.js'));
const bulkImport = require(join(outDir, 'bulk', 'import.js'));
const queue = require(join(outDir, 'bulk', 'queue.js'));
const bulkExport = require(join(outDir, 'bulk', 'export.js'));
const cleanModify = require(join(outDir, 'util', 'clean-modify.js'));
const prettyBytes = require(join(
  outDir,
  'Compress',
  'Results',
  'pretty-bytes.js',
)).default;

const globalSettings = {
  encoderState: {
    type: 'browser-webp',
    options: { quality: 75 },
  },
  processorState: {
    resize: {
      enabled: true,
      width: 1200,
      height: 800,
    },
  },
};

const effectiveSettings = settings.getEffectiveSettings(globalSettings, {
  processorState: {
    resize: {
      width: 900,
    },
  },
});

assert.equal(effectiveSettings.encoderState, globalSettings.encoderState);
assert.deepEqual(effectiveSettings.processorState.resize, {
  enabled: true,
  width: 900,
  height: 800,
});
assert.equal(settings.hasSettingsOverrides(undefined), false);
assert.equal(settings.hasSettingsOverrides({}), false);
assert.equal(
  settings.hasSettingsOverrides({ processorState: { resize: { width: 900 } } }),
  true,
);
assert.equal(
  settings.settingsHash({
    processorState: { b: 2, a: 1 },
  }),
  settings.settingsHash({
    processorState: { a: 1, b: 2 },
  }),
);

const png = makeFile('hero.png', 'image/png', 1000);
const text = makeFile('notes.txt', 'text/plain', 100);
const imported = bulkImport.createImageJobs([png, text]);

assert.equal(imported.accepted.length, 1);
assert.equal(imported.rejected.length, 1);
assert.equal(imported.accepted[0].originalSize, 1000);

let bulkSession = session.createBulkSession('batch-1', globalSettings);
bulkSession = session.addJobs(bulkSession, imported.accepted);

assert.equal(session.getSelectedJob(bulkSession).id, imported.accepted[0].id);
bulkSession = session.updateJobOverrides(bulkSession, imported.accepted[0].id, {
  processorState: {
    resize: {
      width: 900,
    },
  },
});
assert.deepEqual(bulkSession.jobs[0].overrides.processorState.resize, {
  width: 900,
});
bulkSession = session.clearJobOverrides(bulkSession, imported.accepted[0].id);
assert.equal(bulkSession.jobs[0].overrides, undefined);
assert.deepEqual(session.getBatchProgress(bulkSession), {
  total: 1,
  completed: 0,
  failed: 0,
});

bulkSession = queue.startJob(bulkSession, imported.accepted[0].id);
assert.equal(bulkSession.activeJobs, 1);
assert.equal(queue.getRunnableJobs(bulkSession).length, 0);

const output = {
  file: makeFile('hero.webp', 'image/webp', 500),
  size: 500,
  downloadUrl: 'blob:test',
  percentChange: -50,
  settingsHash: settings.settingsHash(globalSettings),
};

bulkSession = queue.completeJob(bulkSession, imported.accepted[0].id, output);
assert.equal(bulkSession.activeJobs, 0);
assert.deepEqual(session.getBatchProgress(bulkSession), {
  total: 1,
  completed: 1,
  failed: 0,
});
assert.equal(queue.isJobOutputStale(bulkSession, bulkSession.jobs[0]), false);
assert.deepEqual(bulkExport.getExportableJobs(bulkSession), [
  bulkSession.jobs[0],
]);
assert.deepEqual(bulkExport.getBulkExportSummary(bulkSession), {
  ready: 1,
  failed: 0,
  pending: 0,
  skipped: 0,
  totalOriginalSize: 1000,
  totalOutputSize: 500,
  percentChange: -50,
});

bulkSession = session.updateGlobalSettings(bulkSession, {
  ...globalSettings,
  processorState: {
    resize: {
      enabled: true,
      width: 640,
      height: 480,
    },
  },
});

assert.equal(queue.isJobOutputStale(bulkSession, bulkSession.jobs[0]), true);
assert.deepEqual(bulkExport.getExportableJobs(bulkSession), []);
assert.deepEqual(bulkExport.getBulkExportSummary(bulkSession), {
  ready: 0,
  failed: 0,
  pending: 1,
  skipped: 0,
  totalOriginalSize: 0,
  totalOutputSize: 0,
  percentChange: 0,
});

bulkSession = session.updateGlobalSettings(bulkSession, {
  ...globalSettings,
  processorState: {
    resize: {
      enabled: true,
      width: 1200,
      height: 800,
    },
  },
});

assert.equal(queue.isJobOutputStale(bulkSession, bulkSession.jobs[0]), false);

bulkSession = session.updateJobOverrides(bulkSession, imported.accepted[0].id, {
  processorState: {
    resize: {
      width: 640,
    },
  },
});

assert.equal(queue.isJobOutputStale(bulkSession, bulkSession.jobs[0]), true);

assert.equal(bulkExport.getBulkExportName(bulkSession), 'batch-1-optimized');
assert.equal(existsSync(join(outDir, 'bulk', 'queue.js')), true);

const original = {
  encoder: {
    options: {
      quality: 75,
      method: 4,
    },
  },
  untouched: true,
};
const changed = cleanModify.cleanSet(original, 'encoder.options.quality', 80);
assert.equal(changed.encoder.options.quality, 80);
assert.equal(changed.encoder.options.method, 4);
assert.equal(original.encoder.options.quality, 75);
assert.notEqual(changed, original);
assert.notEqual(changed.encoder, original.encoder);
assert.notEqual(changed.encoder.options, original.encoder.options);
assert.equal(changed.untouched, true);

const merged = cleanModify.cleanMerge(original, 'encoder.options', {
  effort: 6,
});
assert.deepEqual(merged.encoder.options, {
  quality: 75,
  method: 4,
  effort: 6,
});
assert.deepEqual(original.encoder.options, {
  quality: 75,
  method: 4,
});

const list = [{ value: 1 }, { value: 2 }];
const changedList = cleanModify.cleanSet(list, [1, 'value'], 3);
assert.deepEqual(changedList, [{ value: 1 }, { value: 3 }]);
assert.deepEqual(list, [{ value: 1 }, { value: 2 }]);

assert.deepEqual(prettyBytes(0), { value: '0', unit: 'B' });
assert.deepEqual(prettyBytes(999), { value: '999', unit: 'B' });
assert.deepEqual(prettyBytes(1000), { value: '1.00', unit: 'kB' });
assert.deepEqual(prettyBytes(1234567), { value: '1.23', unit: 'MB' });
assert.deepEqual(prettyBytes(-1234), { value: '-1.23', unit: 'kB' });

console.log('Helper tests passed');
