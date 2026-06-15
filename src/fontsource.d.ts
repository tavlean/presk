// Fontsource packages ship CSS-only entry points (`@fontsource-variable/<face>`)
// that are imported for their side effect — they register `@font-face` rules and
// export nothing. They carry no TypeScript declarations, so svelte-check's
// side-effect-import resolution flags them. This ambient wildcard declares them
// as empty modules so the type gate passes; the bundler resolves the real CSS at
// build time. Covers the variable-font scope used by +layout.svelte (Outfit) and
// any future `@fontsource-variable/*` faces.
declare module '@fontsource-variable/*';
