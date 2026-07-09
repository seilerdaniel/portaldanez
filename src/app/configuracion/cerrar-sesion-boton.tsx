"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function CerrarSesionBoton() {
  const router = useRouter();
  const supabase = createClient();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="secundario" tamaño="sm" onClick={cerrarSesion}>
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </Button>
  );
}
