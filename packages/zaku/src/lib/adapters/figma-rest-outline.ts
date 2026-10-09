import type {
  FrameOutline,
  ImageOutline,
  InstanceOutline,
  LinkOutline,
  RawOutline,
  TextOutline,
} from '../domain/outline.js';
import type { RestComponentMeta, RestNode, RestNodeEntry, RestPaint } from './figma-rest-types.js';
import { DEFAULT_LAYER_NAME } from '../domain/layer-names.js';

export interface OutlineContext {
  components: Record<string, RestComponentMeta>;
  componentSets: RestNodeEntry['componentSets'];
  styles: RestNodeEntry['styles'];
  interactive: ReadonlySet<string>;
}

/** Where a frame sits, read from the page around it rather than from the frame. */
export interface FramePlace {
  target: string;
  state: string;
  containers: string[];
  start: boolean;
}

const CONTAINERS = new Set(['FRAME', 'GROUP', 'SECTION']);
/** A layer whose name says it shows a picture. */
export const PICTURE_NAME = /\b(photo|image|picture|avatar|cover|thumbnail|hero|banner|illustration)\b/i;

const visiblePaint = (paints: RestPaint[] | undefined): boolean =>
  (paints ?? []).some((paint) => paint.visible !== false && (paint.opacity ?? 1) > 0);
const holdsImage = (node: RestNode): boolean =>
  (node.fills ?? []).some((paint) => paint.type === 'IMAGE' && paint.visible !== false);
const shown = (node: RestNode): RestNode[] => (node.children ?? []).filter((child) => child.visible !== false);

/** A subtree's shape, types and nesting only, so a block drawn twice as plain layers compares equal. */
export function signatureOf(node: RestNode): string {
  const children = shown(node);
  return children.length === 0 ? node.type : `${node.type}(${children.map(signatureOf).join(',')})`;
}

function linksOf(node: RestNode): LinkOutline[] {
  const links: LinkOutline[] = [];
  for (const interaction of node.interactions ?? []) {
    for (const action of interaction.actions ?? []) {
      if (action?.type === 'BACK') links.push({ nodeId: node.id, to: 'back' });
      else if (action?.type === 'NODE' && action.destinationId)
        links.push({ nodeId: node.id, to: { nodeId: action.destinationId } });
    }
  }
  if (links.length === 0 && node.transitionNodeID)
    links.push({ nodeId: node.id, to: { nodeId: node.transitionNodeID } });
  return links;
}

export function outlineFrame(frame: RestNode, where: FramePlace, ctx: OutlineContext): FrameOutline {
  const origin = frame.absoluteBoundingBox ?? { x: 0, y: 0, width: 0, height: 0 };
  const instances: InstanceOutline[] = [];
  const texts: TextOutline[] = [];
  const raw: RawOutline[] = [];
  const images: ImageOutline[] = [];
  const defaultNames: { nodeId: string; name: string }[] = [];
  const links: LinkOutline[] = [];

  const relative = (node: RestNode): InstanceOutline['bounds'] => {
    const box = node.absoluteBoundingBox;
    return box ? { x: box.x - origin.x, y: box.y - origin.y, width: box.width, height: box.height } : null;
  };
  const componentOf = (node: RestNode): string => {
    const meta = ctx.components[node.componentId ?? ''];
    const setName = meta?.componentSetId ? ctx.componentSets[meta.componentSetId]?.name : undefined;
    return setName ?? meta?.name ?? node.name;
  };

  /** An instance or a text says what it is through its component or its characters, never through its name. */
  const picture = (node: RestNode): void => {
    if (node.type === 'INSTANCE' || node.type === 'TEXT') return;
    const filled = holdsImage(node);
    if (filled || PICTURE_NAME.test(node.name)) images.push({ nodeId: node.id, name: node.name, filled });
  };

  const inside = (node: RestNode, path: string, instance: InstanceOutline): void => {
    for (const child of shown(node)) {
      const childPath = path ? `${path}/${child.name}` : child.name;
      picture(child);
      links.push(...linksOf(child));
      if (child.type === 'INSTANCE') {
        const component = componentOf(child);
        instance.nested.push({
          nodeId: child.id,
          path: childPath,
          componentKey: ctx.components[child.componentId ?? '']?.key ?? '',
          component,
          interactive: ctx.interactive.has(component),
          bounds: relative(child),
        });
      } else if (child.type === 'TEXT') {
        instance.texts.push({
          nodeId: child.id,
          path: childPath,
          characters: child.characters ?? '',
        });
      }
      inside(child, childPath, instance);
    }
  };

  const instanceOf = (node: RestNode): InstanceOutline => {
    const meta = ctx.components[node.componentId ?? ''];
    const component = componentOf(node);
    const properties: Record<string, string | boolean> = {};
    const swaps: string[] = [];
    for (const [name, property] of Object.entries(node.componentProperties ?? {})) {
      properties[name.replace(/#[^#]*$/, '')] = property.value;
      if (property.type === 'INSTANCE_SWAP' && typeof property.value === 'string') {
        const key = ctx.components[property.value]?.key;
        if (key) swaps.push(key);
      }
    }
    const instance: InstanceOutline = {
      nodeId: node.id,
      component,
      componentKey: meta?.key ?? '',
      variant: meta?.name ?? '',
      properties,
      swaps,
      overrides: (node.overrides ?? []).map((override) => ({
        nodeId: override.id,
        fields: override.overriddenFields,
      })),
      nested: [],
      texts: [],
      interactive: ctx.interactive.has(component),
      local: meta?.remote === false,
      bounds: relative(node),
      sizing: {
        horizontal: node.layoutSizingHorizontal ?? 'FIXED',
        vertical: node.layoutSizingVertical ?? 'FIXED',
      },
    };
    inside(node, '', instance);
    return instance;
  };

  const walk = (node: RestNode): void => {
    links.push(...linksOf(node));
    picture(node);
    if (node.type === 'INSTANCE') {
      instances.push(instanceOf(node));
      return;
    }
    if (DEFAULT_LAYER_NAME.test(node.name)) defaultNames.push({ nodeId: node.id, name: node.name });
    const rawEntry = (reason: string): RawOutline => ({
      nodeId: node.id,
      name: node.name,
      type: node.type,
      reason,
      signature: signatureOf(node),
    });
    if (node.type === 'TEXT') {
      const styleId = node.styles?.['text'];
      const styleKey = styleId ? (ctx.styles[styleId]?.key ?? null) : null;
      texts.push({ nodeId: node.id, characters: node.characters ?? '', styleKey });
      if (styleKey === null) raw.push(rawEntry('a text with no library text style'));
      return;
    }
    if (CONTAINERS.has(node.type)) {
      const painted =
        visiblePaint(node.fills) ||
        visiblePaint(node.strokes) ||
        (node.effects ?? []).some((effect) => effect.visible !== false);
      if (painted) raw.push(rawEntry('a container with its own fill, stroke or effect'));
      for (const child of shown(node)) walk(child);
      return;
    }
    raw.push(rawEntry('a shape outside the library'));
  };

  links.push(...linksOf(frame));
  for (const child of shown(frame)) walk(child);
  return {
    nodeId: frame.id,
    name: frame.name,
    target: where.target,
    state: where.state,
    size: { width: origin.width, height: origin.height },
    containers: where.containers,
    start: where.start,
    instances,
    texts,
    raw,
    images,
    defaultNames,
    links,
  };
}
