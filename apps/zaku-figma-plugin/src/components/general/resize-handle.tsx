import { cn } from '@/lib/utils';

type ResizeHandleProps = {
  /** The panel's new size, from the pointer's place in the iframe. */
  onResize: (width: number, height: number) => void;
} & React.ComponentProps<'div'>;

/** Figma gives a plugin's window no frame to drag; this corner is the panel's own. */
function ResizeHandle({ onResize, className, ...props }: ResizeHandleProps): React.JSX.Element {
  return (
    <div
      data-slot="resize-handle"
      aria-hidden="true"
      className={cn('fixed end-0 bottom-0 size-3 cursor-nwse-resize touch-none', className)}
      onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        onResize(Math.round(event.clientX + 6), Math.round(event.clientY + 6));
      }}
      onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
      {...props}
    />
  );
}

export { ResizeHandle };
