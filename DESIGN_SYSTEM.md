# Design system

**The rule:** nothing in this app defines its own color, border, font, radius, or spacing scale. Every visual
choice traces back to one of two places — `src/app/globals.css` (raw tokens) or a shared component in
`src/components/ui/` (built from those tokens). Feature code (`src/app/(dashboard)/...`, `src/app/(auth)/...`)
only ever *composes* those primitives — it never writes `bg-*`, `text-*`, `border-*` color utilities, or raw
`<input>`/`<button>` elements, directly.

If you catch yourself writing `className="bg-red-500"` or a one-off colored `<div>` box in a feature file,
stop — either an existing primitive already does this, or a new one belongs in `src/components/ui/`, not in
the feature file.

## To change the whole app's look

Everything downstream reads from these two files. Nothing else needs to change.

- **Colors** (light + dark, separately) — CSS custom properties in `src/app/globals.css`, `:root` and `.dark`
  blocks. Change `--primary`, `--destructive`, `--success`, etc. there; every component using `bg-primary`,
  `text-destructive`, `Button variant="primary"`, `Callout tone="success"` and so on updates automatically.
- **Fonts** — `--font-sans` / `--font-mono` / `--font-heading` in the same file's `@theme inline` block, wired
  to the `next/font` loaders in `src/app/layout.tsx`.
- **Corner radius** — the single `--radius` value in `globals.css`; `--radius-sm/md/lg/xl/...` all derive from
  it, so every rounded corner in the app scales together.

## Button: primary / secondary / tertiary

`src/components/ui/button.tsx` has a `variant` prop with a deliberate three-tier visual-weight hierarchy —
picking the right one *is* the design decision, not the color:

| Variant | Looks like | Use for |
|---|---|---|
| `primary` (default) | solid, filled with `--primary` | the one main action on a screen — "Log in", "Add transaction", "Save" |
| `secondary` | bordered, transparent fill | a real but non-primary action alongside a primary one — "Change photo", "Decline", "Log out" |
| `tertiary` | no border/fill until hover | the lowest-emphasis action — "Change" (picker), a chip's delete "×" |

Two more variants exist for purposes *orthogonal* to that hierarchy, not a 4th/5th tier:

- `destructive` — danger, regardless of visual weight.
- `link` — inline, text-like actions.
- `accent` — an alternate solid brand color (`--secondary` token) for occasional emphasis outside the normal
  hierarchy (currently used for the amount calculator's operator keys).

Never reach for a raw `<button className="...">` for something that is semantically a button — always
`<Button variant="...">`.

**Exception**: a native `<button>` is fine as a chromeless click target wrapping non-button content that
shouldn't get button padding/chrome — a preset chip's label, an avatar upload trigger, a row in a picker list,
an expand/collapse chevron (see `avatar-uploader.tsx`, `preset-picker.tsx`, `friend-picker.tsx`,
`amount-input.tsx`). The rule that still applies even here: only token classes (`text-muted-foreground`,
`hover:bg-muted`, `border-border`, ...), never an invented/hardcoded color.

## Tone: success / destructive / muted

The other recurring vocabulary, defined once in `src/components/ui/callout.tsx` and reused everywhere a
balance or status needs color:

- `Tone` type (`"success" | "destructive" | "muted"`) and `toneTextClass(tone)` — for bare colored text (e.g.
  a row's amount).
- `<Callout tone="...">` — for a colored box (e.g. a balance summary). Children inherit the tone color; a
  child that must stay neutral sets its own `text-muted-foreground` to override.
- `toneGlowClass(tone)` — a stronger decorative tint for things like a pulsing background glow, deliberately a
  separate opacity scale from `Callout`'s own `bg-*/10` (used by the home page's animated totals).
- `getBalanceTone(status)` in `src/lib/format.ts` — the one place a `ViewerRelativeBalance` status
  (`owed_to_viewer` / `owed_by_viewer` / `settled`) maps to a `Tone`. Never re-derive this mapping locally —
  see `friend-row.tsx` / `transaction-row.tsx` / `balance-header.tsx` for the pattern.

Never write `isOwedToViewer ? "text-success" : "text-destructive"` (or similar) inline in a component —
call `toneTextClass(...)` / `toneGlowClass(...)` / use `<Callout>` instead, so there's exactly one place that
decides what each tone looks like.

## Forms: Field / FieldLabel / FieldError / Checkbox / Input

From the shadcn registry (`src/components/ui/field.tsx`, `input.tsx`, `checkbox.tsx`, `label.tsx`) — every form
in the app is built from these, never a hand-wrapped `<div><label/><input/></div>`:

```tsx
<Field>
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <Input id="email" ... />
</Field>

<Field orientation="horizontal">
  <Checkbox id="save" checked={checked} onCheckedChange={setChecked} />
  <FieldLabel htmlFor="save">Save as preset</FieldLabel>
</Field>

<FieldError>{error}</FieldError>
```

`FieldError` already handles the "no error → render nothing" case — pass it the raw `string | null`, don't
wrap it in `{error && ...}` yourself.

## A required, explicit choice between options: SegmentedControl

`src/components/ui/segmented-control.tsx` — a tone-aware toggle group where no option is pre-selected. Built
for the debt ledger's "+/− direction" control (see `docs/tasks/debt-ledger.md`) but generic — any future
"exactly one of N, no default" choice should reuse it rather than hand-rolling another button row.

## Where new shared primitives belong

- **Generic, zero app-specific knowledge, could be copied into an unrelated project** (a button, a colored
  box, a form field, a toggle group) → `src/components/ui/`.
- **Knows about friends/transactions/balances specifically** (e.g. `transaction-row.tsx`,
  `preset-picker.tsx`) → `src/app/(dashboard)/_components/`, promoted there only once a second route needs it
  (see `docs/tasks/structure.md`'s colocation rule) — but its *styling* still comes entirely from the `ui/`
  primitives and tokens above, never its own color/border values.

## Checklist before adding UI

1. Does a `src/components/ui/` primitive already do this? Use it.
2. Is this pattern needed in a second place? If yes, it's a shared primitive, not a local one-off.
3. Am I about to write a raw color/border Tailwind utility (`bg-*`, `text-success`, `border-destructive`,
   ad hoc hex/oklch)? Stop — route it through `Tone`/`Callout`/`Button variant` instead.
4. Am I about to hand-write `<input>`/`<button>`/`<label>`? Use `Input`/`Button`/`FieldLabel` instead.
