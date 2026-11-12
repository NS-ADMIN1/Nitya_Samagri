// src/integrations/s3.ts
//
// AWS S3 for photos. The API never receives the file itself: it hands the
// admin's browser a short-lived signed link, and the browser uploads the
// photo straight to the bucket with it.
//
// The link is signed with AWS "Signature Version 4" using only Node's
// built-in crypto, so no AWS package is needed. presignUrl() is checked in
// tests/unit/s3.test.ts against the worked example in AWS's own S3 docs.
import crypto from "crypto";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const hmac   = (key: crypto.BinaryLike, data: string) => crypto.createHmac("sha256", key).update(data).digest();
const sha256 = (data: string) => crypto.createHash("sha256").update(data).digest("hex");

/** Percent-encode the way AWS expects (RFC 3986): everything except A-Z a-z 0-9 - _ . ~ */
function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export interface PresignParams {
  method:          "GET" | "PUT";
  host:            string;                  // e.g. my-bucket.s3.ap-south-1.amazonaws.com
  key:             string;                  // path inside the bucket, e.g. products/2026/11/ab12.jpg
  region:          string;
  accessKeyId:     string;
  secretAccessKey: string;
  expiresIn:       number;                  // seconds the link stays valid
  headers?:        Record<string, string>;  // headers the caller MUST send, exactly as given (e.g. Content-Type)
  now?:            Date;
}

/** Build a signed S3 link. Pure: the same inputs always give the same link. */
export function presignUrl(p: PresignParams): string {
  const amzDate = (p.now || new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); // 20261111T093000Z
  const day     = amzDate.slice(0, 8);
  const scope   = `${day}/${p.region}/s3/aws4_request`;

  // Headers that are part of the signature, lower-cased and in A–Z order
  const headers: Record<string, string> = { host: p.host };
  for (const [name, value] of Object.entries(p.headers || {})) headers[name.toLowerCase()] = value.trim();
  const headerNames   = Object.keys(headers).sort();
  const signedHeaders = headerNames.join(";");

  const query: Record<string, string> = {
    "X-Amz-Algorithm":     "AWS4-HMAC-SHA256",
    "X-Amz-Credential":    `${p.accessKeyId}/${scope}`,
    "X-Amz-Date":          amzDate,
    "X-Amz-Expires":       String(p.expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const queryString = Object.keys(query).sort().map((k) => `${awsEncode(k)}=${awsEncode(query[k])}`).join("&");
  const path = "/" + p.key.split("/").map(awsEncode).join("/");

  const canonicalRequest = [
    p.method,
    path,
    queryString,
    headerNames.map((n) => `${n}:${headers[n]}\n`).join(""),
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${p.secretAccessKey}`, day), p.region), "s3"), "aws4_request");
  const signature  = hmac(signingKey, stringToSign).toString("hex");

  return `https://${p.host}${path}?${queryString}&X-Amz-Signature=${signature}`;
}

// ── This store's bucket ───────────────────────────────────────────────────────

function bucketConfig() {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET } = env;
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !AWS_S3_BUCKET) {
    throw new AppError("Photo storage is not set up (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET)", 503);
  }
  return {
    accessKeyId:     AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region:          AWS_REGION,
    host:            `${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`,
  };
}

/** A link the browser can PUT one file to. The upload must send exactly this Content-Type. */
export function signedUploadUrl(key: string, contentType: string, expiresIn: number): string {
  return presignUrl({ method: "PUT", key, expiresIn, headers: { "content-type": contentType }, ...bucketConfig() });
}

/**
 * The address customers load the file from: MEDIA_BASE_URL when set (a
 * CloudFront domain in front of the bucket), otherwise the bucket itself.
 */
export function publicFileUrl(key: string): string {
  const base = env.MEDIA_BASE_URL ? env.MEDIA_BASE_URL.replace(/\/+$/, "") : `https://${bucketConfig().host}`;
  return `${base}/${key.split("/").map(awsEncode).join("/")}`;
}
