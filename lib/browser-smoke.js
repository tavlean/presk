/**
 * Copyright 2026 Tavlean.
 * Licensed under the Apache License, Version 2.0.
 */
const { spawn } = require('child_process');
const { copyFileSync, existsSync, mkdirSync } = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const requestedPort = Number(process.env.PREVIEW_PORT || 0);
const sessionName = `sq${process.pid}`;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...(options.env || {}) },
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
    }

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      const error = new Error(
        `${command} ${args.join(' ')} failed with ${reason}`,
      );
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(requestedPort, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('Unable to reserve a preview port'));
          return;
        }
        resolve(String(address.port));
      });
    });
  });
}

function waitForPreview(origin, timeoutMs = 30000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    function check() {
      const request = http.get(origin, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      request.on('error', retry);
      request.setTimeout(1000, () => {
        request.destroy();
        retry();
      });
    }

    function retry() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Preview server did not respond at ${origin}`));
        return;
      }
      setTimeout(check, 250);
    }

    check();
  });
}

function startPreview(port) {
  return spawn(npmCommand, ['run', 'preview'], {
    cwd: repoRoot,
    env: { ...process.env, PREVIEW_PORT: port },
    stdio: 'inherit',
  });
}

async function runBrowserSmoke() {
  const port = await findAvailablePort();
  const origin = `http://127.0.0.1:${port}`;
  const sampleImage = path.join(
    repoRoot,
    'src',
    'static-build',
    'assets',
    'icon-large.png',
  );
  const smokeAssetDir = path.join(repoRoot, '.tmp', 'browser-smoke');
  const extensionlessSampleImage = path.join(smokeAssetDir, 'icon-large');

  if (!existsSync(sampleImage)) {
    throw new Error(`Missing smoke-test image: ${sampleImage}`);
  }
  mkdirSync(smokeAssetDir, { recursive: true });
  copyFileSync(sampleImage, extensionlessSampleImage);

  if (process.env.SKIP_BROWSER_SMOKE_BUILD !== '1') {
    await run(npmCommand, ['run', 'build']);
  }

  const preview = startPreview(port);
  let previewExited = false;
  preview.on('exit', () => {
    previewExited = true;
  });

  try {
    await waitForPreview(origin);
    if (previewExited)
      throw new Error('Preview server exited before smoke test');

    await run('playwright-cli', ['-s', sessionName, 'open', origin], {
      capture: true,
    });

    const smokeCode = `
async page => {
  const consoleErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const input = page.locator('input[type=file]').first();
  const selects = page.locator('select');

  async function selectWebPOutput(expectedDownload) {
    await selects.nth(1).selectOption({ label: 'WebP' });
    await page.waitForFunction(
      () => !document.title.startsWith('⏳'),
      null,
      { timeout: 30000 },
    );
    await page.waitForFunction(
      expected =>
        [...document.querySelectorAll('a[download], a[href^="blob:"]')].some(
          anchor =>
            anchor.getAttribute('download') === expected &&
            anchor.href.startsWith('blob:'),
        ),
      expectedDownload,
      { timeout: 30000 },
    );
  }

  async function getBlobDownloads() {
    return page
      .locator('a[download], a[href^=blob]')
      .evaluateAll(elements =>
        elements.map(anchor => ({
          href: anchor.href,
          download: anchor.getAttribute('download'),
        })),
      );
  }

  async function getRightOutputLabel() {
    return selects
      .nth(1)
      .evaluate(element => element.options[element.selectedIndex].text);
  }

  await input.waitFor({
    state: 'attached',
    timeout: 15000,
  });
  await input.setInputFiles(${JSON.stringify(sampleImage)});
  await page.waitForURL('**/editor', { timeout: 15000 });
  await page.waitForFunction(
    () => document.title.includes('icon-large.png'),
    null,
    { timeout: 20000 },
  );
  await page.waitForFunction(
    () => !document.title.startsWith('⏳'),
    null,
    { timeout: 30000 },
  );

  await selectWebPOutput('icon-large.webp');

  const selected = await getRightOutputLabel();
  const links = await getBlobDownloads();
  const webpDownload = links.find(
    link => link.download === 'icon-large.webp' && link.href.startsWith('blob:'),
  );
  const bodyText = await page.locator('body').innerText();

  if (selected !== 'WebP') throw new Error(\`Expected WebP output, got \${selected}\`);
  if (!webpDownload) {
    throw new Error(
      \`Missing icon-large.webp blob download. Links: \${JSON.stringify(links)}\`,
    );
  }
  if (!/(^|\\s)([0-9.]+\\s)?(B|kB|MB)(\\s|$)/.test(bodyText)) {
    throw new Error('Missing visible output size text');
  }

  await page.locator('button[title="Save side settings"]').first().click();
  await page.waitForFunction(
    () => {
      const serialized = localStorage.getItem('rightSideSettings');
      if (!serialized) return false;

      try {
        const saved = JSON.parse(serialized);
        return (
          saved &&
          saved.version === 1 &&
          saved.settings &&
          saved.settings.latestSettings &&
          saved.settings.latestSettings.encoderState &&
          saved.settings.latestSettings.encoderState.type === 'webP'
        );
      } catch {
        return false;
      }
    },
    null,
    { timeout: 5000 },
  );
  const savedRightSideSettings = await page.evaluate(() => {
    const serialized = localStorage.getItem('rightSideSettings');
    if (!serialized) return;
    const saved = JSON.parse(serialized);
    return {
      version: saved.version,
      encoderType: saved.settings.latestSettings.encoderState.type,
    };
  });

  await selects.nth(1).selectOption({ label: 'MozJPEG' });
  await page.waitForFunction(
    () => !document.title.startsWith('⏳'),
    null,
    { timeout: 30000 },
  );
  const changedOutput = await getRightOutputLabel();
  if (changedOutput !== 'MozJPEG') {
    throw new Error(\`Expected temporary MozJPEG output, got \${changedOutput}\`);
  }
  await page.locator('button[title="Import saved side settings"]').first().click();
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('select')].at(1)?.selectedOptions[0]?.text ===
      'WebP',
    null,
    { timeout: 10000 },
  );
  const importedOutput = await getRightOutputLabel();
  if (importedOutput !== 'WebP') {
    throw new Error(\`Expected imported WebP output, got \${importedOutput}\`);
  }

  await page.goto(${JSON.stringify(origin)});
  await input.waitFor({
    state: 'attached',
    timeout: 15000,
  });
  await input.setInputFiles(${JSON.stringify(extensionlessSampleImage)});
  await page.waitForURL('**/editor', { timeout: 15000 });
  await page.waitForFunction(
    () => document.title.includes('icon-large'),
    null,
    { timeout: 20000 },
  );
  await page.waitForFunction(
    () => !document.title.startsWith('⏳'),
    null,
    { timeout: 30000 },
  );
  await selectWebPOutput('icon-large.webp');
  const extensionlessLinks = await getBlobDownloads();
  const extensionlessDownload = extensionlessLinks.find(
    link => link.download === 'icon-large.webp' && link.href.startsWith('blob:'),
  );
  if (!extensionlessDownload) {
    throw new Error(
      \`Missing extensionless icon-large.webp blob download. Links: \${JSON.stringify(
        extensionlessLinks,
      )}\`,
    );
  }

  await page.context().setOffline(true);
  try {
    await page.goto(${JSON.stringify(origin)});
    await input.waitFor({
      state: 'attached',
      timeout: 15000,
    });
  } finally {
    await page.context().setOffline(false);
  }

  if (consoleErrors.length) {
    throw new Error(\`Console errors during smoke: \${consoleErrors.join('\\n')}\`);
  }

  return {
    url: page.url(),
    title: await page.title(),
    selected,
    download: webpDownload.download,
    extensionlessDownload: extensionlessDownload.download,
    offlineAppShell: await page.locator('input[type=file]').first().count(),
    savedRightSideSettings,
    importedOutput,
  };
}
`;

    const result = await run(
      'playwright-cli',
      ['-s', sessionName, 'run-code', smokeCode],
      { capture: true },
    );
    if (result.stdout.includes('### Error')) {
      throw new Error(result.stdout.trim());
    }
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
  } finally {
    await run('playwright-cli', ['-s', sessionName, 'close'], {
      capture: true,
    }).catch(() => {});
    preview.kill('SIGTERM');
  }
}

runBrowserSmoke().catch((error) => {
  console.error(error.message);
  if (error.stdout) console.error(error.stdout);
  if (error.stderr) console.error(error.stderr);
  process.exit(1);
});
