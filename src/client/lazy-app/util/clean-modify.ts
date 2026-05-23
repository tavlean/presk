type CleanSource = unknown[] | object;
type MutableIndexable = Record<string | number, unknown>;

function cleanSetOrMerge<A extends CleanSource>(
  source: A,
  keys: string | number | string[],
  toSetOrMerge: unknown,
  merge: boolean,
): A {
  const splitKeys = Array.isArray(keys) ? keys : ('' + keys).split('.');

  // Going off road in terms of types, otherwise TypeScript doesn't like the access-by-index.
  // The assumptions in this code break if the object contains things which aren't arrays or
  // plain objects.
  let last = copy(source) as MutableIndexable;
  const newObject = last;

  const lastIndex = splitKeys.length - 1;

  for (const [i, key] of splitKeys.entries()) {
    if (i !== lastIndex) {
      // Copy everything along the path.
      last = (last[key] = copy(last[key] as CleanSource)) as MutableIndexable;
    } else {
      // Merge or set.
      last[key] = merge
        ? Object.assign(
            copy(last[key] as CleanSource),
            toSetOrMerge as CleanSource,
          )
        : toSetOrMerge;
    }
  }

  return newObject as A;
}

function copy<A extends CleanSource>(source: A): A {
  // Some type cheating here, as TypeScript can't infer between generic types.
  if (Array.isArray(source)) return [...source] as A;
  return { ...source } as A;
}

/**
 * @param source Object to copy from.
 * @param keys Path to modify, eg "foo.bar.baz".
 * @param toMerge A value to merge into the value at the path.
 */
export function cleanMerge<A extends CleanSource>(
  source: A,
  keys: string | number | string[],
  toMerge: CleanSource,
): A {
  return cleanSetOrMerge(source, keys, toMerge, true);
}

/**
 * @param source Object to copy from.
 * @param keys Path to modify, eg "foo.bar.baz".
 * @param newValue A value to set at the path.
 */
export function cleanSet<A extends CleanSource>(
  source: A,
  keys: string | number | string[],
  newValue: unknown,
): A {
  return cleanSetOrMerge(source, keys, newValue, false);
}
