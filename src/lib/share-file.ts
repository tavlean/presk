/**
 * Web Share (Level 2) for encoded outputs — the OS share sheet.
 *
 * Exists because a blob `<a download>` can never reach the photo library:
 * iOS files it under Files → Downloads (and an installed PWA may open a
 * dead-end Quick Look preview instead of downloading), Android under
 * Downloads. The share sheet is the platform's intended path — on iOS it
 * offers "Save Image" straight into Photos. Behavior notes and citations:
 * docs/mobile-save-ux.md.
 */

/** True when the OS share sheet would accept exactly this file. */
export function canShareFile(file: File | null | undefined): file is File {
  return (
    !!file &&
    typeof navigator !== 'undefined' &&
    !!navigator.canShare &&
    navigator.canShare({ files: [file] })
  );
}

/**
 * Open the share sheet for one file. Resolves to a user-facing message when
 * sharing failed, null on success or when the user simply closed the sheet.
 *
 * Call it directly from the tap handler with an already-encoded file —
 * transient user activation expires, so never encode first on the same tap.
 * Share `files` alone: WebKit can drop the file when text/url ride along
 * (WebKit bug 251500).
 */
export async function share(file: File): Promise<string | null> {
  try {
    await navigator.share({ files: [file] });
    return null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    return "Couldn't open the share sheet.";
  }
}
