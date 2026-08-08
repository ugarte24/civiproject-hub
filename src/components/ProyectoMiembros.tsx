import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddProyectoMiembro,
  useEmpresaUsuarios,
  useProyectoMiembros,
  useRemoveProyectoMiembro,
} from "@/lib/obra/hooks";
import { usePermisos } from "@/lib/store";

export function ProyectoMiembrosPanel({ proyectoId }: { proyectoId: string }) {
  const { role } = usePermisos();
  const canManage = role === "Administrador";
  const { data: miembros = [], isLoading } = useProyectoMiembros(proyectoId);
  const { data: usuarios = [] } = useEmpresaUsuarios({ enabled: canManage });
  const addMut = useAddProyectoMiembro();
  const remMut = useRemoveProyectoMiembro();
  const [userId, setUserId] = useState("");

  const disponibles = usuarios.filter(
    (u) => u.estado === "Activo" && !miembros.some((m) => m.userId === u.id),
  );

  const agregar = () => {
    if (!userId) {
      toast.error("Seleccione un usuario.");
      return;
    }
    void addMut
      .mutateAsync({ proyectoId, userId })
      .then(() => {
        toast.success("Miembro agregado.");
        setUserId("");
      })
      .catch((err: Error) => toast.error(err.message));
  };

  return (
    <div className="border-t border-border pt-4">
      <p className="label-kicker">Equipo del proyecto</p>
      {isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {miembros.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{m.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.rol} · {m.correo}
                </p>
              </div>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive"
                  disabled={remMut.isPending}
                  onClick={() => {
                    void remMut
                      .mutateAsync({ proyectoId, userId: m.userId })
                      .then(() => toast.success("Miembro quitado."))
                      .catch((err: Error) => toast.error(err.message));
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
          {!miembros.length ? (
            <li className="text-sm text-muted-foreground">Sin miembros asignados.</li>
          ) : null}
        </ul>
      )}

      {canManage ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Agregar usuario…" />
            </SelectTrigger>
            <SelectContent>
              {disponibles.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nombre} · {u.rol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={!userId || addMut.isPending || !disponibles.length}
            onClick={agregar}
          >
            <UserPlus className="size-4" /> Agregar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
