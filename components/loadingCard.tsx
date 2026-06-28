// components/loadingCard.tsx

export function LoadingCard({ title = "Loading..." }: { title?: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800 min-h-[260px] flex flex-col justify-center">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-5 w-5 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
        <p className="text-zinc-300 font-medium">{title}</p>
      </div>

      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-zinc-800 rounded" />
        <div className="h-4 w-full bg-zinc-800 rounded" />
        <div className="h-4 w-5/6 bg-zinc-800 rounded" />
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="h-16 bg-zinc-800 rounded-xl" />
          <div className="h-16 bg-zinc-800 rounded-xl" />
          <div className="h-16 bg-zinc-800 rounded-xl" />
          <div className="h-16 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
