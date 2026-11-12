// src/modules/cms/cms.service.ts
//
// Storefront content managed from the admin "Store" page. One small generic
// service covers all six kinds; each kind's fields and rules live in its
// Mongoose schema (database/models/CmsContent.ts), which validates every
// create and update.
import { Model } from "mongoose";
import { Banner, Festival, Blog, Section, Announcement, SeoPage } from "../../database/models/CmsContent";
import { AppError } from "../../utils/AppError";
import { slugify } from "../../utils/slugify";

interface CmsKind {
  model: Model<any>;
  /** Which items customers may see. Staff always see everything. */
  live: Record<string, unknown>;
  /** Field the URL slug is generated from when none is sent. */
  slugFrom?: string;
}

const KINDS: Record<string, CmsKind> = {
  banners:       { model: Banner,       live: { status: "active" } },
  festivals:     { model: Festival,     live: { status: { $in: ["active", "upcoming"] } }, slugFrom: "name" },
  blogs:         { model: Blog,         live: { status: "published" }, slugFrom: "title" },
  sections:      { model: Section,      live: { active: true } },
  announcements: { model: Announcement, live: { active: true } },
  "seo-pages":   { model: SeoPage,      live: {} },
};

function kindFor(resource: string): CmsKind {
  const kind = KINDS[resource];
  if (!kind) throw new AppError(`Unknown CMS resource: ${resource}`, 404);
  return kind;
}

/** Drop fields the database manages itself, so a request can't overwrite them. */
function editable(body: Record<string, unknown>): Record<string, unknown> {
  const { _id, id, __v, createdAt, updatedAt, ...fields } = body || {};
  return fields;
}

// ── Storefront ────────────────────────────────────────────────────────────────

/** Festivals that are running or coming up — the storefront's /festival page. */
export function listPublicFestivals() {
  return Festival.find(KINDS.festivals.live).sort({ startDate: 1 }).lean();
}

/** One running/upcoming festival with its campaign products. */
export async function getPublicFestival(slug: string) {
  const item = await Festival.findOne({ slug, ...KINDS.festivals.live }).populate("productIds").lean();
  if (!item) throw new AppError("Festival not found", 404);
  return item;
}

// ── Generic list / create / update / delete ───────────────────────────────────

/** Everything for staff; only live items (no drafts) for everyone else. */
export function listItems(resource: string, forStaff: boolean) {
  const kind = kindFor(resource);
  return kind.model.find(forStaff ? {} : kind.live).sort({ sortOrder: 1, createdAt: -1 }).lean();
}

export function createItem(resource: string, body: Record<string, unknown>) {
  const kind = kindFor(resource);
  const fields = editable(body);

  if (kind.slugFrom && !fields.slug && typeof fields[kind.slugFrom] === "string") {
    fields.slug = slugify(fields[kind.slugFrom] as string);
  }
  return kind.model.create(fields);
}

export async function updateItem(resource: string, id: string, body: Record<string, unknown>) {
  const item = await kindFor(resource).model.findByIdAndUpdate(id, editable(body), { new: true, runValidators: true });
  if (!item) throw new AppError("Not found", 404);
  return item;
}

export async function deleteItem(resource: string, id: string) {
  const item = await kindFor(resource).model.findByIdAndDelete(id);
  if (!item) throw new AppError("Not found", 404);
}
