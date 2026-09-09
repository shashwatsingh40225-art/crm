"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LoginState } from "./types";

// NOTE: a "use server" file may only export async functions. The runtime is
// not declared here (server actions already run on Node) and LoginState lives
// in ./types - exporting either from this file is a build error.

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Enter an email address and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately not distinguishing "no such user" from "wrong password" -
    // that difference is an account-enumeration oracle.
    return { error: "Those credentials were not accepted." };
  }

  revalidatePath("/", "layout");
  // Only allow relative paths, so ?next= cannot be used as an open redirect.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
