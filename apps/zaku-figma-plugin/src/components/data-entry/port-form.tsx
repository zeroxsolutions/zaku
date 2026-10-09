import { PlugIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type PortFormProps = {
  /**
   * The port the panel keeps dialing and nothing answers on, which the field starts with; null when the user
   * chose to pick a port for the code, and the field starts empty.
   */
  port: number | null;
  /** The ports the manifest lets the panel reach; any other is refused with a message naming them. */
  ports: readonly [number, ...number[]];
  /** Called with a port inside `ports`. */
  onConnect: (port: number) => void;
  /** Offers "Back to the code" when given. */
  onBack?: () => void;
} & React.ComponentProps<typeof Empty>;

function PortForm({ port, ports, onConnect, onBack, ...props }: PortFormProps): React.JSX.Element {
  const id = useId();
  const [invalid, setInvalid] = useState(false);
  return (
    <Empty {...props}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PlugIcon />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={2}>
          Connect to zaku-mcp
        </EmptyTitle>
        <EmptyDescription>
          {port === null
            ? 'Ask your agent which port zaku-mcp is on. The code goes to that port only.'
            : `No zaku-mcp answers on port ${port}. Ask your agent for its port.`}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <form
          data-slot="port-form"
          className="flex w-full flex-col items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const typed = String(new FormData(event.currentTarget).get('port') ?? '').trim();
            const asked = ports.find((admitted) => String(admitted) === typed);
            setInvalid(asked === undefined);
            if (asked !== undefined) onConnect(asked);
          }}
        >
          <Field data-invalid={invalid || undefined}>
            {/* The title above is the visible heading; the label names the field for assistive tech. */}
            <FieldLabel htmlFor={id} className="sr-only">
              Port
            </FieldLabel>
            <Input
              id={id}
              name="port"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={port ?? ''}
              aria-invalid={invalid || undefined}
            />
            {invalid && (
              <FieldError>
                Enter a port from {ports[0]} to {ports[ports.length - 1]}.
              </FieldError>
            )}
          </Field>
          <Button type="submit">Connect</Button>
        </form>
        {onBack !== undefined && (
          <Button type="button" variant="link" onClick={onBack}>
            Back to the code
          </Button>
        )}
      </EmptyContent>
    </Empty>
  );
}

export { PortForm };
