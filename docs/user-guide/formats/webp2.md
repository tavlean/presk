# WebP v2 (unstable)

> An experimental, next-generation image format from Google — available in Sqush for tinkering, but **not** a format you should ship to the public yet.

## Overview / When to use it

WebP v2 (also written "WebP2" or "wp2") is an experimental successor to WebP. Sqush labels it **"WebP v2 (unstable)"** on purpose: the format is not finalized, browsers do not display `.wp2` files, and the bitstream can change between codec versions. Use it to experiment and compare — for anything you actually need to publish, reach for a shipping format like WebP, AVIF, or JPEG XL. (A note on jargon: a _codec_ is the software that encodes/decodes an image; _lossy_ means the encoder throws away some detail to shrink the file, while _lossless_ keeps every pixel exactly.)

## Controls / Settings

A few things in this panel are "derived" — instead of a real on/off switch in the file, Sqush figures the state out from the numbers:

- **Lossless** is on whenever **Quality is above 95**. There is no separate lossless field in the format; turning the toggle on simply sets Quality to 100.
- **Separate alpha quality** is on whenever the alpha (transparency) quality differs from the main quality. When it is off, the two are kept locked together.

### Lossless

- **What it does:** Switches between near-perfect, larger files (on) and smaller, lossy files (off). With Lossless on, the image is kept pixel-for-pixel (or near it — see _Slight loss_ below).
- **Range & default:** Checkbox, **off by default** (Quality starts at 75). Turning it on sets `quality = 100`; turning it off drops Quality back to at most 95 (derived from the `quality` option key — there is no real `lossless` field).
- **How to choose:** Turn it on for graphics, screenshots, logos, or line art where crisp edges and flat colors matter and you cannot tolerate any blur. Leave it off for photographs, where lossy compression gives dramatically smaller files at no visible cost.
- **Recommended starting point:** **Off** for photos; **on** for graphics/illustrations with sharp edges.

### Slight loss

- **What it does:** Appears only when **Lossless is on**. It lets you sacrifice a tiny, usually invisible amount of quality to shrink the file further — a middle ground between true lossless and full lossy.
- **Range & default:** Slider **0 to 5**, step 0.1 (it controls the `quality` key inverted, as `quality = 100 − value`, so 0 = perfectly lossless at quality 100, 5 = quality 95).
- **How to choose:** Leave at 0 for guaranteed pixel-perfect output. Nudge it up a little if you want lossless-grade quality but a smaller file and can accept changes you are unlikely to ever notice.
- **Recommended starting point:** **0** — only raise it if file size matters more than absolute fidelity.

### Quality

- **What it does:** Appears only when **Lossless is off**. The master lossy quality dial: higher keeps more detail and makes bigger files; lower compresses harder and can introduce blur or blocky artifacts.
- **Range & default:** Slider **0 to 95**, step 0.1 (`quality`). **Default 75.** (Quality above 95 is reserved for the Lossless toggle.)
- **How to choose:** Most photos look great around 70–80. Drop toward 50–60 when you need the smallest possible files and can accept some softening; push toward 90 when fine detail is critical.
- **Recommended starting point:** **75**, then compare the preview and adjust.

### Separate alpha quality

- **What it does:** _Alpha_ is the transparency channel — the part of an image that says which pixels are see-through. By default Sqush compresses transparency at the same quality as the colors. Turn this on to give transparency its own quality dial.
- **Range & default:** Checkbox, **off by default** (derived from whether `alpha_quality` differs from `quality`). While off, alpha quality automatically tracks the main Quality.
- **How to choose:** Turn it on only when your image has transparency _and_ you want to treat the mask differently from the picture — for example, keeping a crisp transparency edge while compressing the colors harder, or vice versa.
- **Recommended starting point:** **Off** unless you specifically need independent control over transparency.

### Alpha quality

- **What it does:** Appears only when **Separate alpha quality is on**. Sets the quality of the transparency channel independently of the colors.
- **Range & default:** Slider **0 to 100**, step 1 (`alpha_quality`). **Default 75.**
- **How to choose:** Higher keeps transparency edges clean and precise; lower shrinks the file at the cost of fuzzy or fringed edges around transparent areas. Hard-edged cutouts (icons, stickers) want a high value.
- **Recommended starting point:** **100** for clean cutouts; lower only if the alpha channel is soft/gradient and you want extra savings.

### Effort

- **What it does:** How hard the encoder works to find the smallest file. Higher effort can produce a smaller file at the same quality but takes longer to encode. It does **not** change visual quality directly — only how thoroughly the encoder searches. (This control is always visible, in both lossy and lossless modes.)
- **Range & default:** Slider **0 to 9**, step 1 (`effort`). **Default 5.**
- **How to choose:** Raise it when final file size matters and you can wait; lower it for quick previews or batch experiments where speed wins.
- **Recommended starting point:** **5** (the balanced default); try 7–9 for a final, size-optimized export.

## Advanced settings

The **Advanced settings** section (revealed by a toggle) appears **only in lossy mode** (Lossless off). These are fine-tuning knobs; the defaults are sensible and most people never need to touch them.

### Passes

