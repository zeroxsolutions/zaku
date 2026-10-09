import { CircleCheckIcon, ScanSearchIcon, UnplugIcon } from 'lucide-react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

/** Why the panel has no findings to list: no server yet, no check yet, or a check that found nothing. */
type FindingsEmptyReason = 'disconnected' | 'unchecked' | 'clean';

type FindingsEmptyProps = {
  reason: FindingsEmptyReason;
  /** The ports the panel looks for zaku-mcp on, as a person reads them, such as `7337-7346`. */
  ports: string;
} & React.ComponentProps<typeof Empty>;

function FindingsEmpty({ reason, ports, ...props }: FindingsEmptyProps): React.JSX.Element {
  const {
    icon: Icon,
    title,
    description,
  } = {
    disconnected: {
      icon: UnplugIcon,
      title: 'Waiting for zaku-mcp',
      description: `Start your agent with the zaku MCP server. The panel looks for it on ports ${ports}.`,
    },
    unchecked: {
      icon: ScanSearchIcon,
      title: 'Check this page',
      description: 'zaku looks for raw values, default names and drift from the design system.',
    },
    clean: {
      icon: CircleCheckIcon,
      title: 'This page is clean',
      description: 'The last check found nothing to fix.',
    },
  }[reason];
  return (
    <Empty data-slot="findings-empty" data-reason={reason} {...props}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export { FindingsEmpty, type FindingsEmptyReason };
