<script lang="ts">
  // L3 "Rich strip": focus-first layout with a size-adjustable dock. The
  // strip height follows the S/M/L choice so the stage shrinks/grows to match.
  import type { EditorSession } from '$lib/editor/editor-session.svelte';
  import { labBulk } from './store.svelte';
  import FocusView from './FocusView.svelte';
  import RichStrip from './RichStrip.svelte';

  interface Props {
    focusSession: EditorSession;
    onReseed: () => void;
  }

  let { focusSession, onReseed }: Props = $props();

  // Strip-region height per size. S is compact; M taller; L browsing-first.
  // Each pairs the StripCell thumb (16/10 at the cell width) with its caption.
  const STRIP_HEIGHT: Record<'s' | 'm' | 'l', number> = {
    s: 104,
    m: 148,
    l: 210,
  };
  const stripHeight = $derived(STRIP_HEIGHT[labBulk.stripSize]);
</script>

<FocusView {focusSession} {onReseed} {stripHeight} strip={richStrip} />

{#snippet richStrip()}
  <RichStrip />
{/snippet}
