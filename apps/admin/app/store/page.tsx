"use client";

// apps/admin/app/store/page.tsx
//
// Storefront: content for the customer site. The first two tabs
// (Announcements, Festivals) change the live site; the other four are
// saved by the API but the customer site does not read them yet — each of
// those tabs says so at the top.

import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import AnnouncementsTab from "../../components/store/AnnouncementsTab";
import BannersTab from "../../components/store/BannersTab";
import BlogTab from "../../components/store/BlogTab";
import FestivalsTab from "../../components/store/FestivalsTab";
import SectionsTab from "../../components/store/SectionsTab";
import SeoTab from "../../components/store/SeoTab";
import Tabs, { type TabItem } from "../../components/ui/Tabs";
import { BRAND } from "../../lib/theme";

type StoreTab = "announcements" | "festivals" | "sections" | "banners" | "blog" | "seo";

const TABS: TabItem<StoreTab>[] = [
  { id: "announcements", label: "Announcements" },
  { id: "festivals", label: "Festivals" },
  { id: "sections", label: "Homepage" },
  { id: "banners", label: "Banners" },
  { id: "blog", label: "Blog" },
  { id: "seo", label: "SEO" },
];

export default function StorefrontPage() {
  const [tab, setTab] = useState<StoreTab>("announcements");

  return (
    <AdminShell
      title="Storefront"
      subtitle="Content for the customer site"
      actions={
        <a
          href={BRAND.storefrontUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-field bg-white px-[18px] font-sans text-sm font-semibold text-navy hover:bg-mist"
        >
          Open customer site
        </a>
      }
    >
      <Tabs label="Storefront content" items={TABS} value={tab} onChange={setTab} />
      {tab === "announcements" && <AnnouncementsTab />}
      {tab === "festivals" && <FestivalsTab />}
      {tab === "sections" && <SectionsTab />}
      {tab === "banners" && <BannersTab />}
      {tab === "blog" && <BlogTab />}
      {tab === "seo" && <SeoTab />}
    </AdminShell>
  );
}