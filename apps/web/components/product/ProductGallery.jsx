"use client";

// components/product/ProductGallery.jsx
// Main photo with thumbnails. `images` is a list of real photo URLs; with
// none, a neutral placeholder is shown and the thumbnails are left out.
// `activeImage` lets the page switch the photo when a pack size is picked.

import { useEffect, useState } from "react";
import PhotoPlaceholder from "../ui/PhotoPlaceholder";

export default function ProductGallery({ images = [], activeImage, alt }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const i = activeImage ? images.indexOf(activeImage) : -1;
    if (i >= 0) setIndex(i);
  }, [activeImage, images]);

  const current = images[index] || images[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square overflow-hidden rounded-md border border-line bg-mist">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <PhotoPlaceholder size={64} />
        )}
      </div>

      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2 md:gap-3">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className={`block aspect-square w-full overflow-hidden rounded bg-mist ${
                  i === index ? "border-2 border-navy" : "border border-line hover:border-field"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
