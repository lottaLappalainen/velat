"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createCategory } from "../_lib/category-actions";

export type CategoryOption = { id: string; name: string };

// Required, like Direction — "all transactions need to be categorized." The
// list shown is always the *debtor's* categories, not necessarily the
// viewer's own — see docs/tasks/categories-dashboard.md, "whose category is
// it?" `debtorId` is resolved by the parent form from friendId + direction,
// so this component never reasons about direction itself.
//
// RLS (categories-dashboard.md) allows reading/creating a category for an
// accepted friend, which is what makes fetching *and* the inline "+ New"
// creation both work here even when debtorId isn't the viewer.
export function CategoryPicker({
  debtorId,
  selectedCategoryId,
  onSelect,
}: {
  debtorId: string | null;
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
}) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!debtorId) {
      // Stale results simply aren't rendered below (gated on `debtorId` being
      // set) rather than cleared here — clearing would mean calling
      // setState synchronously in the effect body, which the
      // react-hooks/set-state-in-effect rule flags. Same pattern as
      // friend-search.tsx.
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("owner_id", debtorId)
        .order("name", { ascending: true });

      if (!cancelled) {
        setCategories(data ?? []);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debtorId]);

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed || !debtorId) return;

    setIsCreating(true);
    setError(null);
    const result = await createCategory(debtorId, trimmed);
    setIsCreating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    const created = { id: result.categoryId!, name: trimmed };
    setCategories((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
    onSelect(created.id);
    setNewName("");
  }

  if (!debtorId) {
    return <p className="text-sm text-muted-foreground">Choose a direction to pick a category.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading categories…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                selectedCategoryId === category.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              {category.name}
            </button>
          ))}
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground">No categories yet — add one below.</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="New category"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleCreate();
            }
          }}
        />
        <Button type="button" variant="secondary" size="sm" disabled={!newName.trim() || isCreating} onClick={handleCreate}>
          {isCreating ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
