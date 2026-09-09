import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Invictus CRM</h1>
      <p className="text-muted-foreground text-sm">
        Foundation scaffold. Next.js 15 · TypeScript · Tailwind · shadcn/ui
      </p>
      <Button>Scaffold check</Button>
    </main>
  );
}
