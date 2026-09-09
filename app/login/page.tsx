import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Invictus CRM" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Suspense>
        <LoginForm next={next ?? "/dashboard"} />
      </Suspense>
    </main>
  );
}
