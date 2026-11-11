// apps/admin/components/store/NotOnSiteNotice.tsx
//
// Shown on Storefront tabs whose content is saved by the API but which the
// customer site does not read yet, so staff are not misled.

import Notice from "../ui/Notice";

export default function NotOnSiteNotice({ what }: { what: string }) {
  return (
    <Notice tone="warning">
      <strong>Saved, but not shown to customers yet.</strong> The customer site does not read {what} at the moment, so changes here do not appear on nityasamagri.in until that is connected.
    </Notice>
  );
}
