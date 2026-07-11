declare global {
  interface Window {
    __svgBench?: {
      runSafe(sourceText: string): Promise<unknown>;
      runAuto(sourceText: string): Promise<unknown>;
    };
  }
}

export {};
