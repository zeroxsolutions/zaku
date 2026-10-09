import { Button } from '@/components/ui/button';
import type { Finding } from '@/lib/panel-state';
import { cn } from '@/lib/utils';

type FindingsListProps = {
  findings: Finding[];
  /** Selects the node in Figma and zooms to it. */
  onSelectNode: (nodeId: string) => void;
  /** False while no file is connected or a command runs, so a check would race it. */
  canCheck: boolean;
  onCheckAgain: () => void;
} & React.ComponentProps<'div'>;

function FindingsList({
  findings,
  onSelectNode,
  canCheck,
  onCheckAgain,
  className,
  ...props
}: FindingsListProps): React.JSX.Element {
  const byCheck = new Map<string, Finding[]>();
  for (const finding of findings) byCheck.set(finding.check, [...(byCheck.get(finding.check) ?? []), finding]);
  return (
    <div data-slot="findings-list" className={cn('flex flex-col gap-3 p-3', className)} {...props}>
      <div data-slot="findings-list-header" className="flex items-center justify-between">
        <h1 className="text-xs font-medium">{findings.length} findings</h1>
        <Button size="sm" variant="outline" disabled={!canCheck} onClick={onCheckAgain}>
          Check again
        </Button>
      </div>
      {[...byCheck].map(([check, group]) => (
        <FindingsListGroup key={check} check={check} count={group.length}>
          {group.map((finding, index) => (
            <FindingsListRow key={`${finding.nodeId ?? ''}-${index}`} finding={finding} onSelectNode={onSelectNode} />
          ))}
        </FindingsListGroup>
      ))}
    </div>
  );
}

type FindingsListGroupProps = { check: string; count: number } & React.ComponentProps<'section'>;

function FindingsListGroup({ check, count, children, className, ...props }: FindingsListGroupProps): React.JSX.Element {
  const name = `${check} (${count})`;
  return (
    <section
      data-slot="findings-list-group"
      aria-label={name}
      className={cn('flex flex-col gap-1', className)}
      {...props}
    >
      <h2 className="text-muted-foreground text-xs font-medium">{name}</h2>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

type FindingsListRowProps = { finding: Finding; onSelectNode: (nodeId: string) => void } & React.ComponentProps<'li'>;

function FindingsListRow({ finding, onSelectNode, className, ...props }: FindingsListRowProps): React.JSX.Element {
  const { nodeId } = finding;
  return (
    <li data-slot="findings-list-row" className={cn('text-xs', className)} {...props}>
      {nodeId === undefined ? (
        <p className="px-2 py-1.5">{finding.message}</p>
      ) : (
        <button
          type="button"
          className="hover:bg-accent focus-visible:ring-ring w-full rounded-md px-2 py-1.5 text-start outline-none focus-visible:ring-2"
          onClick={() => onSelectNode(nodeId)}
        >
          {finding.message}
        </button>
      )}
    </li>
  );
}

export { FindingsList };
