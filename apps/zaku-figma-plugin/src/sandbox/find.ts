type Named = { name: string; children?: readonly Named[] };

/** A node by its names from the page down, `Frame/Layer`; a leading page name is allowed. The first match at each level wins. */
export function findByPath(page: PageNode, path: string): SceneNode | null {
  const root = page as unknown as Named;
  const segments = path.split('/').filter((segment) => segment.length > 0);
  if (segments[0] === root.name) segments.shift();
  let current: Named | undefined = root;
  for (const segment of segments) {
    current = current?.children?.find((child) => child.name === segment);
    if (!current) return null;
  }
  return current === root ? null : (current as unknown as SceneNode);
}
