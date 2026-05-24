/** Creates a function ref that assigns its value to a given property of an object.
 *  @example
 *  // element is stored as `this.foo` when rendered.
 *  <div ref={linkRef(this, 'foo')} />
 */
export function linkRef<T>(obj: object, name: string): (value: T) => void {
  const refs = obj as Record<string, unknown>;
  const refName = `$$ref_${name}`;
  let ref = refs[refName] as ((value: T) => void) | undefined;
  if (!ref) {
    ref = (value: T) => {
      refs[name] = value;
    };
    refs[refName] = ref;
  }
  return ref;
}
