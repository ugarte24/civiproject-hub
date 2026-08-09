"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { popUiBusy, pushUiBusy } from "@/lib/ui-busy";

function Dialog({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  React.useEffect(() => {
    if (open !== true) return;
    pushUiBusy();
    return () => popUiBusy();
  }, [open]);

  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props} />;
}

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** Se ejecuta antes de cerrar (p. ej. liberar candado de selector de archivos en móvil). */
  onCloseClick?: () => void;
  /** Sin cuerpo con scroll/padding (p. ej. CommandDialog). */
  flush?: boolean;
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, onCloseClick, flush = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-1.5rem)] max-w-lg max-h-[min(90dvh,900px)] translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-full sm:rounded-lg",
        className,
        // El scroll va al cuerpo interno; el botón Cerrar queda fijo y tocable en móvil.
        "overflow-hidden",
      )}
      {...props}
    >
      <DialogPrimitive.Close
        type="button"
        className="absolute right-2 top-2 z-[60] inline-flex size-10 touch-manipulation cursor-pointer items-center justify-center rounded-md text-foreground opacity-90 ring-offset-background transition-opacity hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        onPointerDown={(e) => {
          // Liberar candados antes de que Radix dispare onOpenChange(false).
          e.stopPropagation();
          onCloseClick?.();
        }}
        onClick={() => onCloseClick?.()}
      >
        <X className="size-5 shrink-0" strokeWidth={2.5} />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
      {flush ? (
        children
      ) : (
        <div className="min-h-0 max-h-[min(90dvh,900px)] overflow-y-auto overscroll-contain p-4 pt-12 sm:p-6 sm:pt-12">
          {children}
        </div>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
