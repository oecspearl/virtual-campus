"use client";

import React from "react";

export default function DateTimePicker({ value, onChange }: { value: string | null; onChange: (iso: string | null) => void }) {
  const localValue = React.useMemo(() => {
    if (!value) return "";
    const d = new Date(value);
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  }, [value]);

  return (
    <input
      type="datetime-local"
      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
      value={localValue}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return onChange(null);
        const d = new Date(v);
        onChange(d.toISOString());
      }}
    />
  );
}
