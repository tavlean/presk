<script lang="ts">
  // L4 "Adaptive dock": L1's focus-first layout with a dock that changes shape
  // with the image count. The strip height follows the count-driven layout so
  // the stage adapts smoothly as images are added mid-session.
  import type { EditorSession } from '$lib/editor/editor-session.svelte';
  import { labBulk } from './store.svelte';
  import FocusView from './FocusView.svelte';
  import AdaptiveStrip from './AdaptiveStrip.svelte';

  interface Props {
    focusSession: EditorSession;
    onReseed: () => void;
  }

  let { focusSession, onReseed }: Props = $props();

  const count = $derived(labBulk.stripItems.length);

  // Height mirrors AdaptiveStrip's own thresholds:
  //   ≤6   big rich cells (like L3's L)     → 210
  //   7–18 medium single row (like L3's M)  → 148
  //   >18  dense two-row capped dock        → 264 (fits two ~92px cells + caption
  //        + gap; the dock scrolls internally if two rows still overflow).
  const stripHeight = $derived(count <= 6 ? 210 : count <= 18 ? 148 : 264);
</script>

<FocusView {focusSession} {onReseed} {stripHeight} strip={adaptiveStrip} />

{#snippet adaptiveStrip()}
  <AdaptiveStrip />
{/snippet}
