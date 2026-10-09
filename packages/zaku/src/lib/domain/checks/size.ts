import type { PlatformFamily } from '../../schema/zaku-config.js';
import type { FrameOutline, InstanceOutline } from '../outline.js';
import type { Check, Finding } from '../findings.js';

/**
 * The smallest control each platform's guideline asks for, in its own unit: Apple HIG Accessibility's
 * default control size (44x44 pt on iOS and iPadOS, 28x28 pt on macOS), Android's 48x48 dp touch target,
 * Windows' 40x40 epx touch target ("Guidelines for touch targets"), and WCAG 2.2 SC 2.5.8's 24x24 CSS px,
 * which WCAG2ICT applies as written to non-web software and so to GNOME and KDE, whose guidelines state
 * no size.
 */
export const MIN_TARGET: Record<PlatformFamily, number> = {
  ios: 44,
  android: 48,
  web: 24,
  macos: 28,
  windows: 40,
  gnome: 24,
  kde: 24,
};

type Bounds = NonNullable<InstanceOutline['bounds']>;

/** Every control on a frame, those a component wraps included, with its place in the frame. */
function controlsOf(frame: FrameOutline): { nodeId: string; componentKey: string; bounds: Bounds }[] {
  return frame.instances.flatMap((instance) =>
    [instance, ...instance.nested].flatMap((control) =>
      control.interactive && control.bounds
        ? [{ nodeId: control.nodeId, componentKey: control.componentKey, bounds: control.bounds }]
        : [],
    ),
  );
}

export const targetSize: Check = ({ config, outlines, library }) => {
  if (!library) return { notRun: 'library.json is missing' };
  /** A label sets a library control's width, so only its height says it was drawn at its preset size. */
  const presetHeight = new Map<string, number>();
  for (const component of library.components) {
    for (const variant of component.variants) {
      const root = variant.modes[0]?.items.find((item) => item.path === '');
      if (root) presetHeight.set(variant.key, root.height);
    }
  }
  const families = new Map(config.targets.map((target) => [target.id, target.family]));
  const findings: Finding[] = [];
  for (const outline of outlines) {
    for (const frame of outline.frames) {
      const family = families.get(frame.target);
      if (!family) continue;
      const min = MIN_TARGET[family];
      for (const control of controlsOf(frame)) {
        const { width, height } = control.bounds;
        if (width >= min && height >= min) continue;
        const preset = presetHeight.get(control.componentKey);
        if (preset !== undefined && Math.abs(preset - height) <= 0.5) continue;
        findings.push({
          check: 'target-size',
          feature: outline.feature,
          screen: outline.screen,
          frame: frame.name,
          nodeId: control.nodeId,
          message: `${width}x${height} is under ${min}x${min} on ${family}`,
        });
      }
    }
  }
  return { findings };
};

export const overlap: Check = ({ outlines }) => {
  const findings: Finding[] = [];
  for (const outline of outlines) {
    for (const frame of outline.frames) {
      const boxes = controlsOf(frame);
      boxes.forEach((a, i) => {
        for (const b of boxes.slice(i + 1)) {
          const width =
            Math.min(a.bounds.x + a.bounds.width, b.bounds.x + b.bounds.width) - Math.max(a.bounds.x, b.bounds.x);
          const height =
            Math.min(a.bounds.y + a.bounds.height, b.bounds.y + b.bounds.height) - Math.max(a.bounds.y, b.bounds.y);
          if (width > 0 && height > 0) {
            findings.push({
              check: 'overlap',
              feature: outline.feature,
              screen: outline.screen,
              frame: frame.name,
              nodeId: a.nodeId,
              message: `overlaps ${b.nodeId}`,
            });
          }
        }
      });
    }
  }
  return { findings };
};
