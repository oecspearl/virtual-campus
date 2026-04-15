"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { useSupabase } from "@/lib/supabase-provider";
import Link from "next/link";

export default function UserMenu() {
  const { user, signOut } = useSupabase();
  const [open, setOpen] = React.useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon icon="mdi:user" className="h-4 w-4 text-gray-700" />
        <span className="text-gray-700">{(user as any)?.displayName || user?.email}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-md border bg-white p-2 shadow">
          <Link href="/dashboard" className="block rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-50">Dashboard</Link>
          <button className="block w-full rounded px-2 py-1 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={async () => { await signOut(); }}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
