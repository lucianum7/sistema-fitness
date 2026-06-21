"use client";

import { useState } from "react";
import { Mail, RefreshCw, Share2 } from "lucide-react";
import { Button } from "./ui";

export function ReportsActions() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function emailExport(type: "progresso" | "dados") {
    setBusy(type);
    setMessage("");
    const result = await fetch("/api/exports/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type }),
    }).then((response) => response.json());
    setBusy(null);
    setMessage(result.ok ? `Enviado para o seu e-mail (${result.data.to}).` : result.error ?? "Não foi possível enviar.");
  }

  async function regeneratePlans() {
    setBusy("plans");
    const result = await fetch("/api/plans/regenerate", { method: "POST" }).then((response) => response.json());
    setBusy(null);
    setMessage(result.ok ? "Planos recalculados." : result.error);
  }

  async function shareSummary() {
    const text = "Acompanhe sua evolução no Sistema Fitness.";
    if (navigator.share) {
      await navigator.share({ title: "Sistema Fitness", text });
      setMessage("Compartilhamento aberto.");
      return;
    }
    await navigator.clipboard.writeText(text);
    setMessage("Resumo copiado.");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Button type="button" disabled={busy !== null} onClick={() => void emailExport("progresso")}>
        {busy === "progresso" ? <RefreshCw className="animate-spin" size={18} /> : <Mail size={18} />} Relatório por e-mail
      </Button>
      <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void emailExport("dados")}>
        {busy === "dados" ? <RefreshCw className="animate-spin" size={18} /> : <Mail size={18} />} Meus dados por e-mail
      </Button>
      <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void regeneratePlans()}>
        <RefreshCw size={18} /> Recalcular planos
      </Button>
      <Button type="button" variant="secondary" onClick={() => void shareSummary()}>
        <Share2 size={18} /> Compartilhar
      </Button>
      {message ? <p className="sm:col-span-2 lg:col-span-4 text-sm font-semibold text-[var(--primary)]">{message}</p> : null}
    </div>
  );
}
