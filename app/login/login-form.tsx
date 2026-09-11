"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "./actions";
import type { LoginState } from "./types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(signIn, {
    error: null,
  });

  return (
    <Card className="w-full max-w-sm shadow-xl shadow-primary/5 border-border/80">
      <CardHeader className="text-center pb-3">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#232366] text-white text-lg font-bold tracking-tight shadow-md">
          IN
        </div>
        <CardTitle className="text-xl tracking-tight font-semibold">Invictus CRM</CardTitle>
        <CardDescription className="text-xs">
          Sign in to the Verena launch pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {state.error ? (
            <p
              role="alert"
              className="text-destructive text-sm"
              data-testid="login-error"
            >
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
