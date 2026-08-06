"use client";

import { useState, type FormEvent } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { createCategory } from "@/app/(dashboard)/_lib/category-actions";
import type { OwnCategory } from "../_lib/get-own-categories";

// Standalone create/view surface for the viewer's own categories — the ones
// they'll pick from whenever they're the debtor. No delete/rename here:
// categories have no update/delete RLS policy by design (supabase/
// migrations/20260805130000_categories.sql, "no rename/delete in v1").
export function CategoryManager({
  userId,
  initialCategories,
}: {
  userId: string;
  initialCategories: OwnCategory[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSaving(true);
    setError(null);
    const result = await createCategory(userId, trimmed);
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    const created = { id: result.categoryId!, name: trimmed };
    setCategories((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
  }

  return (
    <CollapsibleSection title="Categories">
      <p className="text-sm text-muted-foreground">
        Your own categories — the ones you&apos;ll pick from whenever you&apos;re the one who owes.
      </p>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet — add one below.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category.id}
              className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground"
            >
              {category.name}
            </span>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <Input
          placeholder="New category"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={!name.trim() || isSaving}>
          {isSaving ? "Adding…" : "Add"}
        </Button>
      </form>
      <FieldError>{error}</FieldError>
    </CollapsibleSection>
  );
}