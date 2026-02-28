"use client";

import React from "react";

export default function Timer({ seconds, onExpire }: { seconds: number; onExpire?: () => void }) {
  const [remaining, setRemaining] = React.useState(seconds);
  React.useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);
  React.useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = setInterval(() => setRemaining((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700">
      <span>Time left: {mins}:{secs.toString().padStart(2, "0")}</span>
    </div>
  );
}
