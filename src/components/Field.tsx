import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  error,
  children,
  full,
}: {
  label: string;
  error?: string | undefined;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <Label className="label-kicker">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
