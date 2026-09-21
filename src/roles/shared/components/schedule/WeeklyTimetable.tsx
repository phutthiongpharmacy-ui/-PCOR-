import Link from "next/link";

import { cn } from "@/lib/utils";

export type TimetableTone = "neutral" | "info" | "success" | "warning";

export interface WeeklyTimetableRow {
  id: string;
  label: string;
  shortLabel?: string;
}

export interface WeeklyTimetableEvent {
  id: string;
  rowId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  kicker?: string;
  meta?: string;
  tone?: TimetableTone;
  href?: string;
}

export interface WeeklyTimetableBreak {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

interface WeeklyTimetableProps {
  rows: readonly WeeklyTimetableRow[];
  events: readonly WeeklyTimetableEvent[];
  breaks?: readonly WeeklyTimetableBreak[];
  dayStartTime?: string;
  dayEndTime?: string;
  ariaLabel: string;
}

interface RangePlacement {
  slotStart: number;
  slotSpan: number;
}

const SLOT_MINUTES = 30;

const toneClassName: Record<TimetableTone, string> = {
  neutral: "border-border bg-card text-foreground",
  info: "border-info-border bg-info-soft text-info-on-soft",
  success: "border-success-border bg-success-soft text-success-on-soft",
  warning: "border-warning-border bg-warning-soft text-warning-on-soft",
};

function toMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
}

function formatHour(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  return `${hours}:00`;
}

function placementForRange(
  startTime: string,
  endTime: string,
  dayStartMinutes: number,
  dayEndMinutes: number,
): RangePlacement | null {
  const rawStart = toMinutes(startTime);
  const rawEnd = toMinutes(endTime);
  if (rawStart === null || rawEnd === null || rawEnd <= rawStart) return null;

  const start = Math.max(rawStart, dayStartMinutes);
  const end = Math.min(rawEnd, dayEndMinutes);
  if (end <= start) return null;

  return {
    slotStart: Math.floor((start - dayStartMinutes) / SLOT_MINUTES),
    slotSpan: Math.max(1, Math.ceil((end - start) / SLOT_MINUTES)),
  };
}

function EventContent({ event }: { event: WeeklyTimetableEvent }) {
  return (
    <>
      <div className="flex min-w-0 items-start justify-between gap-2">
        {event.kicker ? (
          <span className="font-mono text-micro font-semibold opacity-80">{event.kicker}</span>
        ) : <span />}
        {event.meta ? (
          <span className="shrink-0 rounded-full border border-current/20 px-1.5 py-0.5 text-micro font-medium">
            {event.meta}
          </span>
        ) : null}
      </div>
      <span className="mt-1 line-clamp-2 w-full break-words font-semibold leading-snug">
        {event.title}
      </span>
      <span className="mt-1 line-clamp-2 w-full text-micro opacity-75">{event.location}</span>
      <span className="mt-1 font-mono text-micro opacity-75">
        <time dateTime={event.startTime}>{event.startTime}</time>
        {"–"}
        <time dateTime={event.endTime}>{event.endTime}</time>
      </span>
    </>
  );
}

