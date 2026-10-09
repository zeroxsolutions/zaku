import type { ICommandHandler } from '@zeroxsolutions/cosmic';
import { inject, injectable } from 'tsyringe';
import { WriteOutline } from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { stringify } from 'yaml';
import { zakuConfigSchema } from '../schema/zaku-config.js';
import { readDesignFile, readOptionalDesignFile } from '../repositories/design-file.js';
import { designPaths } from '../repositories/design-paths.js';
import type { FigmaRest } from '../adapters/figma-rest.js';
import { librarySnapshotSchema } from '../domain/library.js';
import { indexScreens, loadMaps, type LoadedMap, type ScreenRef } from '../repositories/feature-maps.js';
import { parseFrameName, type ParsedFrameName } from '../domain/feature-map.js';
import { outlineFrame } from '../adapters/figma-rest-outline.js';
import { loadOutlines, outlinePath } from '../repositories/outlines.js';
import type { ScreenOutline, Unmapped } from '../domain/outline.js';
import type { RestNode } from '../adapters/figma-rest-types.js';

export interface OutlineSummary {
  skipped: boolean;
  read: number;
  written: string[];
  unmapped: number;
}

/** A frame as the page lists it: where it sits, and whether a flow starts on it. */
export interface ListedFrame {
  id: string;
  name: string;
  page: string;
  containers: string[];
  start: boolean;
}

/** Depth 4 reaches frames inside a page's screen and state Sections. */
const INDEX_DEPTH = 4;

export function listFrames(document: RestNode): ListedFrame[] {
  const out: ListedFrame[] = [];
  for (const page of document.children ?? []) {
    if (page.type !== 'CANVAS') continue;
    const starts = new Set((page.flowStartingPoints ?? []).map((point) => point.nodeId));
    const walk = (node: RestNode, containers: string[]): void => {
      for (const child of node.children ?? []) {
        if (child.type === 'FRAME')
          out.push({
            id: child.id,
            name: child.name,
            page: page.name,
            containers,
            start: starts.has(child.id),
          });
        else if (child.type === 'SECTION') walk(child, [...containers, child.name]);
      }
    };
    walk(page, []);
  }
  return out;
}

/**
 * A frame name drops its feature, so the feature comes from the page, named for it (`Trips` holds
 * `trips`); a title only one feature uses resolves wherever its frame sits.
 */
export function resolveFrame(
  frame: ListedFrame,
  parsed: ParsedFrameName,
  maps: readonly LoadedMap[],
): ScreenRef | undefined {
  const candidates = [...indexScreens(maps).values()].filter((ref) => ref.screen.title === parsed.title);
  const pageFeature = frame.page.trim().toLowerCase().replace(/\s+/g, '-');
  // On a feature's own page only that feature's screens count; a title borrowed from another is a misplaced frame.
  if (maps.some((loaded) => loaded.map.feature === pageFeature))
    return candidates.find((ref) => ref.feature === pageFeature);
  return candidates.length === 1 ? candidates[0] : undefined;
}

/** A frame named like a screen frame, with a slash, that does not parse is a typo, not a note. */
export function looksLikeScreenFrame(name: string): boolean {
  return name.includes('/');
}

