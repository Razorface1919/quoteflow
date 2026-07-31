"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CreateRevisionButtonProps {
  quoteId: string;
  currentVersion: number;
}

export default function CreateRevisionButton({
  quoteId,
  currentVersion,
}: CreateRevisionButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateRevision = async () => {
    if (!confirm(`Create revision v${currentVersion + 1} from this quote?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/revision`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to create revision");
      }

      const newQuote = await res.json();
      router.push(`/quotes/${newQuote.id}`);
      router.refresh();
    } catch (error) {
      alert("Error creating revision. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateRevision}
      disabled={loading}
      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
    >
      {loading ? "Creating..." : `+ Create v${currentVersion + 1} Revision`}
    </button>
  );
}