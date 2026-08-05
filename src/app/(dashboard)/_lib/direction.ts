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
