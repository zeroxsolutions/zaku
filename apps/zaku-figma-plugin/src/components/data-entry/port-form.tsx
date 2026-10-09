import { PlugIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { usePortFormSchema } from '@/hooks/use-port-form-schema';
import { useAppForm } from '@/lib/app-form';

type PortFormProps = {
  /**
   * The port the panel keeps dialing and nothing answers on, which the field starts with; null when the user
   * chose to pick a port for the code, and the field starts empty.
   */
  port: number | null;
  /** Called with a port the plugin's manifest admits. */
  onConnect: (port: number) => void;
  /** Offers "Back to the code" when given. */
  onBack?: () => void;
} & React.ComponentProps<typeof Empty>;

function PortForm({ port, onConnect, onBack, ...props }: PortFormProps): React.JSX.Element {
  const schema = usePortFormSchema();
  const form = useAppForm({
    defaultValues: { port: port === null ? '' : String(port) },
    validators: { onChange: schema },
    onSubmit: ({ value }) => onConnect(Number(value.port)),
  });
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
            void form.handleSubmit();
          }}
        >
          <form.AppField name="port">{(field) => <field.PortField label="Port" />}</form.AppField>
          <form.AppForm>
            <form.SubmitButton label="Connect" />
          </form.AppForm>
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
