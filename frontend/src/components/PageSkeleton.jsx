import React from "react";

// Placeholder shown while a lazily loaded page is fetched
export default function PageSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-5 animate-pulse" aria-busy="true" aria-label="Loading page">
      <div className="h-7 w-72 rounded-lg bg-[#1e2a3a]" />
      <div className="h-4 w-96 max-w-full rounded bg-[#1e2a3a]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-[#111823] border border-[#1e2a3a]" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-[#111823] border border-[#1e2a3a]" />
    </div>
  );
}
