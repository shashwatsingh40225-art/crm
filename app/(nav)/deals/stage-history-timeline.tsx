import { cn } from "@/lib/utils";
import { dateTimeFormatter, daysBetween } from "./deals-format";

type StageRef = { name: string; position: number };

export type StageHistoryEvent = {
  id: string;
  changedAt: Date;
  fromStage: StageRef | null;
  toStage: StageRef;
  changedBy: { name: string } | null;
};

/**
 * Vertical stage-history timeline (INV-57). `events` must be chronological
 * (oldest first) - the opposite of the order the rest of the page used to
 * render this in - so a deal's journey reads top to bottom the way it
 * happened.
 *
 * Each StageEvent is one entry. The first event has a null `fromStage` by
 * construction (every entry point - INV-27, INV-61, INV-62 - writes it that
 * way, including an inbound signup entering straight at Engaged per D3), so
 * it renders as "Entered pipeline at X", never "null -> X".
 *
 * "Days in stage" is attached to whichever entry LEFT that stage: the gap
 * between this event and the one before it. The stage the deal is sitting in
 * right now has no such event yet, so it isn't one of the numbered entries -
 * it's summarized on its own line below the list, counted to *now* rather
 * than frozen at the last transition. That's what makes days-in-stage sum to
 * the deal's age instead of undercounting by whatever's elapsed since.
 *
 * Backwards moves (`toStage.position < fromStage.position` - covers a
 * reopen from Won/Lost too, since `closed` sits at the highest position)
 * are real, logged transitions (CLAUDE.md section 4), not something to hide,
 * so they get a visually distinct marker rather than looking like any other
 * step forward.
 */
export function StageHistoryTimeline({
  events,
  currentStageName,
}: {
  events: StageHistoryEvent[];
  currentStageName: string;
}) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">No transitions yet.</p>;
  }

  const lastEvent = events[events.length - 1];
  const ongoingDays = daysBetween(lastEvent.changedAt, new Date());

  return (
    <div className="grid gap-4">
      <ol className="grid gap-4">
        {events.map((event, i) => {
          const isEntry = event.fromStage === null;
          const isBackward = !isEntry && event.toStage.position < event.fromStage!.position;
          const isLast = i === events.length - 1;
          const daysInFromStage = isEntry
            ? null
            : daysBetween(events[i - 1].changedAt, event.changedAt);

          return (
            <li
              key={event.id}
              className={cn(
                "relative border-l-2 pl-4",
                // No trailing line below the final entry regardless of color
                // - computed explicitly rather than via a `last:` variant,
                // which silently wins the border-color fight against the
                // backward color below on whichever entry happens to be last.
                isLast
                  ? "border-transparent"
                  : isBackward
                    ? "border-amber-300 dark:border-amber-800"
                    : "border-border",
              )}
            >
              <span
                className={cn(
                  "absolute -left-[5px] top-1 size-2 rounded-full",
                  isBackward ? "bg-amber-600 dark:bg-amber-500" : "bg-primary",
                )}
              />
              <div className="grid gap-0.5 text-sm">
                <span>
                  {isEntry ? (
                    <>
                      Entered pipeline at{" "}
                      <span className="font-medium">{event.toStage.name}</span>
                    </>
                  ) : (
                    <>
                      {event.fromStage!.name} →{" "}
                      <span className="font-medium">{event.toStage.name}</span>
                      {daysInFromStage !== null ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {daysInFromStage}d in {event.fromStage!.name}
                        </span>
                      ) : null}
                      {isBackward ? (
                        <span className="ml-1.5 font-medium text-amber-700 dark:text-amber-500">
                          · moved back
                        </span>
                      ) : null}
                    </>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {dateTimeFormatter.format(event.changedAt)} ·{" "}
                  {event.changedBy?.name ?? "Unknown"}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-muted-foreground text-xs">
        Currently in{" "}
        <span className="text-foreground font-medium">{currentStageName}</span> ·{" "}
        {ongoingDays}d so far
      </p>
    </div>
  );
}
