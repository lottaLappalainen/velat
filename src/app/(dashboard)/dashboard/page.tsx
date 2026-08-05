import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { resolvePeriod } from "./_lib/resolve-period";
import { getCategoryTotals } from "./_lib/get-category-totals";
import { PeriodNav } from "./_components/period-nav";

// Month/year/all-time spending by category — see docs/tasks/
// categories-dashboard.md. Purely a read: no Server Actions here, category
// creation happens inline on the transaction forms, not on this page.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/login");

  const viewerId = claims.claims.sub;
  const period = resolvePeriod(periodParam);

  const { data: anyCategory } = await supabase
    .from("categories")
    .select("id")
    .eq("owner_id", viewerId)
    .limit(1)
    .maybeSingle();

  const { total, byCategory } = await getCategoryTotals(supabase, viewerId, {
    start: period.start,
    end: period.end,
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>

      <PeriodNav period={period} />

      {!anyCategory ? (
        // Brand new account, zero categories yet — there's no separate
        // category-management page to send them to, so point at where
        // categorization actually happens (see login profile/categories docs).
        <p className="text-center text-sm text-muted-foreground">
          Categories are created automatically when you log your first transaction.
        </p>
      ) : (
        <>
          <p className="text-center text-lg font-semibold text-foreground">
            You spent {formatMoney(total)}
            {period.mode !== "all" ? ` in ${period.label}` : ""}
          </p>

          {byCategory.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No spending logged for {period.label}.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {byCategory.map((category) => (
                <li key={category.categoryId} className="py-3 text-sm text-foreground">
                  You spent <span className="font-semibold">{formatMoney(category.total)}</span> on{" "}
                  <span className="font-semibold">{category.name}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
