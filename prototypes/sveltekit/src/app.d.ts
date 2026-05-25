/// <reference types="vite/client" />
/// <reference path="../../../emscripten-types.d.ts" />

declare global {
  namespace App {}

  var __squshEmscriptenLocateFile:
    | ((path: string, prefix?: string) => string)
    | undefined;
}

export {};
