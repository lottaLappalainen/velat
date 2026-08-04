// Shared formatting + sign-convention helpers for the debt ledger. See
// docs/tasks/debt-ledger.md, "Core principle: store facts, never store +/-"
// and "Finnish formatting" — never format ad hoc in a component.

export function formatFinnishDateTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fi-FI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  }).format(value);
  // -> "04.08.2026 14.30"
}

export function formatMoney(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency }).format(amount);
  // -> "12,50 €"
}

// A raw row from the `balances` view (see docs/tasks/debt-ledger.md, "Schema").
export type BalanceRow = {
  user_a: string;
  user_b: string;
  net_amount: number;
};

export type ViewerRelativeBalance =
  | { status: "owed_to_viewer"; amount: number }
  | { status: "owed_by_viewer"; amount: number }
  | { status: "settled" };

// Translates a `balances` row's user_a/user_b framing (meaningless outside
// the database — just the pair sorted by uuid for grouping) into "is the
// viewer owed, or do they owe" — the only framing the UI is ever allowed to
// show. net_amount > 0 means user_a is owed by user_b.
export function getViewerRelativeBalance(
  viewerId: string,
  balance: BalanceRow | null
): ViewerRelativeBalance {
  if (!balance || balance.net_amount === 0) {
    return { status: "settled" };
  }

  const viewerIsUserA = balance.user_a === viewerId;
  const userAIsOwed = balance.net_amount > 0;
  const viewerIsOwed = viewerIsUserA ? userAIsOwed : !userAIsOwed;
  const amount = Math.abs(balance.net_amount);

  return viewerIsOwed ? { status: "owed_to_viewer", amount } : { status: "owed_by_viewer", amount };
}
