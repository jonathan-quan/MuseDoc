"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentWorkspace from "../components/DocumentWorkspace";
import { createClient } from "../lib/supabase/client";
import { createDocument } from "../lib/documents";

// "Try it" entry point used by the landing's Start Writing / Import Document
// buttons. Signed-in visitors get a real, saved document; everyone else gets a
// guest scratchpad that isn't persisted.
export default function TryPage() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "guest">("checking");
  const [autoImport, setAutoImport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        // Signed in — create a real document and open it (it will save).
        const doc = await createDocument();
        if (cancelled) return;
        router.replace(doc ? `/doc/${doc.id}` : "/drive");
        return;
      }
      // Logged out — guest editing, no persistence.
      setAutoImport(
        new URLSearchParams(window.location.search).get("import") === "1"
      );
      setState("guest");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "checking") {
    return (
      <div className="flex h-full items-center justify-center bg-white text-sm text-gray-400 dark:bg-gray-900 dark:text-gray-500">
        Loading…
      </div>
    );
  }

  return <DocumentWorkspace guest autoImport={autoImport} />;
}
