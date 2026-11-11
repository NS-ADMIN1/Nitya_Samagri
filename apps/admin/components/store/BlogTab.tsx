"use client";

// apps/admin/components/store/BlogTab.tsx — blog posts: write, edit, publish / unpublish, delete.

import { useState } from "react";
import { cmsCreate, cmsDelete, cmsUpdate, formatDay, slugify, useCms, type Blog } from "../../lib/cms";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import { Field, Input, Textarea } from "../ui/Field";
import Notice, { errorMessage } from "../ui/Notice";
import StatusPill from "../ui/StatusPill";
import ConfirmDelete from "./ConfirmDelete";
import NotOnSiteNotice from "./NotOnSiteNotice";

const EMPTY = { title: "", category: "", excerpt: "", content: "" };

export default function BlogTab() {
  const { data, error } = useCms<Blog>("blogs");
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [saving, setSaving] = useState<null | "draft" | "published">(null);
  const [problem, setProblem] = useState("");

  const items = data || [];
  const onText = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const reset = () => {
    setEditing(null);
    setForm(EMPTY);
    setProblem("");
  };

  const save = async (status: "draft" | "published") => {
    if (form.title.trim().length < 2) return setProblem("Enter the post title.");
    if (status === "published" && !form.content.trim()) return setProblem("Write the post before publishing it.");
    setSaving(status);
    setProblem("");
    try {
      const body = {
        title: form.title.trim(),
        category: form.category.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content,
        status,
        // Keep the first publish date; set it the first time the post goes live.
        ...(status === "published" && !editing?.publishedAt ? { publishedAt: new Date().toISOString() } : {}),
      };
      // The web address (slug) is set once, when the post is created.
      if (editing) await cmsUpdate("blogs", editing._id, body);
      else await cmsCreate("blogs", { ...body, slug: slugify(form.title) });
      reset();
    } catch (err) {
      setProblem(errorMessage(err, "saving blog posts"));
    } finally {
      setSaving(null);
    }
  };

  const remove = async (post: Blog) => {
    setProblem("");
    try {
      await cmsDelete("blogs", post._id);
      if (editing?._id === post._id) reset();
    } catch (err) {
      setProblem(errorMessage(err, "deleting blog posts"));
    }
  };

  if (error) return <Notice tone="error">{errorMessage(error, "blog posts")}</Notice>;

  return (
    <div className="flex flex-col gap-5">
      <NotOnSiteNotice what="blog posts" />
      <div className="flex flex-col items-start gap-5 xl:flex-row">
        <div className="w-full min-w-0 xl:flex-1 xl:basis-[360px]">
          <Card>
            <CardHeader title="Posts" subtitle={data ? `${items.filter((p) => p.status === "published").length} published · ${items.filter((p) => p.status !== "published").length} drafts` : undefined} />
            {!data ? (
              <p className="text-sm text-slate">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate">No posts yet. Write the first one in the form.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((post) => (
                  <li key={post._id} className={`flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3 ${editing?._id === post._id ? "border-navy bg-[#F4F6FB]" : "border-line"}`}>
                    <div className="min-w-0 flex-1 basis-[200px]">
                      <div className="text-sm font-semibold text-navy">{post.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate">
                        <StatusPill tone={post.status === "published" ? "green" : "grey"}>{post.status === "published" ? "Published" : "Draft"}</StatusPill>
                        <span>{[post.category, formatDay(post.publishedAt || post.createdAt)].filter(Boolean).join(" · ")}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="edit"
                      onClick={() => {
                        setEditing(post);
                        setForm({ title: post.title, category: post.category || "", excerpt: post.excerpt || "", content: post.content || "" });
                        setProblem("");
                      }}
                    >
                      Edit
                    </Button>
                    <ConfirmDelete onDelete={() => remove(post)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="w-full min-w-0 xl:flex-[2]">
          <Card className="p-[22px]">
            <CardHeader title={editing ? "Edit post" : "Write a post"} subtitle={editing ? `Page address: ${editing.slug}` : undefined} />
            <div className="flex flex-col gap-3.5">
              {problem && <Notice tone="error">{problem}</Notice>}
              <Field id="blog-title" label="Title">
                <Input id="blog-title" value={form.title} onChange={onText("title")} placeholder="e.g. How to set up a daily pooja at home" />
              </Field>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field id="blog-category" label="Category (optional)">
                  <Input id="blog-category" value={form.category} onChange={onText("category")} placeholder="e.g. Festivals" />
                </Field>
                <Field id="blog-excerpt" label="Short summary (optional)">
                  <Input id="blog-excerpt" value={form.excerpt} onChange={onText("excerpt")} placeholder="One or two lines" />
                </Field>
              </div>
              <Field id="blog-content" label="Post">
                <Textarea id="blog-content" rows={12} value={form.content} onChange={onText("content")} placeholder="Write your post here…" />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                {editing && (
                  <Button variant="quiet" disabled={saving !== null} onClick={reset}>
                    Cancel
                  </Button>
                )}
                <Button variant="ghost" loading={saving === "draft"} disabled={saving !== null} onClick={() => save("draft")}>
                  {editing?.status === "published" ? "Unpublish and save" : "Save as draft"}
                </Button>
                <Button icon="check" loading={saving === "published"} disabled={saving !== null} onClick={() => save("published")}>
                  {editing?.status === "published" ? "Save changes" : "Publish"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