export function WeeklyTimetable({
  rows,
  events,
  breaks = [],
  dayStartTime = "08:00",
  dayEndTime = "17:00",
  ariaLabel,
}: WeeklyTimetableProps) {
  const dayStartMinutes = toMinutes(dayStartTime) ?? (8 * 60);
  const parsedEndMinutes = toMinutes(dayEndTime) ?? (17 * 60);
  const dayEndMinutes = parsedEndMinutes > dayStartMinutes
    ? parsedEndMinutes
    : dayStartMinutes + 60;
  const hourStarts = Array.from(
    { length: Math.ceil((dayEndMinutes - dayStartMinutes) / 60) },
    (_, index) => dayStartMinutes + (index * 60),
  );
  const totalSlots = Math.ceil((dayEndMinutes - dayStartMinutes) / SLOT_MINUTES);
  const tableWidthClassName = totalSlots > 18 ? "min-w-[98rem]" : "min-w-[70rem]";
  const placedBreaks = breaks.flatMap((period) => {
    const placement = placementForRange(
      period.startTime,
      period.endTime,
      dayStartMinutes,
      dayEndMinutes,
    );
    return placement ? [{ period, placement }] : [];
  });

  const renderRowCells = (row: WeeklyTimetableRow, rowIndex: number) => {
    const placedEvents = events
      .filter((event) => event.rowId === row.id)
      .flatMap((event) => {
        const placement = placementForRange(
          event.startTime,
          event.endTime,
          dayStartMinutes,
          dayEndMinutes,
        );
        return placement ? [{ event, placement }] : [];
      })
      .sort((left, right) => left.placement.slotStart - right.placement.slotStart);
    const cells = [];
    let slotIndex = 0;

    while (slotIndex < totalSlots) {
      const scheduled = placedEvents.find(({ placement }) => placement.slotStart === slotIndex);
      if (scheduled) {
        const slotSpan = Math.min(scheduled.placement.slotSpan, totalSlots - slotIndex);
        const eventClassName = cn(
          "flex min-h-20 min-w-0 flex-col justify-center overflow-hidden rounded-xl border p-2.5 text-left shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
          scheduled.event.href ? "hover:border-primary/50" : "",
          toneClassName[scheduled.event.tone ?? "neutral"],
        );
        const accessibleLabel = [
          scheduled.event.kicker,
          scheduled.event.title,
          scheduled.event.meta,
          `${scheduled.event.startTime}–${scheduled.event.endTime}`,
          scheduled.event.location,
        ].filter(Boolean).join(" · ");

        cells.push(
          <td
            key={scheduled.event.id}
            className="h-24 border-b border-r border-border/50 p-1.5 align-middle"
            colSpan={slotSpan}
          >
            {scheduled.event.href ? (
              <Link
                aria-label={accessibleLabel}
                className={eventClassName}
                href={scheduled.event.href}
              >
                <EventContent event={scheduled.event} />
              </Link>
            ) : (
              <article aria-label={accessibleLabel} className={eventClassName}>
                <EventContent event={scheduled.event} />
              </article>
            )}
          </td>,
        );
        slotIndex += slotSpan;
        continue;
      }

      const pause = placedBreaks.find(({ placement }) => placement.slotStart === slotIndex);
      if (pause) {
        const slotSpan = Math.min(pause.placement.slotSpan, totalSlots - slotIndex);
        cells.push(
          <td
            key={`${row.id}-${pause.period.id}`}
            className="h-24 border-b border-r border-border/50 bg-muted/70 px-1 text-center align-middle text-muted-foreground"
            colSpan={slotSpan}
          >
            <div
              aria-hidden={rowIndex === 0 ? undefined : true}
              aria-label={rowIndex === 0
                ? `${pause.period.label} ${pause.period.startTime}–${pause.period.endTime}`
                : undefined}
              role={rowIndex === 0 ? "note" : undefined}
            >
              <span className="font-medium leading-tight text-micro">พักกลางวัน</span>
            </div>
          </td>,
        );
        slotIndex += slotSpan;
        continue;
      }

      cells.push(
        <td
          aria-hidden="true"
          key={`${row.id}-empty-${slotIndex}`}
          className="h-24 border-b border-r border-border/50 bg-card"
        />,
      );
      slotIndex += 1;
    }

    return cells;
  };

  return (
    <div
      aria-label={ariaLabel}
      className="custom-scrollbar overflow-x-auto pb-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      role="region"
      tabIndex={0}
    >
      <table className={cn("w-full table-fixed border-separate border-spacing-0 text-xs", tableWidthClassName)}>
        <caption className="sr-only">{ariaLabel}</caption>
        <colgroup>
          <col className="w-28" />
          {Array.from({ length: totalSlots }, (_, index) => (
            <col key={index} className="w-14" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="sticky left-0 z-30 border-b border-r border-border bg-muted px-3 py-4 text-center font-semibold text-foreground" scope="col">
              วัน/เวลา
            </th>
            {hourStarts.map((startMinutes) => (
              <th
                key={startMinutes}
                className="border-b border-r border-border bg-muted/70 py-4 text-center font-semibold text-foreground"
                colSpan={2}
                scope="col"
              >
                <time dateTime={formatHour(startMinutes)}>{formatHour(startMinutes)}</time>
                {"–"}
                <time dateTime={formatHour(Math.min(startMinutes + 60, dayEndMinutes))}>
                  {formatHour(Math.min(startMinutes + 60, dayEndMinutes))}
                </time>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id}>
              <th className="sticky left-0 z-30 h-24 border-b border-r border-border bg-card px-3 py-5 text-center align-middle" scope="row">
                <span className="font-medium leading-snug text-foreground sm:hidden">
                  {row.shortLabel ?? row.label}
                </span>
                <span className="hidden font-medium leading-snug text-foreground sm:inline">
                  {row.label}
                </span>
              </th>
              {renderRowCells(row, rowIndex)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
