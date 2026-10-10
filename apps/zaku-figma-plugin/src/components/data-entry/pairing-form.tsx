import type { RefusalReason } from '@zeroxsolutions/zaku/schema';
import { KeyRoundIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { FieldError } from '@/components/ui/field';
import { usePairingFormSchema } from '@/hooks/use-pairing-form-schema';
import { useAppForm } from '@/lib/app-form';

const PAIRING_FORM_REFUSALS = {
  'wrong-code': 'That code is not right. Check it and try again.',
  'expired-code': 'That code has expired. Ask your agent for a new one.',
  'used-up-code': 'This code was used up by wrong attempts. Ask your agent for a new one.',
  'unknown-token': 'No zaku-mcp running here knows this plugin. Ask your agent to pair with zaku again.',
} as const satisfies Record<RefusalReason, string>;

type PairingFormProps = {
  /** Why the server refused the last credential; null before any refusal and once the user tries again. */
  refusal: RefusalReason | null;
  /** Called with the eight digits once the last one is typed or pasted. */
  onPair: (code: string) => void;
  /** Offers "Use another port" when given, for a code that went to, or would go to, the wrong zaku-mcp. */
  onUseAnotherPort?: () => void;
} & React.ComponentProps<typeof Empty>;

function PairingForm({ refusal, onPair, onUseAnotherPort, ...props }: PairingFormProps): React.JSX.Element {
  const schema = usePairingFormSchema();
  const form = useAppForm({
    defaultValues: { code: '' },
    validators: { onChange: schema },
    onSubmit: ({ value }) => onPair(value.code),
  });
  // A refused code is spent, so the field empties for the next one; the digits stay while one is in flight.
  useEffect(() => {
    if (refusal !== null) form.reset();
  }, [form, refusal]);
  const invalid = refusal !== null;
  return (
    <Empty {...props}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KeyRoundIcon />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={2}>
          Pair with your agent
        </EmptyTitle>
        <EmptyDescription>Ask your agent to pair with zaku, then type the code here.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <form
          data-slot="pairing-form"
          className="w-full"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.AppField name="code">
            {(field) => (
              <field.OtpField label="Pairing code" aria-invalid={invalid || undefined}>
                {invalid && <FieldError>{PAIRING_FORM_REFUSALS[refusal]}</FieldError>}
              </field.OtpField>
            )}
          </form.AppField>
        </form>
        {onUseAnotherPort !== undefined && (
          <Button type="button" variant="link" onClick={onUseAnotherPort}>
            Use another port
          </Button>
        )}
      </EmptyContent>
    </Empty>
  );
}

export { PairingForm };