export async function runOutline(options: {
  root: string;
  rest: FigmaRest;
  frames: readonly string[] | null;
}): Promise<OutlineSummary> {
  const paths = designPaths(options.root);
  const config = await readDesignFile(paths.config, zakuConfigSchema);
  const fileKey = config.figma.product;
  const { maps, errors } = await loadMaps(paths.maps);
  if (errors[0]) throw errors[0];
  const digests = new Map(maps.map((loaded) => [loaded.map.feature, loaded.digest]));
  const library = await readOptionalDesignFile(paths.library, librarySnapshotSchema);
  const existing = await loadOutlines(paths.outline);

  const file = await options.rest.file(fileKey, INDEX_DEPTH);
  const listed = listFrames(file.document);
  const resolved = new Map<string, { frame: ListedFrame; parsed: ParsedFrameName; ref: ScreenRef }>();
  const unmapped: Unmapped = { fileVersion: file.version, frames: [] };
  for (const frame of listed) {
    const parsed = parseFrameName(frame.name, config.targets);
    if (!parsed) {
      if (looksLikeScreenFrame(frame.name)) unmapped.frames.push({ nodeId: frame.id, name: frame.name });
      continue;
    }
    const ref = resolveFrame(frame, parsed, maps);
    if (ref) resolved.set(frame.id, { frame, parsed, ref });
    else unmapped.frames.push({ nodeId: frame.id, name: frame.name });
  }

  const outlined = new Set(existing.outlines.flatMap((outline) => outline.frames.map((frame) => frame.nodeId)));
  const drawnScreens = new Set([...resolved.values()].map(({ ref }) => `${ref.feature}/${ref.id}`));
  const current =
    existing.outlines.every(
      (outline) =>
        outline.fileVersion === file.version &&
        outline.mapDigest === digests.get(outline.feature) &&
        outline.libraryVersion === (library?.version ?? null),
    ) &&
    [...resolved.keys()].every((id) => outlined.has(id)) &&
    existing.outlines.every((outline) => drawnScreens.has(`${outline.feature}/${outline.screen}`));
  if (options.frames === null && existing.outlines.length > 0 && current) {
    return { skipped: true, read: 0, written: [], unmapped: unmapped.frames.length };
  }

  const ids = options.frames ?? [...resolved.keys()];
  const response = ids.length > 0 ? await options.rest.nodes(fileKey, ids) : { version: file.version, nodes: {} };
  const byScreen = new Map<string, ScreenOutline>();
  if (options.frames !== null) {
    for (const outline of existing.outlines) byScreen.set(`${outline.feature}/${outline.screen}`, outline);
  }
  const interactive = new Set(config.interactive);
  for (const [id, entry] of Object.entries(response.nodes)) {
    const found = resolved.get(id);
    if (!entry || !found) continue;
    const { frame: place, parsed, ref } = found;
    const key = `${ref.feature}/${ref.id}`;
    const outline: ScreenOutline = byScreen.get(key) ?? {
      feature: ref.feature,
      screen: ref.id,
      source: fileKey,
      fileVersion: file.version,
      mapDigest: '',
      libraryVersion: null,
      frames: [],
    };
    const frame = outlineFrame(
      entry.document,
      {
        target: parsed.target.id,
        state: parsed.state,
        containers: place.containers,
        start: place.start,
      },
      { ...entry, interactive },
    );
    outline.frames = [...outline.frames.filter((kept) => kept.nodeId !== id), frame].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    outline.fileVersion = file.version;
    outline.mapDigest = digests.get(ref.feature) ?? '';
    outline.libraryVersion = library?.version ?? null;
    byScreen.set(key, outline);
  }

  // A full read rewrites every drawn screen, so an outline it did not write describes frames that are gone.
  if (options.frames === null) {
    for (const outline of existing.outlines) {
      if (!byScreen.has(`${outline.feature}/${outline.screen}`))
        await rm(outlinePath(paths.outline, outline.feature, outline.screen), { force: true });
    }
  }
  const written: string[] = [];
  for (const outline of byScreen.values()) {
    const path = outlinePath(paths.outline, outline.feature, outline.screen);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, stringify(outline));
    written.push(path);
  }
  await mkdir(paths.outline, { recursive: true });
  await writeFile(paths.unmapped, stringify(unmapped));
  return {
    skipped: false,
    read: ids.length,
    written: written.sort(),
    unmapped: unmapped.frames.length,
  };
}

/** Handles WriteOutline by reading the product file's frames over REST into the outline directory. */
@injectable({ token: TOKENS.COMMAND_HANDLER })
export class WriteOutlineHandler implements ICommandHandler<WriteOutline, OutlineSummary> {
  readonly command = WriteOutline;

  constructor(@inject(TOKENS.FIGMA_REST) private readonly rest: FigmaRest) {}

  handle(command: WriteOutline): Promise<OutlineSummary> {
    return runOutline({ root: command.root, rest: this.rest, frames: command.frames });
  }
}
