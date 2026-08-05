"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveParticipants, type Direction } from "./direction";

type ActionResult = { error: string | null };

// Re-exported so existing call sites (`debt-form.tsx`, `add-transaction-
// form.tsx`) can keep importing it from here — the value-level helper moved
// to ./direction because a "use server" file can only export async Server
// Actions, but category-picker.tsx (a client component) needs the plain
// function too.
export type { Direction };

function revalidateLedgerPaths(friendId: string) {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath(`/friends/${friendId}`);
}

export async function createTransaction(
  friendId: string,
  input: { name: string; amount: number; direction: Direction; categoryId: string }
): Promise<ActionResult> {
  const trimmedName = input.name.trim();
  if (!trimmedName) return { error: "Name is required." };
  if (!(input.amount > 0)) return { error: "Amount must be greater than zero." };
  if (!input.categoryId) return { error: "Choose a category." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Not signed in." };

  const viewerId = claims.claims.sub;
  const { creditorId, debtorId } = resolveParticipants(viewerId, friendId, input.direction);

  const { error } = await supabase.from("transactions").insert({
    creditor_id: creditorId,
    debtor_id: debtorId,
    amount: input.amount,
    name: trimmedName,
    category_id: input.categoryId,
    created_by: viewerId,
  });

  if (error) {
    // Most likely causes: the RLS insert policy's friendship check failed
    // (no longer, or never were, friends with this person), or category_id
    // didn't actually belong to the debtor (e.g. direction changed client-
    // side after a category was picked, without clearing the selection).
    return { error: "Couldn't log transaction. Are you still friends, and is the category valid?" };
  }

  revalidateLedgerPaths(friendId);
  return { error: null };
}

// Exists per docs/tasks/debt-ledger.md's build plan, but no UI in
// docs/tasks/homepage-ui.md or transactions-ui.md calls it yet — editing a
// past entry's name/amount has no specified interaction (debt-ledger.md's
// open items still leave "should edits be time-limited" unresolved). Kept
// here so the shared-actions file matches what those docs ask for; wire up
// a UI trigger once that's decided.
export async function updateTransaction(
  transactionId: string,
  friendId: string,
  input: { name: string; amount: number }
): Promise<ActionResult> {
  const trimmedName = input.name.trim();
  if (!trimmedName) return { error: "Name is required." };
  if (!(input.amount > 0)) return { error: "Amount must be greater than zero." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Not signed in." };

  const { error } = await supabase
    .from("transactions")
    .update({ name: trimmedName, amount: input.amount })
    .eq("id", transactionId);

  if (error) return { error: "Couldn't update transaction." };

  revalidateLedgerPaths(friendId);
  return { error: null };
}

// Soft delete only — `transactions` has no RLS delete policy by design (see
// docs/tasks/authorization.md), a hard DELETE would just be rejected. Same
// "no UI wires this up yet" note as updateTransaction above.
export async function deleteTransaction(transactionId: string, friendId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Not signed in." };

  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", transactionId);

  if (error) return { error: "Couldn't delete transaction." };

  revalidateLedgerPaths(friendId);
  return { error: null };
}

export async function savePreset(name: string, amount: number): Promise<ActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Name is required." };
  if (!(amount > 0)) return { error: "Amount must be greater than zero." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Not signed in." };

  const { error } = await supabase.from("transaction_presets").insert({
    owner_id: claims.claims.sub,
    name: trimmedName,
    amount,
  });

  if (error) return { error: "Couldn't save preset." };

  revalidatePath("/friends/[friendId]", "page");
  revalidatePath("/transactions");
  return { error: null };
}

export async function deletePreset(presetId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Not signed in." };

  // RLS already scopes deletes to the owner; this just avoids a raw
  // Postgres rejection reaching the UI.
  const { error } = await supabase
    .from("transaction_presets")
    .delete()
    .eq("id", presetId)
    .eq("owner_id", claims.claims.sub);

  if (error) return { error: "Couldn't delete preset." };

  revalidatePath("/friends/[friendId]", "page");
  revalidatePath("/transactions");
  return { error: null };
}
