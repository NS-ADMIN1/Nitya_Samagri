// src/modules/media/media.service.ts
//
// Photo uploads. Two steps, both done by the admin panel:
//   1. POST /media/upload-url        → this service returns a signed link
//   2. PUT the file to `uploadUrl`   → the browser sends it straight to S3,
//                                      with the `headers` returned here
// The photo is then at `publicUrl`, which is what gets saved on the product
// (images: [{ url }]), category, banner and so on.
import crypto from "crypto";
import { publicFileUrl, signedUploadUrl } from "../../integrations/s3";
import { IMAGE_TYPES, UploadUrlInput } from "./media.schema";

const LINK_VALID_SECONDS = 5 * 60;

export function createUploadUrl(input: UploadUrlInput) {
  // A random name inside a year/month folder: uploads can never overwrite
  // each other, and nothing about the original file name is kept.
  const now   = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const name  = crypto.randomBytes(16).toString("hex");
  const key   = `${input.folder}/${now.getUTCFullYear()}/${month}/${name}.${IMAGE_TYPES[input.contentType]}`;

  return {
    uploadUrl: signedUploadUrl(key, input.contentType, LINK_VALID_SECONDS),
    method:    "PUT",
    headers:   { "Content-Type": input.contentType }, // must be sent exactly like this, or S3 refuses the upload
    publicUrl: publicFileUrl(key),
    key,
    expiresIn: LINK_VALID_SECONDS,
  };
}
