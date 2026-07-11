#!/usr/bin/env node
// Placeholder binary. It exists so the `frisp` name and bin slot are
// reserved while the real CLI is developed at github.com/tavlean/frisp.
console.log(`frisp — target-driven image compression for humans and agents.

This is a placeholder release; the real CLI is in development.
It will compress folders to WebP / AVIF / JPEG XL / jpegli against
perceptual targets ("visually lossless") or explicit quality values,
verified per image with SSIMULACRA2, with JSON output built for agents.

Follow along: https://frisp.app — or use the app there today
(fully client-side, nothing is uploaded).`);
process.exitCode = 0;
