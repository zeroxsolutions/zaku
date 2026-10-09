import { createFormHookContexts } from '@tanstack/react-form';

// Its own module because `app-form.tsx` imports the field components, which import these back; one file
// holding both would be a cycle.
export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();
