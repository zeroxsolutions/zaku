import { Button } from '@/components/ui/button';
import { useHydrated } from '@/hooks/use-hydrated';
import { useFormContext } from '@/lib/form-context';

/** The one button that submits; it subscribes to the single slice it renders. */
function SubmitButton({ label }: { label: string }): React.JSX.Element {
  const form = useFormContext();
  const hydrated = useHydrated();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={!hydrated || isSubmitting}>
          {label}
        </Button>
      )}
    </form.Subscribe>
  );
}

export { SubmitButton };
