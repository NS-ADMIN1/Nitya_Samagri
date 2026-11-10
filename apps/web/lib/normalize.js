// apps/web/lib/normalize.js
//
// One mapper from the backend's product shape (GET /api/v1/products, see
// backend/src/modules/products/product.routes.ts) to what the storefront
// renders. Nothing is invented: a product with no photo has image = null
// (the card shows a neutral placeholder), and there is no rating field
// because the list endpoint does not return one.

export function normalizeProduct(p) {
  const variants = (p.variants || [])
    .filter((v) => v.isActive !== false)
    .map((v) => ({
      id: v._id,
      label: v.label,
      price: v.price,
      mrp: v.mrp,
      stock: v.stock ?? 0,
      imageUrl: v.imageUrl || null,
    }));

  // The Product model has no image field yet; a variant photo is the only
  // real image the API can return today.
  const image = variants.find((v) => v.imageUrl)?.imageUrl || null;

  const stock = variants.length
    ? variants.reduce((sum, v) => sum + (v.stock || 0), 0)
    : p.stock ?? 0;

  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    category: p.categoryId?.name || "",
    categoryId: p.categoryId?._id || p.categoryId || null,
    shortDesc: p.shortDesc || "",
    price: p.price,
    mrp: p.mrp,
    gstPct: p.gstPct,
    image,
    stock,
    inStock: stock > 0,
    variants,
    isFeatured: !!p.isFeatured,
    sold: p.sold ?? 0,
  };
}

// The cart item shape lib/cartStore.ts expects.
export function toCartItem(product) {
  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    mrp: product.mrp,
    category: product.category,
    gstPct: product.gstPct,
    image: product.image || undefined,
  };
}

// An announcement from GET /cms/announcements is live when it is switched
// on and today falls inside its optional start/end window.
export function isAnnouncementLive(a, now = new Date()) {
  if (!a || !a.active || !a.text) return false;
  if (a.startDate && new Date(a.startDate) > now) return false;
  if (a.endDate && new Date(a.endDate) < now) return false;
  return true;
}