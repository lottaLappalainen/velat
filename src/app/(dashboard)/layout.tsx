import { BottomNav } from "@/components/layout/bottom-nav";

// TODO: belt-and-suspenders auth check here, in addition to the proxy
// redirect gate (see docs/tasks/authorization.md).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-16">
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