- **What it does:** How many optimization passes the encoder makes over the image. More passes can better allocate bits and slightly improve quality-per-byte, at the cost of speed.
- **Range & default:** Slider **1 to 10**, step 1 (`pass`). **Default 1.**
- **How to choose:** Leave at 1 for normal use. Increase it when squeezing out the last bit of efficiency on a final export; the returns diminish quickly.
- **Recommended starting point:** **1.**

### Spatial noise shaping

- **What it does:** "SNS" steers compression effort toward the parts of the image where the human eye is most sensitive — typically smooth areas and edges — while letting busy, textured regions absorb more compression (where flaws hide). Higher values shift more bits toward perceptually important regions.
- **Range & default:** Slider **0 to 100**, step 1 (`sns`). **Default 50.**
- **How to choose:** The default is a good balance. Raise it if smooth gradients (skies, skin) show banding or blotches; lower it if you would rather distribute quality more evenly.
- **Recommended starting point:** **50.**

### Error diffusion

- **What it does:** Spreads the small rounding errors from compression across neighboring pixels (a form of dithering). This can smooth out visible banding in gradients by trading it for a faint, film-grain-like noise that the eye finds less objectionable.
- **Range & default:** Slider **0 to 100**, step 1 (`error_diffusion`). **Default 0** (off).
- **How to choose:** Turn it up when you see banding in smooth color transitions. Keep it low for flat graphics where you do not want any added texture.
- **Recommended starting point:** **0** — raise it only to fight visible banding.

### Subsample chroma

- **What it does:** _Chroma subsampling_ stores color (chroma) at lower resolution than brightness (luma), because human vision is far more sensitive to brightness detail than to color detail. This is a major size saver for photos. The option chooses how aggressively to do it.
- **Range & default:** Dropdown (`uv_mode`). Choices and their underlying values: **Auto** (`UVModeAuto`, 3), **Vary** (`UVModeAdapt`, 0), **Half** (`UVMode420`, 1), **Off** (`UVMode444`, 2). **Default Auto.**
  - **Auto** lets the encoder decide.
  - **Vary** adapts the amount per region of the image.
  - **Half** uses 4:2:0-style subsampling (color at half resolution) — smaller files, the usual choice for photos.
  - **Off** keeps full-resolution color (4:4:4) — largest files, best for graphics with sharp colored edges or text.
- **How to choose:** Leave on Auto unless you have a specific reason. Choose **Off** if you see colored fringing around sharp edges or text; choose **Half** to force maximum color compression.
- **Recommended starting point:** **Auto.**

### Color space

- **What it does:** The internal color model the encoder transforms your image into before compressing. These transforms (YCoCg, YCbCr, YIQ) all separate brightness from color so the two can be compressed independently; they differ in the exact math and can give slightly different size/quality trade-offs.
- **Range & default:** Dropdown (`csp_type`). Choices: **YCoCg** (`kYCoCg`, 0), **YCbCr** (`kYCbCr`, 1), **YIQ** (`kYIQ`, 3). **Default YCoCg.**
- **How to choose:** This is a deep, experimental tweak. YCoCg is the default and a good all-rounder. Switching is only worth it if you are A/B testing which transform compresses a particular image best — differences are usually small.
- **Recommended starting point:** **YCoCg.**

### Random matrix

- **What it does:** An experimental flag that uses a randomized transform matrix during encoding. It is a research/tuning toggle rather than a feature with a clear, predictable user-facing benefit.
- **Range & default:** Checkbox (`use_random_matrix`). **Default off (false).**
- **How to choose:** Leave it off. Only enable it if you are deliberately experimenting and comparing results.
- **Recommended starting point:** **Off.**

## Tips & pitfalls

- **It will not open anywhere normal.** Browsers, image viewers, and most editors cannot display `.wp2` files. Treat WebP v2 output as a lab experiment, not a deliverable.
- **The bitstream is unstable.** Files made with one codec build may not decode with another. Do not archive anything important as `.wp2`.
- **Lossless is a side effect of Quality.** There is no real lossless switch — pushing Quality above 95 _is_ what turns on lossless mode. If you drag Quality high in lossy mode you will hit the 95 ceiling; flip the Lossless toggle to go all the way to 100.
- **Advanced settings vanish in lossless mode.** Passes, SNS, error diffusion, subsample chroma, color space, and random matrix only appear when Lossless is off. Effort, however, is always available.
- **Separate alpha only matters with transparency.** If your image has no alpha channel, the alpha controls have nothing to act on.
- **Effort is time, not quality.** Cranking Effort up will not make a low-Quality image look better — it just searches harder for a smaller file at the quality you set.
- **One color-space option is hidden.** The codec also defines a "custom" color space (`kCustom`), but the panel deliberately does not offer it — only YCoCg, YCbCr, and YIQ are selectable.

## Under the hood

WebP v2 is built on Google's experimental `libwebp2` codec and runs entirely in your browser via WebAssembly — like every encoder in Sqush, your images never leave your device. The defaults baked into Sqush are Quality 75, Effort 5, Passes 1, Spatial noise shaping 50, Error diffusion 0, Subsample chroma Auto, Color space YCoCg, and Random matrix off, with alpha quality tracking the main Quality until you separate it.
