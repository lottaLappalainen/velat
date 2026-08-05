// Pulled out of transaction-actions.ts because a "use server" file can only
// export async Server Actions — not a plain pure function like this one,
// which category-picker.tsx (a client component) also needs, to resolve who
// the debtor is *before* submitting. See docs/tasks/categories-dashboard.md,
// "whose category is it?"
export type Direction = "owed_to_me" | "i_owe";

// Resolves the form's viewer-relative +/- choice into the storage-level
// creditor/debtor fact — see docs/tasks/debt-ledger.md, "Core principle:
// store facts, never store +/-." This is the one place that translation
// happens; nothing downstream ever reasons about "+/-" again.
export function resolveParticipants(viewerId: string, friendId: string, direction: Direction) {
  return direction === "owed_to_me"
    ? { creditorId: viewerId, debtorId: friendId }
    : { creditorId: friendId, debtorId: viewerId };
}
