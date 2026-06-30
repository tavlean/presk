// Installs the local git hooks (see the `simple-git-hooks` block in
// package.json) as the npm `prepare` step. Dev-machine only: skipped when CI is
// set — GitHub Actions and Cloudflare Pages both set it, and there a hook is
// useless and the checkout may lack a writable `.git`, so running it could fail
// `npm ci` and, on Pages, the deploy. Never throws: a hook-install hiccup must
// not break `npm install`.
import { execFileSync } from 'node:child_process';

if (process.env.CI) {
  process.exit(0);
}

try {
  // No shell: arguments are passed literally, nothing interpolated. Runs only
  // on dev machines (CI is guarded out above), so the POSIX `npx` resolution is
  // fine; a Windows dev that can't resolve it lands in the catch below.
  execFileSync('npx', ['simple-git-hooks'], { stdio: 'inherit' });
} catch (error) {
  console.warn(
    '[prepare] skipped git-hook install:',
    error instanceof Error ? error.message : error,
  );
}
