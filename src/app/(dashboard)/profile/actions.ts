"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

export async function updateUsername(newUsername: string): Promise<ActionResult> {
  const trimmed = newUsername.trim();
  if (trimmed.length < 3) {
    return { error: "Username must be at least 3 characters." };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ username: trimmed })
    .eq("id", claims.claims.sub);

  if (error) {
    // 23505 = unique_violation — the case-insensitive username index caught a collision.
    if (error.code === "23505") {
      return { error: "That username is taken." };
    }
    return { error: "Couldn't update username. Try again." };
  }

  revalidatePath("/profile");
  return { error: null };
}

export async function updateAvatar(
  formData: FormData
): Promise<ActionResult & { avatarUrl?: string }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Not signed in." };

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return { error: "No file provided." };
  }

  const userId = claims.claims.sub;
  const path = `${userId}/avatar.webp`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: "image/webp" });

  if (uploadError) {
    return { error: "Couldn't upload photo. Try again." };
  }

  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(path, { cacheNonce: String(Date.now()) });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrlData.publicUrl })
    .eq("id", userId);

  if (updateError) {
    return { error: "Photo uploaded but couldn't save it to your profile." };
  }

  revalidatePath("/profile");
  return { error: null, avatarUrl: publicUrlData.publicUrl };
}

export async function updatePassword(newPassword: string): Promise<ActionResult> {
  if (newPassword.length < 10) {
    return { error: "Password must be at least 10 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: "Couldn't update password. Try again." };
  }

  return { error: null };
}

export async function sendFriendRequest(addresseeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Not signed in." };

  const requesterId = claims.claims.sub;
  if (requesterId === addresseeId) {
    return { error: "You can't friend yourself." };
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
  });

  if (error) {
    // 23505 = unique_violation on the (requester, addressee) pair index.
    if (error.code === "23505") {
      return { error: "A request already exists between you two." };
    }
    return { error: "Couldn't send request." };
  }

  revalidatePath("/profile");
  return { error: null };
}

export async function respondToFriendRequest(
  friendshipId: string,
  accept: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Not signed in." };

  // RLS alone permits either participant to update the row — this app-level
  // check is what actually enforces "only the addressee can accept/decline,"
  // same "defense in depth" posture authorization.md takes elsewhere.
  const { data: friendship } = await supabase
    .from("friendships")
    .select("addressee_id, status")
    .eq("id", friendshipId)
    .single();

  if (!friendship || friendship.addressee_id !== claims.claims.sub || friendship.status !== "pending") {
    return { error: "This request is no longer available." };
  }

  const { error } = await supabase
    .from("friendships")
    .update({
      status: accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", friendshipId);

  if (error) {
    return { error: "Couldn't update request." };
  }

  revalidatePath("/profile");
  return { error: null };
}
