# SVG

SVG is a vector format: it stores shapes, paths, styles, and text instead of a fixed grid of pixels. When you open an SVG, Frisp can optimize that source as SVG text, keeping the result sharp at every zoom level. The optimizer is **SVGO v4**, running locally in a dedicated browser worker; the file is never uploaded.

## Auto mode

Auto is the default. Frisp tries several precision levels and optional clean-ups, renders every candidate at several sizes on light and dark backgrounds, and rejects candidates that do not visually match the original. It then keeps the smallest verified result. The **Auto:** badge names the winning candidate.

Visual verification is a strong safety check, but it cannot understand every semantic use of an SVG. Check the preview and retain your source file, especially when an SVG contains scripts, external resources, unusual fonts, or metadata used by another tool.

## Manual controls

- **Precision** controls decimal places in coordinates and path data. Lower values save more bytes but increase the risk of visible shape changes.
- **Multipass** lets SVGO repeat its optimizations when one pass exposes more work.
- **Keep title & description** preserves accessibility metadata. Leave this on unless you know those elements are unnecessary.
- **Reuse identical paths** can merge repeated geometry, but may alter structure relied on by styling or scripts.
- **Convert styles to attributes** can shrink some artwork, but can change CSS inheritance and selector behavior.
- **Remove off-canvas paths** discards geometry outside the view box. Hidden geometry may still be intentional.
- **Remove width/height** makes sizing rely on the view box and surrounding layout, which may change how the file embeds.

The last four controls are advanced because they can change document structure or embedding behavior. Enable them one at a time and verify the result.

## Sizes, limits, and downloads

Frisp shows both the raw SVG byte size and a **gzip** comparison. Raw size is the file you download; gzip is a useful estimate for SVG served by a correctly configured web server. Frisp never replaces your source with a larger optimized file: when optimization grows the file, it keeps the original SVG bytes instead.

SVG optimization accepts files up to **5 MB**. The optimizer is deliberately loaded on first SVG use instead of with the initial app shell. Once you have successfully optimized one SVG, those files are cached and SVG optimization is offline-ready for that version of Frisp.

## Raster exports still work

Choosing WebP, AVIF, JPEG XL, JPEG, or PNG for an SVG source works as before: Frisp rasterizes the vector artwork and sends those pixels to the selected image codec. Resize controls, including the **Vector** resize method, apply to those raster exports. An SVG output itself is text-optimized and is never resized.
