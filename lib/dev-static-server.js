/**
 * Copyright 2026 Sqush Contributors.
 * Licensed under the Apache License, Version 2.0.
 */
const { spawn } = require('child_process');
const path = require('path');

const port = process.env.DEV_PORT || '5000';
const serveScript = require.resolve('serve/build/main.js');
const serveConfig = path.join(process.cwd(), 'serve.json');

const child = spawn(
  process.execPath,
  [serveScript, '--listen', port, '--config', serveConfig, '.tmp/build/static'],
  {
    stdio: 'inherit',
  },
);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code || 0);
});
