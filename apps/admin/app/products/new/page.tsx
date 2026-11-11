"use client";

// apps/admin/app/products/new/page.tsx — add a product to the catalogue.

import { useRouter } from "next/navigation";
import AdminShell from "../../../components/layout/AdminShell";
import ProductForm from "../../../components/products/ProductForm";

export default function NewProductPage() {
  const router = useRouter();
  const back = () => router.push("/products");

  return (
    <AdminShell title="Add product" subtitle="Fill the three steps, then publish or save as a draft">
      <ProductForm onDone={back} onCancel={back} />
    </AdminShell>
  );
}