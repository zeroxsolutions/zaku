import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type UnpairDialogProps = {
  /** Called once the user confirms; the pairing cannot come back without a new code. */
  onUnpair: () => void;
} & Omit<React.ComponentProps<typeof AlertDialog>, 'children'>;

/** The Unpair button, and the question it asks before it revokes the pairing. */
function UnpairDialog({ onUnpair, ...props }: UnpairDialogProps): React.JSX.Element {
  return (
    <AlertDialog {...props}>
      <AlertDialogTrigger render={<Button variant="ghost" size="xs" />}>Unpair</AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Unpair zaku?</AlertDialogTitle>
          <AlertDialogDescription>
            zaku-mcp forgets this plugin. To connect again, ask your agent for a new pairing code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => onUnpair()}>
            Unpair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { UnpairDialog };
