/// <reference types="vite/client" />
/// <reference path="../emscripten-types.d.ts" />

declare global {
  namespace App {
    // Shallow-routing state: a history entry marked as the open editor, so
    // browser/in-app Back returns to the intro. See routes/+page.svelte.
    interface PageState {
      editor?: boolean;
    }
  }

  var __squshEmscriptenLocateFile:
    | ((path: string, prefix?: string) => string)
    | undefined;
}

export {};
