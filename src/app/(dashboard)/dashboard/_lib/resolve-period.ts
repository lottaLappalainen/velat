// Pure — parses the Dashboard's `?period=` search param into concrete date
// boundaries. No database access. See docs/tasks/categories-dashboard.md.
//
// Simplification worth knowing: month/year boundaries are computed in UTC,
// not Europe/Helsinki (unlike *display* formatting in src/lib/format.ts,
// which does use Helsinki time). A transaction logged within a couple hours
// of local midnight right at a month/year boundary could attribute to the
// adjacent period. Not corrected for now — same "revisit if it matters"
// posture as other deferred edge cases in this codebase; doing it properly
// needs real timezone-aware date arithmetic, which nothing in package.json
// currently provides.

export type PeriodMode = "month" | "year" | "all";

export type ResolvedPeriod = {
  mode: PeriodMode;
  start: Date | null;
  end: Date | null; // exclusive
  label: string;
  paramValue: string;
  previousParamValue: string | null;
  nextParamValue: string | null;
};

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const YEAR_PATTERN = /^\d{4}$/;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function monthParam(year: number, monthIndex: number): string {
  // monthIndex is 0-based; handles rolling over into an adjacent year.
  const normalized = new Date(Date.UTC(year, monthIndex, 1));
  return `${normalized.getUTCFullYear()}-${pad(normalized.getUTCMonth() + 1)}`;
}

function currentMonthParam(): string {
  const now = new Date();
  return monthParam(now.getUTCFullYear(), now.getUTCMonth());
}

export function resolvePeriod(periodParam: string | undefined): ResolvedPeriod {
  if (periodParam === "all") {
    return {
      mode: "all",
      start: null,
      end: null,
      label: "All time",
      paramValue: "all",
      previousParamValue: null,
      nextParamValue: null,
    };
  }

  if (periodParam && YEAR_PATTERN.test(periodParam)) {
    const year = Number(periodParam);
    return {
      mode: "year",
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year + 1, 0, 1)),
      label: String(year),
      paramValue: periodParam,
      previousParamValue: String(year - 1),
      nextParamValue: String(year + 1),
    };
  }

  const resolvedParam = periodParam && MONTH_PATTERN.test(periodParam) ? periodParam : currentMonthParam();
  const match = MONTH_PATTERN.exec(resolvedParam)!;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  return {
    mode: "month",
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
    label: `${MONTH_NAMES[monthIndex]} ${year}`,
    paramValue: resolvedParam,
    previousParamValue: monthParam(year, monthIndex - 1),
    nextParamValue: monthParam(year, monthIndex + 1),
  };
}

// For the Month/Year/All-time mode toggle: switching mode tries to stay at
// roughly the same point in time rather than resetting to "now."
export function periodParamForMode(current: ResolvedPeriod, mode: PeriodMode): string {
  if (mode === "all") return "all";

  if (mode === "year") {
    if (current.mode === "all") return String(new Date().getUTCFullYear());
    return current.paramValue.slice(0, 4);
  }

  // mode === "month"
  if (current.mode === "month") return current.paramValue;
  if (current.mode === "year") return `${current.paramValue}-01`;
  return currentMonthParam();
}
