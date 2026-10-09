import { useStore } from '@tanstack/react-form';
import { PAIRING_CODE_LENGTH } from '@zeroxsolutions/zaku/schema';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useId } from 'react';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { useHydrated } from '@/hooks/use-hydrated';
import { useFieldContext } from '@/lib/form-context';

type OtpFieldProps = {
  /** Names the field for assistive tech; it is visually hidden, since the panel's title is the visible heading. */
  label: string;
  /** Shown under the slots, inside the field, such as the server's refusal of the last code. */
  children?: React.ReactNode;
} & Pick<React.ComponentProps<'input'>, 'aria-invalid' | 'disabled'>;

/**
 * The digits of a one-time code bound to the string field it sits on, in two groups of four slots. A paste of
 * `1234 5678` or `1234-5678` fills it, and the last digit submits the form.
 */
function OtpField({ label, children, ...props }: OtpFieldProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const id = useId();
  const hydrated = useHydrated();
  const attempted = useStore(field.form.store, (state) => state.submissionAttempts > 0);
  const invalid = (attempted && !field.state.meta.isValid) || props['aria-invalid'] === true;
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <div className="flex justify-center">
        <InputOTP
          id={id}
          name={field.name}
          maxLength={PAIRING_CODE_LENGTH}
          pattern={REGEXP_ONLY_DIGITS}
          // The agent shows the code as `1234 5678`; the digits pattern refuses a paste that keeps the space.
          pasteTransformer={(pasted) => pasted.replace(/[\s-]/g, '')}
          value={field.state.value}
          onChange={field.handleChange}
          onBlur={field.handleBlur}
          onComplete={() => void field.form.handleSubmit()}
          aria-invalid={invalid || undefined}
          disabled={!hydrated || props.disabled}
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
      </div>
      <FieldError errors={attempted ? field.state.meta.errors : []} />
      {children}
    </Field>
  );
}

export { OtpField };
