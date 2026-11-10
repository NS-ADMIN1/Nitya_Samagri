"use client";

// components/layout/AnnouncementBar.jsx
//
// Shows the live announcement set in Admin → Store (GET /cms/announcements).
// Nothing is hardcoded: with no live announcement the bar is not rendered.

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/auth";
import { isAnnouncementLive } from "../../lib/normalize";

export default function AnnouncementBar() {
  const [text, setText] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/cms/announcements")
      .then(({ ok, body }) => {
        if (cancelled || !ok) return;
        const live = (body?.data?.items || []).find((a) => isAnnouncementLive(a));
        if (live) setText(live.text);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!text) return null;

  return (
    <div className="bg-navy text-white">
      <p className="site-container py-2.5 text-center text-[13px]">{text}</p>
    </div>
  );
}