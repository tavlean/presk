# Browser support policy

The exact production browser matrix is not final yet.

Until it is finalized, treat Sqush as a modern-browser app and test against current stable desktop browsers:

- Chrome or Chromium-based browsers
- Edge
- Firefox
- Safari

## Required browser capabilities

Sqush depends on browser features that older browsers may not support well:

- WebAssembly
- Web Workers
- dynamic module loading
- Canvas and ImageData
- local file input and drag/drop
- service worker and PWA APIs
- optional WebAssembly SIMD or threads for faster codec paths

## Codec support notes

Browser UI support and codec WASM support are separate concerns. A browser may run the app but still lack native support for previewing or decoding some formats.

Before making a format a default output, verify:

- the encoder works in the browser;
- the output file downloads correctly;
- the output can be previewed or clearly explained if browser preview is not supported;
- the manual QA checklist covers that format.

## Decision needed

Before a public release, choose exact minimum versions for Chrome, Edge, Firefox, and Safari. Do this with current compatibility data and a browser smoke test, not memory.
