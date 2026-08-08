import { useEffect, useState, type ComponentProps } from "react";
import { CalendarIcon } from "lucide-react";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** ISO `YYYY-MM-DD` → `dd/mm/aaaa` */
export function isoToDmy(iso: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** `dd/mm/aaaa` → ISO `YYYY-MM-DD` o "" si incompleto/inválido */
export function dmyToIso(dmy: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy.trim());
  if (!m) return "";
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return "";
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return "";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isoToDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return undefined;
  return dt;
}

function dateToIso(dt: Date): string {
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

/** Solo dígitos → máscara dd/mm/aaaa */
function maskDmy(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

type DateInputProps = Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
  /** Valor en ISO `YYYY-MM-DD` (como `type="date"`) */
  value: string;
  onChange: (iso: string) => void;
};

/**
 * Fecha dd/mm/aaaa + icono de calendario (selector).
 * Emite ISO `YYYY-MM-DD` para el estado del formulario.
 */
export function DateInput({ value, onChange, onBlur, className, disabled, ...props }: DateInputProps) {
  const [text, setText] = useState(() => isoToDmy(value));
  const [open, setOpen] = useState(false);
  const selected = isoToDate(value);

  useEffect(() => {
    setText(isoToDmy(value));
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Input
        {...props}
        disabled={disabled}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        className="pr-10"
        value={text}
        onChange={(e) => {
          const next = maskDmy(e.target.value);
          setText(next);
          if (!next) {
            onChange("");
            return;
          }
          const iso = dmyToIso(next);
          if (iso) onChange(iso);
        }}
        onBlur={(e) => {
          const iso = dmyToIso(text);
          if (iso) {
            setText(isoToDmy(iso));
            onChange(iso);
          } else if (!text.trim()) {
            onChange("");
            setText("");
          } else {
            setText(isoToDmy(value));
          }
          onBlur?.(e);
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute top-1/2 right-0.5 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Abrir calendario"
          >
            <CalendarIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            locale={es}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2045, 11)}
            selected={selected}
            defaultMonth={selected ?? new Date()}
            onSelect={(day) => {
              if (!day) return;
              const iso = dateToIso(day);
              onChange(iso);
              setText(isoToDmy(iso));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
