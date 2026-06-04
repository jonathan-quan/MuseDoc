"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "../lib/supabase/client";

/**
 * Account avatar + dropdown for the top bar. Shows the signed-in user's Google
 * picture (or their initial), their email, and a sign-out action.
 */
export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? null);
      const meta = user.user_metadata as
        | { avatar_url?: string; picture?: string }
        | undefined;
      setAvatar(meta?.avatar_url ?? meta?.picture ?? null);
    });
  }, []);

  const initial = (email?.[0] ?? "?").toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Account"
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-700 hover:ring-2 hover:ring-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:ring-gray-600"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        ) : (
          initial
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Signed in as
              </p>
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                {email ?? "…"}
              </p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
