# Manual QA checklist

Use this checklist before releases and after changes touching build tooling, workers, codecs, service workers, image processing, or editor behavior.

## Setup

1. Run `npm run check`.
2. Run `npm run preview`.
3. Open the preview URL in a browser.
4. Hard refresh once.

## App shell

- Page title is `Sqush`.
- Logo and drop target render.
- No visible error overlay appears.
- Browser console has no unexpected errors.

## Single-image workflow

- Open a JPEG file.
- Open a PNG file.
- Open a WebP file.
- Open an AVIF file if one is available.
- Verify the editor opens for each file.
- Verify the before/after comparison renders.
- Change the output encoder.
- Change quality or another encoder option.
- Enable resize and change dimensions.
- Enable quantize if available.
- Rotate the input.
- Verify output size updates.
- Download the generated output.
- Use the back button and confirm the app returns to the import screen.

## Saved settings

- Change left and right side settings.
- Refresh the app.
- Reopen an image.
- Confirm saved settings are restored.
- Clear browser site data.
- Reopen the app and confirm invalid or missing saved settings do not break startup.

## Production-build behavior

- Run `npm run build`.
- Run `npm run preview`.
- Open the preview URL.
- Hard refresh.
- Confirm the app still loads.
- Confirm the drop target still works.
- Confirm the service worker does not serve stale broken assets.

## Playwright CLI smoke

Use the system `playwright-cli` setup documented at `/Users/tav/Development/docs/playwright-cli-system-setup.md`. Do not add Playwright packages to this repo just to run this local smoke flow.

1. Run `npm run build`.
2. Run `PREVIEW_PORT=5001 npm run preview`.
3. In another terminal, run:

```sh
playwright-cli -s=sqush-smoke open http://127.0.0.1:5001
playwright-cli -s=sqush-smoke snapshot
playwright-cli -s=sqush-smoke click e11
playwright-cli -s=sqush-smoke upload /Users/tav/Development/Tavlean/SquooshPlus/src/static-build/assets/icon-large.png
playwright-cli -s=sqush-smoke console error
playwright-cli -s=sqush-smoke close
```

The `click` ref is the empty icon button that opens the file chooser in the preceding snapshot; refresh the snapshot and use the current ref if it changes.

Expected result: the upload navigates to `/editor`, the title becomes `icon-large.png - Sqush`, and `console error` reports zero errors.

## Bulk foundation checks

Bulk UI is not implemented yet. For now, verify the backend helpers through:

```sh
npm run test:helpers
```

Before implementing the bulk UI, add browser checks for:

- multiple file import;
- per-image status display;
- global settings changes;
- per-image overrides;
- failed image handling;
- export-all behavior;
- object URL cleanup.
