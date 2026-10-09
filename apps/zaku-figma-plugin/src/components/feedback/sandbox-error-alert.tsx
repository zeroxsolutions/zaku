import { CircleAlertIcon, XIcon } from 'lucide-react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type SandboxErrorAlertProps = {
  /** Closes the alert. */
  onDismiss: () => void;
  /** Sends the command that threw again; the Retry button shows only when given. */
  onRetry?: () => void;
} & React.ComponentProps<typeof Alert>;

/** A throw in Figma's sandbox that no command answered; the error's own text arrives as children. */
function SandboxErrorAlert({ onDismiss, onRetry, children, ...props }: SandboxErrorAlertProps): React.JSX.Element {
  return (
    <Alert variant="destructive" {...props}>
      <CircleAlertIcon />
      <AlertTitle>The plugin hit an error in Figma</AlertTitle>
      <AlertDescription>
        {children}
        {onRetry !== undefined && (
          <div>
            <Button size="xs" variant="outline" onClick={() => onRetry()}>
              Retry
            </Button>
          </div>
        )}
      </AlertDescription>
      <AlertAction>
        <Button size="icon-xs" variant="ghost" aria-label="Dismiss" onClick={() => onDismiss()}>
          <XIcon />
        </Button>
      </AlertAction>
    </Alert>
  );
}

export { SandboxErrorAlert };
