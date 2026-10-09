import { createFormHook } from '@tanstack/react-form';
import { useEffect, useRef } from 'react';
import { OtpField } from '@/components/data-entry/otp-field';
import { PortField } from '@/components/data-entry/port-field';
import { SubmitButton } from '@/components/general/submit-button';
import { fieldContext, formContext } from './form-context';

// Called once for the panel. A direct `useForm` anywhere else is a second binding of these same components.
const bound = createFormHook({
  fieldComponents: { OtpField, PortField },
  formComponents: { SubmitButton },
  fieldContext,
  formContext,
});

export const { withForm, withFieldGroup } = bound;

/**
 * The panel's form hook. It validates again whenever the change validator's identity changes, so the schema a
 * form passes is the one its `use<Form>Schema` hook memoises, never one built inline on each render.
 */
export const useAppForm: typeof bound.useAppForm = (options) => {
  const form = bound.useAppForm(options);
  const schema = options.validators?.onChange;
  // Compared against the schema last validated with, not a flag set on the first run: Strict Mode runs a
  // mount effect twice in development, and the second run would validate a form nobody has touched.
  const validated = useRef(schema);
  useEffect(() => {
    if (validated.current === schema) return;
    validated.current = schema;
    void form.validate('change');
  }, [form, schema]);
  return form;
};
