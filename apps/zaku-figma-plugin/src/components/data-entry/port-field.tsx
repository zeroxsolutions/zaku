import { useStore } from '@tanstack/react-form';
import { useId } from 'react';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useHydrated } from '@/hooks/use-hydrated';
import { useFieldContext } from '@/lib/form-context';

type PortFieldProps = {
  /** Names the field for assistive tech; it is visually hidden, since the panel's title is the visible heading. */
  label: string;
} & React.ComponentProps<'input'>;

/**
 * A port typed as digits, held as the string the user types; the schema turns it into a port. Its message
 * shows once the form was submitted, so a half-typed port is not refused while it is typed.
 */
function PortField({ label, ...props }: PortFieldProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const id = useId();
  const hydrated = useHydrated();
  const attempted = useStore(field.form.store, (state) => state.submissionAttempts > 0);
  const invalid = attempted && !field.state.meta.isValid;
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <Input
        id={id}
        name={field.name}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        {...props}
        disabled={!hydrated || props.disabled}
      />
      <FieldError errors={invalid ? field.state.meta.errors : []} />
    </Field>
  );
}

export { PortField };
