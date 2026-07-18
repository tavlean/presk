// What a lab skin opens with. Module-level so switching skins via the lab tab
// bar keeps the image being judged; before anything is picked, skins fall back
// to the bundled sample photo so every tab opens straight into a working
// editor instead of a drop screen. Dev-only by construction: nothing outside
// $lib/lab imports this, and lab routes are stripped from production builds.
import sampleUrl from '../../../tests/fixtures/photo.jpg?url';

let current: File | null = null;

/** Record the file the user actively brought into any lab skin. */
export function rememberLabSource(file: File): void {
  current = file;
}

/** The file a freshly mounted skin should open: last picked, else the sample. */
export async function labSourceFile(): Promise<File> {
  if (!current) {
    const blob = await (await fetch(sampleUrl)).blob();
    current = new File([blob], 'sample-photo.jpg', { type: 'image/jpeg' });
  }
  return current;
}
