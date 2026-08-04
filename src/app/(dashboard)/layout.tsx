import { BottomNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { logout } from "./actions";

// TODO(Phase 4, see docs/tasks/login-profile-ui.md): this logout affordance
// is a placeholder — it belongs on the Profile page once that exists. Kept
// here for now purely so Phase 3's auth flow is actually testable end to end.
// Belt-and-suspenders auth check (in addition to the proxy redirect gate) is
// also still owed here.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-16">
      <div className="flex justify-end px-4 py-2">
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Log out
          </Button>
        </form>
      </div>
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
