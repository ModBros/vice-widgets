import { useState } from 'react';

let instances = 0;

/**
 * A prefix for the ids of gradients, masks and clip paths. Every widget
 * instance needs its own, because ids are global to the whole dashboard.
 * React's useId contains colons, which break url(#id) references.
 */
export function useSvgId(): string {
  const [prefix] = useState(() => {
    instances += 1;

    return `vc${instances.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  });

  return prefix;
}
