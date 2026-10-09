import {
  ChevronRightIcon,
  CircleAlertIcon,
  ComponentIcon,
  ContrastIcon,
  ImageIcon,
  LayersIcon,
  LibraryIcon,
  type LucideIcon,
  PaintBucketIcon,
  PaletteIcon,
  PointerIcon,
  SquareStackIcon,
  TagIcon,
  TextQuoteIcon,
  TypeIcon,
  WorkflowIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import type { Finding } from '@/lib/panel-state';
import { cn } from '@/lib/utils';

const FINDINGS_LIST_CHECK_LABELS: Record<Finding['check'], string> = {
  schema: 'Document schema',
  reachability: 'Reachability',
  'way-back': 'Way back',
  coverage: 'Coverage',
  library: 'Library components',
  overrides: 'Overrides',
  binding: 'Token binding',
  recipe: 'Recipe',
  font: 'Fonts',
  copy: 'Copy',
  'target-size': 'Target size',
  overlap: 'Overlap',
  tokens: 'Tokens',
  contrast: 'Contrast',
  freshness: 'Freshness',
  images: 'Images',
  frame: 'Frames',
  'system-bars': 'System bars',
  placement: 'Placement',
  naming: 'Layer naming',
  component: 'Components',
  prototype: 'Prototype',
};

/** A rule with no icon of its own takes the alert. */
const FINDINGS_LIST_CHECK_ICONS: Partial<Record<Finding['check'], LucideIcon>> = {
  binding: PaintBucketIcon,
  tokens: PaletteIcon,
  naming: TagIcon,
  overrides: LayersIcon,
  library: LibraryIcon,
  component: ComponentIcon,
  font: TypeIcon,
  copy: TextQuoteIcon,
  contrast: ContrastIcon,
  'target-size': PointerIcon,
  overlap: SquareStackIcon,
  images: ImageIcon,
  prototype: WorkflowIcon,
};

type FindingsListProps = {
  findings: Finding[];
  /** Selects the node in Figma and zooms to it. */
  onSelectNode: (nodeId: string) => void;
} & React.ComponentProps<'div'>;

function FindingsList({ findings, onSelectNode, className, ...props }: FindingsListProps): React.JSX.Element {
  const byCheck = new Map<Finding['check'], Finding[]>();
  for (const finding of findings) byCheck.set(finding.check, [...(byCheck.get(finding.check) ?? []), finding]);
  return (
    <div data-slot="findings-list" className={cn('flex flex-col gap-4 p-3', className)} {...props}>
      {[...byCheck].map(([check, group]) => (
        <FindingsListGroup key={check} label={FINDINGS_LIST_CHECK_LABELS[check]} count={group.length}>
          {group.map((finding, index) => (
            <FindingsListRow key={`${finding.nodeId ?? ''}-${index}`} finding={finding} onSelectNode={onSelectNode} />
          ))}
        </FindingsListGroup>
      ))}
    </div>
  );
}

type FindingsListGroupProps = { label: string; count: number } & React.ComponentProps<'section'>;

function FindingsListGroup({ label, count, children, className, ...props }: FindingsListGroupProps): React.JSX.Element {
  return (
    <section
      data-slot="findings-list-group"
      aria-label={`${label}, ${count} ${count === 1 ? 'finding' : 'findings'}`}
      className={cn('flex flex-col gap-1', className)}
      {...props}
    >
      <h2 className="flex items-center gap-2 px-2.5 text-xs font-medium">
        {label}
        <Badge variant="secondary">{count}</Badge>
      </h2>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

type FindingsListRowProps = { finding: Finding; onSelectNode: (nodeId: string) => void } & React.ComponentProps<'li'>;

function FindingsListRow({ finding, onSelectNode, className, ...props }: FindingsListRowProps): React.JSX.Element {
  const { check, nodeId, frame, field, message } = finding;
  const Icon = FINDINGS_LIST_CHECK_ICONS[check] ?? CircleAlertIcon;
  const content = (
    <>
      <ItemMedia variant="icon" className="text-muted-foreground">
        <Icon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="text-xs">{message}</ItemTitle>
        {(frame !== undefined || field !== undefined) && (
          <ItemDescription className="flex items-center gap-1.5 text-xs">
            {frame !== undefined && <span className="truncate">{frame}</span>}
            {field !== undefined && <Badge variant="outline">{field}</Badge>}
          </ItemDescription>
        )}
      </ItemContent>
    </>
  );
  return (
    <li data-slot="findings-list-row" className={className} {...props}>
      {nodeId === undefined ? (
        <Item size="xs">{content}</Item>
      ) : (
        <Item
          size="xs"
          render={<button type="button" onClick={() => onSelectNode(nodeId)} />}
          className="hover:bg-muted text-start"
        >
          {content}
          <ItemActions>
            <ChevronRightIcon className="text-muted-foreground size-4 opacity-0 group-hover/item:opacity-100 group-focus-visible/item:opacity-100" />
          </ItemActions>
        </Item>
      )}
    </li>
  );
}

export { FindingsList };
