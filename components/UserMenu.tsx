"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "./auth-client";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener("mousedown", close);
    addEventListener("keydown", close);
    return () => { removeEventListener("mousedown", close); removeEventListener("keydown", close); };
  }, [open]);
  const initials = name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu"
        className="engraved grid h-9 w-9 place-items-center rounded-full border border-dial-ink/60 bg-bezel text-[14px] text-dial-ink" aria-label={`Account menu for ${name}`}>
        {initials}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-64 rounded-md border border-rule bg-panel p-2 shadow-[0_18px_40px_-24px_rgb(29_21_19/0.5)]">
          <div className="border-b border-rule px-3 pb-3 pt-2">
            <p className="text-[16px]">{name}</p>
            <p className="truncate text-[14px] text-faint">{email}</p>
          </div>
          <a role="menuitem" href="/logbook" className="block rounded-sm px-3 py-2 text-[16px] hover:bg-band-2">Logbook</a>
          <button role="menuitem" type="button" className="block w-full rounded-sm px-3 py-2 text-left text-[16px] hover:bg-band-2"
            onClick={async () => { await authClient.signOut(); setOpen(false); router.push("/"); router.refresh(); }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
