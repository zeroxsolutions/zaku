import type { RefusalReason } from '@zeroxsolutions/zaku/schema';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

const PAIRING_FORM_REFUSALS = {
  'wrong-code': 'That code is not right. Check it and try again.',
  'expired-code': 'That code has expired. Ask your agent for a new one.',
  'used-up-code': 'This code was used up by wrong attempts. Ask your agent for a new one.',
  'unknown-token': 'zaku-mcp no longer knows this plugin. Ask your agent to pair with zaku again.',
} as const satisfies Record<RefusalReason, string>;

/** The digits a pairing code has; zaku-mcp shows them as two groups of four. */
const PAIRING_CODE_LENGTH = 8;

type PairingFormProps = {
  /** Why the server refused the last credential; null before any refusal and once the user tries again. */
  refusal: RefusalReason | null;
  /** Called with the eight digits once the last one is typed or pasted. */
  onPair: (code: string) => void;
  /** Offers "Use another port" when given, for a code that went to, or would go to, the wrong zaku-mcp. */
  onUseAnotherPort?: () => void;
} & Omit<React.ComponentProps<'form'>, 'onSubmit'>;

function PairingForm({ refusal, onPair, onUseAnotherPort, className, ...props }: PairingFormProps): React.JSX.Element {
  const id = useId();
  const [code, setCode] = useState('');
  const [shownRefusal, setShownRefusal] = useState(refusal);
  // A refused code is spent, so the field empties for the next one; the digits stay while one is in flight.
  if (refusal !== shownRefusal) {
    setShownRefusal(refusal);
    if (refusal !== null) setCode('');
  }
  const invalid = refusal !== null;
  return (
    <form
      data-slot="pairing-form"
      className={cn('p-3', className)}
      onSubmit={(event) => event.preventDefault()}
      {...props}
    >
      <FieldGroup>
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor={id}>Pairing code</FieldLabel>
          <InputOTP
            id={id}
            name="code"
            maxLength={PAIRING_CODE_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            // The agent shows the code as `1234 5678`; the digits pattern refuses a paste that keeps the space.
            pasteTransformer={(pasted) => pasted.replace(/[\s-]/g, '')}
            value={code}
            onChange={setCode}
            onComplete={onPair}
            aria-invalid={invalid || undefined}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} aria-invalid={invalid || undefined} />
              <InputOTPSlot index={1} aria-invalid={invalid || undefined} />
              <InputOTPSlot index={2} aria-invalid={invalid || undefined} />
              <InputOTPSlot index={3} aria-invalid={invalid || undefined} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={4} aria-invalid={invalid || undefined} />
              <InputOTPSlot index={5} aria-invalid={invalid || undefined} />
              <InputOTPSlot index={6} aria-invalid={invalid || undefined} />
              <InputOTPSlot index={7} aria-invalid={invalid || undefined} />
            </InputOTPGroup>
          </InputOTP>
          <FieldDescription>Ask your agent to pair with zaku, then type the code here.</FieldDescription>
          {invalid && <FieldError>{PAIRING_FORM_REFUSALS[refusal]}</FieldError>}
        </Field>
        {onUseAnotherPort !== undefined && (
          <Field orientation="horizontal">
            <Button type="button" variant="ghost" onClick={onUseAnotherPort}>
              Use another port
            </Button>
          </Field>
        )}
      </FieldGroup>
    </form>
  );
}

export { PairingForm };
