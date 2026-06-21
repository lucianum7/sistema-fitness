"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button, Field } from "./ui";

type ApiResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; details?: unknown };

async function postJson<T>(url: string, payload: unknown): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(nextEmail = email, nextPassword = password) {
    setLoading(true);
    setMessage("");
    const result = await postJson<{ user: { role: string } }>("/api/auth/login", { email: nextEmail, password: nextPassword });
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    // Admin vai para a administração; aluno, para o painel.
    window.location.assign(result.data.user.role === "ADMIN" ? "/admin" : "/painel");
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Field label="Senha" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      {message ? <p className="rounded-[8px] border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{message}</p> : null}
      <Button disabled={loading} type="submit">
        {loading ? <Loader2 className="animate-spin" size={18} /> : null}
        Entrar
      </Button>
      <Link className="text-center text-sm font-semibold text-[var(--primary)]" href="/recuperar-senha">
        Recuperar senha
      </Link>
    </form>
  );
}

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");
    const result = await postJson("/api/auth/register", {
      name,
      email,
      password,
      consents: { terms: true, privacy: true },
    });
    if (!result.ok) {
      setLoading(false);
      setMessage(result.error);
      return;
    }
    // Conta criada e sessão iniciada: segue para a avaliação dentro da sessão.
    window.location.assign("/avaliacao");
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!accept) {
          setMessage("Para continuar, aceite os termos de uso e a política de privacidade.");
          return;
        }
        void submit();
      }}
    >
      <Field label="Nome" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
      <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Field
        label="Senha"
        type="password"
        autoComplete="new-password"
        minLength={10}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint="Mínimo de 10 caracteres."
        required
      />
      <label className="flex items-start gap-3 text-sm">
        <input className="mt-1 size-4" type="checkbox" checked={accept} onChange={(event) => setAccept(event.target.checked)} />
        <span>Aceito os termos de uso e a política de privacidade.</span>
      </label>
      {message ? <p className="rounded-[8px] border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{message}</p> : null}
      <Button disabled={loading} type="submit">
        {loading ? <Loader2 className="animate-spin" size={18} /> : null}
        Criar conta
      </Button>
    </form>
  );
}

export function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await postJson("/api/auth/request-reset", { email });
        setMessage(result.ok ? "Se o e-mail existir, enviamos uma nova senha para ele. Confira sua caixa de entrada." : result.error);
      }}
    >
      <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Button type="submit">Enviar instruções</Button>
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await postJson("/api/auth/reset", { token, password });
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        router.push("/entrar");
      }}
    >
      <Field label="Nova senha" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} />
      <Button type="submit">Salvar nova senha</Button>
      {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
    </form>
  );
}

export function VerifyEmailClient({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function verify() {
    setStatus("loading");
    const result = await postJson("/api/auth/verify", { token });
    if (!result.ok) {
      setMessage(result.error);
      setStatus("error");
      return;
    }
    setStatus("done");
  }

  return (
    <div className="grid gap-4">
      <Button type="button" disabled={status === "loading" || status === "done"} onClick={() => void verify()}>
        {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
        Confirmar e-mail
      </Button>
      {status === "done" ? <p className="text-sm font-semibold text-[var(--primary)]">E-mail confirmado.</p> : null}
      {status === "error" ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
      <Link className="text-sm font-semibold text-[var(--primary)]" href="/painel">
        Ir para o painel
      </Link>
    </div>
  );
}
