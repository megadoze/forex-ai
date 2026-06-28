"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function SyncButton() {
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function syncData() {
    const savedSecret = localStorage.getItem("sync_secret");

    const secret = savedSecret || window.prompt("Enter sync secret:");

    if (!secret) return;

    localStorage.setItem("sync_secret", secret);

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/sync", {
        method: "GET",
        cache: "no-store",
        headers: {
          authorization: `Bearer ${secret}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }

      await queryClient.invalidateQueries({
        queryKey: ["prediction-final"],
      });

      setStatus("Data synced");
    } catch (error) {
      console.error(error);
      setStatus("Sync failed");
    } finally {
      setLoading(false);
    }
  }

  function resetSecret() {
    localStorage.removeItem("sync_secret");
    setStatus("Secret reset");
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={syncData}
        disabled={loading}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Syncing..." : "Update data"}
      </button>

      <button
        onClick={resetSecret}
        className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
      >
        Reset key
      </button>

      {status && <span className="text-xs text-zinc-500">{status}</span>}
    </div>
  );
}
