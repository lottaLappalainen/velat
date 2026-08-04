export default async function FriendPage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const { friendId } = await params;

  return (
    <div className="flex flex-col gap-2 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Friend</h1>
      <p className="text-sm text-muted-foreground">
        Balance + transaction log + add-transaction form for friend {friendId} goes here (Phase 5).
      </p>
    </div>
  );
}
