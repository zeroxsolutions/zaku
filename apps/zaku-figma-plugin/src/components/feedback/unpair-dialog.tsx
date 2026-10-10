import { UnlinkIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type UnpairDialogProps = {
  /** Called once the user confirms; the pairing cannot come back without a new code. */
  onUnpair: () => void;
} & Omit<React.ComponentProps<typeof AlertDialog>, 'children'>;

/**
 * The Unpair button, and the question it asks before it revokes the pairing, composed as the design system's
 * destructive alert dialog example composes it.
 */
function UnpairDialog({ onUnpair, ...props }: UnpairDialogProps): React.JSX.Element {
  return (
    <AlertDialog {...props}>
      <AlertDialogTrigger render={<Button variant="ghost" size="xs" />}>Unpair</AlertDialogTrigger>
      {/* The recipe is as wide as the panel; this keeps the panel showing at each side, so it reads as a dialog. */}
      <AlertDialogContent size="sm" className="w-[calc(100%-2rem)]">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <UnlinkIcon />
          </AlertDialogMedia>
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
