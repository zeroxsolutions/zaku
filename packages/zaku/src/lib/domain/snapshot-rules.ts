import type { NodeSnapshot } from '../schema/bridge.js';
import { DEFAULT_COPY, type CopyConfig } from '../schema/zaku-config.js';
import { ALLOWED_OVERRIDES } from './checks/overrides.js';
import { copyIssues, copyPolicy } from './copy-rules.js';
import type { Finding } from './findings.js';
import { DEFAULT_LAYER_NAME } from './layer-names.js';

/**
 * The rules an `execute` is held to, over what the script touched. `copy` is zaku.yaml's copy section; the
 * library copy the touched instances carry is allowed beside it, as zaku check allows it.
 */
export function snapshotFindings(nodes: readonly NodeSnapshot[], copy: CopyConfig = DEFAULT_COPY): Finding[] {
  const policy = copyPolicy(
    copy,
    nodes.flatMap((node) => node.instance?.carried ?? []),
  );
  const findings: Finding[] = [];
  for (const node of nodes) {
    const label = `${node.name} (${node.type.toLowerCase()})`;
    const finding = (check: Finding['check'], field: string | undefined, message: string, nodeId = node.id): void => {
      findings.push({
        check,
        nodeId,
        ...(field ? { field } : {}),
        ...(node.frame ? { frame: node.frame } : {}),
        message,
      });
    };
    if (node.fills.some((paint) => !paint.bound)) finding('binding', 'fill', `${label}: fill is a raw value`);
    if (node.strokes.some((paint) => !paint.bound)) finding('binding', 'stroke', `${label}: stroke is a raw value`);
    if (node.type === 'TEXT' && node.textStyleId === null)
      finding('binding', 'textStyle', `${label}: text has no library text style`);
    for (const space of node.spacing) {
      if (space.value > 0 && !space.bound)
        finding('binding', space.field, `${label}: ${space.field} ${space.value} is not a spacing variable`);
    }
    if (node.characters !== undefined) {
      for (const issue of copyIssues(node.characters, policy))
        finding('copy', issue.field, `${label}: ${issue.message}`);
    }
    if (node.instance) {
      for (const override of node.instance.overrides) {
        if (override.characters !== undefined) {
          for (const issue of copyIssues(override.characters, policy))
            finding('copy', issue.field, `${node.name}: ${issue.message}`, override.nodeId);
        }
        for (const field of override.fields) {
          if (ALLOWED_OVERRIDES.has(field)) continue;
          // As zaku check: a picture is placed as an image fill, so that fill is content.
          if (field === 'fills' && override.picture) continue;
          const self = override.nodeId === node.id;
          if (self && field === 'width' && node.instance.sizing.horizontal !== 'FIXED') continue;
          if (self && field === 'height' && node.instance.sizing.vertical !== 'FIXED') continue;
          finding('overrides', field, `${field} overridden inside an instance of ${node.name}`, override.nodeId);
        }
      }
    }
    if (node.type !== 'TEXT' && DEFAULT_LAYER_NAME.test(node.name))
      finding('naming', undefined, `${node.name} keeps a default name`);
  }
  return findings;
}
