import { Bell, Wallet, Settings, CircleUser } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { List, ListItem } from "@/components/ui/list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Home() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Home</h1>
        <p className="text-sm text-muted-foreground">
          Style playground — colors, cards and lists all pull from{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">globals.css</code>.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-2">
        {[
          ["bg-primary text-primary-foreground", "Primary"],
          ["bg-secondary text-secondary-foreground", "Secondary"],
          ["bg-accent text-accent-foreground", "Accent"],
          ["bg-success text-success-foreground", "Success"],
          ["bg-warning text-warning-foreground", "Warning"],
          ["bg-info text-info-foreground", "Info"],
        ].map(([cls, label]) => (
          <div
            key={label}
            className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium ${cls}`}
          >
            {label}
          </div>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>This card, the badges and the list below are shadcn/ui components.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </CardContent>
      </Card>

      <List>
        <ListItem
          leading={
            <Avatar className="size-9">
              <AvatarFallback>
                <CircleUser className="size-5" />
              </AvatarFallback>
            </Avatar>
          }
          title="Account"
          subtitle="Profile, security"
          href="/profile"
          showChevron
        />
        <ListItem
          leading={<Bell className="size-5 text-muted-foreground" />}
          title="Notifications"
          subtitle="Push, email"
          href="/notifications"
          showChevron
        />
        <ListItem
          leading={<Wallet className="size-5 text-muted-foreground" />}
          title="Billing"
          trailing={<Badge variant="secondary">Pro</Badge>}
          href="/billing"
          showChevron
        />
        <ListItem
          leading={<Settings className="size-5 text-muted-foreground" />}
          title="Settings"
          href="/settings"
          showChevron
        />
      </List>
    </div>
  );
}
