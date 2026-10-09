import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
} & Omit<React.ComponentProps<'form'>, 'onSubmit'>;

function PortForm({ port, ports, onConnect, onBack, className, ...props }: PortFormProps): React.JSX.Element {
  const id = useId();
  const [invalid, setInvalid] = useState(false);
  return (
    <form
      data-slot="port-form"
      className={cn('p-3', className)}
      onSubmit={(event) => {
        event.preventDefault();
        const typed = String(new FormData(event.currentTarget).get('port') ?? '').trim();
        const asked = ports.find((admitted) => String(admitted) === typed);
        setInvalid(asked === undefined);
        if (asked !== undefined) onConnect(asked);
      }}
      {...props}
    >
      <FieldGroup>
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor={id}>Port</FieldLabel>
          <Input
            id={id}
            name="port"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={port ?? ''}
            aria-invalid={invalid || undefined}
          />
          <FieldDescription>
            {port === null
              ? 'Ask your agent which port zaku-mcp is on. The code goes to that port only.'
              : `No zaku-mcp answers on port ${port}. Ask your agent for its port.`}
          </FieldDescription>
          {invalid && (
            <FieldError>
              Enter a port from {ports[0]} to {ports[ports.length - 1]}.
            </FieldError>
          )}
        </Field>
        <Field orientation="horizontal">
          <Button type="submit">Connect</Button>
          {onBack !== undefined && (
            <Button type="button" variant="ghost" onClick={onBack}>
              Back to the code
            </Button>
          )}
        </Field>
      </FieldGroup>
    </form>
  );
}

export { PortForm };
