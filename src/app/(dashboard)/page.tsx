import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getFriendBalances } from "./_lib/get-friend-balances";
import { TotalsHeader } from "./_components/totals-header";
import { FriendRow } from "./_components/friend-row";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/login");

  const viewerId = claims.claims.sub;
  const friendBalances = await getFriendBalances(supabase, viewerId);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex flex-col items-center gap-6 pt-2">
        <img src="/Velkalaskuri_logo_cropped.png" alt="" className="h-24 w-auto"/>
        <h1 className="text-3xl font-bold tracking-tight text-primary [-webkit-text-stroke:1px_grey]">
          VELKACALCULATOR3000
        </h1>
      </div>

      <TotalsHeader friendBalances={friendBalances} />

      {friendBalances.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">No friends yet.</p>
          <Link href="/profile" className="text-sm font-medium text-foreground underline underline-offset-2">
            Add a friend to get started
          </Link>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {friendBalances.map((friend) => (
            <FriendRow key={friend.friendId} friend={friend} />
          ))}
        </div>
      )}
    </div>
  );
}
