// apps/admin/lib/cms.ts
//
// Storefront content managed from the admin, all through the generic CMS
// API: GET /cms/:resource (public), POST /cms/:resource and
// PATCH/DELETE /cms/:resource/:id (admin and super admin).
//
// What the customer site (apps/web) actually reads today:
//   announcements — the strip above the header
//   festivals     — the festival pages and "Shop by occasion" on the homepage
// Sections, banners, blogs and SEO pages are saved here but the customer
// site does not read them yet.

import useSWR, { mutate } from "swr";
import { api } from "./api";

export type CmsResource = "announcements" | "festivals" | "sections" | "banners" | "blogs" | "seo-pages";

export interface Announcement {
  _id: string;
  text: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export type FestivalStatus = "draft" | "upcoming" | "active" | "completed";
export interface Festival {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  bannerImage?: string;
  startDate: string;
  endDate: string;
  status: FestivalStatus;
  productIds: string[];
}

export interface Section {
  _id: string;
  label: string;
  type: string;
  active: boolean;
  sortOrder: number;
}

export type BannerStatus = "active" | "draft" | "expired";
export interface Banner {
  _id: string;
  title: string;
  cta?: string;
  url?: string;
  imageUrl?: string;
  status: BannerStatus;
}

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  category?: string;
  excerpt?: string;
  content: string;
  status: "draft" | "published";
  publishedAt?: string;
  createdAt?: string;
}

export interface SeoPage {
  _id: string;
  page: string;
  title: string;
  desc?: string;
}

const url = (resource: CmsResource) => `/api/v1/cms/${resource}`;

export function useCms<T>(resource: CmsResource) {
  return useSWR(url(resource), (u: string) => api.get<{ data: { items: T[] } }>(u).then((r) => r.data.items), { shouldRetryOnError: false });
}

export async function cmsCreate(resource: CmsResource, body: object): Promise<void> {
  await api.post(url(resource), body);
  await mutate(url(resource));
}
export async function cmsUpdate(resource: CmsResource, id: string, body: object): Promise<void> {
  await api.patch(`${url(resource)}/${id}`, body);
  await mutate(url(resource));
}
export async function cmsDelete(resource: CmsResource, id: string): Promise<void> {
  await api.delete(`${url(resource)}/${id}`);
  await mutate(url(resource));
}

// ── Dates: date inputs give YYYY-MM-DD in the staff member's own time zone ──
export function toDateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Start of that day, as the API wants it. */
export const dayStart = (date: string) => new Date(`${date}T00:00:00`).toISOString();
/** End of that day, so something "ending 30 Nov" is still live all of 30 Nov. */
export const dayEnd = (date: string) => new Date(`${date}T23:59:59.999`).toISOString();

export function formatDay(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Same rule the customer site uses (apps/web/lib/normalize.js → isAnnouncementLive). */
export function isAnnouncementLive(a: Announcement, now = new Date()): boolean {
  if (!a.active || !a.text) return false;
  if (a.startDate && new Date(a.startDate) > now) return false;
  if (a.endDate && new Date(a.endDate) < now) return false;
  return true;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
