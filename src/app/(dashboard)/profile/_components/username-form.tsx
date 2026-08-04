"use client";

import { useState, type FormEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateUsername } from "../actions";

// Client-side normalization is formatting only (lowercase, no spaces) — the
// actual uniqueness check can only happen server-side, it can't be raced
// around on the client. See docs/tasks/login-profile-ui.md.
function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function UsernameForm({ currentUsername }: { currentUsername: string }) {
  const [username, setUsername] = useState(currentUsername);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const normalized = normalize(username);
  const unchanged = normalized === currentUsername;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (normalized.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setIsSaving(true);
    const result = await updateUsername(normalized);
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setUsername(normalized);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <Label htmlFor="username">Username</Label>
      <div className="flex items-center gap-2">
        <Input
          id="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setSaved(false);
          }}
          minLength={3}
          required
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={isSaving || unchanged}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && !error && <p className="text-xs text-muted-foreground">Saved.</p>}
    </form>
  );
}
