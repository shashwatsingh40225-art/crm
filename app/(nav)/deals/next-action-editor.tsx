"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateFormatter } from "./deals-format";

/**
 * INV-26's "next action editable inline" - deliberately not the full edit
 * form (that's INV-27's DealForm, which covers every other field). This is
 * scoped to exactly the two gate fields for Engaged -> Evaluating, editable
 * without leaving the deal page.
 */
export function NextActionEditor({
  dealId,
  nextAction,
  nextActionDue,
  isOverdue,
  disabled,
}: {
  dealId: string;
  nextAction: string | null;
  nextActionDue: string | null;
  isOverdue: boolean;
  /** INV-31: closed deals are read-only except for reopen. */
  disabled?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionValue, setActionValue] = useState(nextAction ?? "");
  const [dueValue, setDueValue] = useState(nextActionDue ? nextActionDue.slice(0, 10) : "");

  async function save() {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nextAction: actionValue.trim() || null,
        nextActionDue: dueValue ? new Date(dueValue).toISOString() : null,
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setSaving(false);
      setError(json?.error ?? "Could not save. Try again.");
      return;
    }

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2">
        <div className="grid gap-0.5">
          {nextAction ? (
            <span className="text-sm">{nextAction}</span>
          ) : (
            <span className="text-muted-foreground text-sm">No next action set</span>
          )}
          {nextActionDue ? (
            <span
              className={
                isOverdue
                  ? "text-destructive text-xs font-medium"
                  : "text-muted-foreground text-xs"
              }
            >
              Due {dateFormatter.format(new Date(nextActionDue))}
              {isOverdue ? " · overdue" : ""}
            </span>
          ) : null}
        </div>
        {disabled ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit next action"
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Input
        value={actionValue}
        onChange={(e) => setActionValue(e.target.value)}
        placeholder="e.g. Send the tier comparison"
        disabled={saving}
      />
      <Input
        type="date"
        value={dueValue}
        onChange={(e) => setDueValue(e.target.value)}
        className="w-fit"
        disabled={saving}
      />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            setActionValue(nextAction ?? "");
            setDueValue(nextActionDue ? nextActionDue.slice(0, 10) : "");
            setError(null);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
