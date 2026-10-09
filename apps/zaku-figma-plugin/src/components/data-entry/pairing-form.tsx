import type { RefusalReason } from '@zeroxsolutions/zaku/schema';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PAIRING_FORM_REFUSALS = {
  'wrong-code': 'That code is not right. Check it and try again.',
  'expired-code': 'That code has expired. Ask your agent for a new one.',
  'used-up-code': 'This code was used up by wrong attempts. Ask your agent for a new one.',
  'unknown-token': 'zaku-mcp no longer knows this plugin. Ask your agent to pair with zaku again.',
} as const satisfies Record<RefusalReason, string>;

type PairingFormProps = {
  /** Why the server refused the last credential; null before any refusal and once the user tries again. */
  refusal: RefusalReason | null;
  /** Called with the digits alone: the spaces and dashes a person types between them are stripped. */
  onPair: (code: string) => void;
} & Omit<React.ComponentProps<'form'>, 'onSubmit'>;

function PairingForm({ refusal, onPair, className, ...props }: PairingFormProps): React.JSX.Element {
  const id = useId();
  const invalid = refusal !== null;
  return (
    <form
      data-slot="pairing-form"
      className={cn('p-3', className)}
      onSubmit={(event) => {
        event.preventDefault();
        const code = String(new FormData(event.currentTarget).get('code') ?? '').replace(/[\s-]/g, '');
        if (code !== '') onPair(code);
      }}
      {...props}
    >
      <FieldGroup>
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor={id}>Pairing code</FieldLabel>
          <Input
            id={id}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="1234 5678"
            aria-invalid={invalid || undefined}
          />
          <FieldDescription>Not paired. Ask your agent to pair with zaku, then type the code here.</FieldDescription>
          {invalid && <FieldError>{PAIRING_FORM_REFUSALS[refusal]}</FieldError>}
        </Field>
        <Field orientation="horizontal">
          <Button type="submit">Pair</Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

export { PairingForm };
