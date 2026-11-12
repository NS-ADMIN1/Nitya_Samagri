import { presignUrl } from "../../src/integrations/s3";

describe("presignUrl()", () => {
  // The worked example from the AWS S3 documentation ("Authenticating
  // Requests: Using Query Parameters (AWS Signature Version 4)"). If this
  // signature matches, the signing steps are right.
  it("produces the signature in AWS's documented example", () => {
    const url = presignUrl({
      method:          "GET",
      host:            "examplebucket.s3.amazonaws.com",
      key:             "test.txt",
      region:          "us-east-1",
      accessKeyId:     "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      expiresIn:       86400,
      now:             new Date("2013-05-24T00:00:00Z"),
    });

    expect(url).toContain("X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request");
    expect(url).toMatch(/X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404$/);
  });

  it("makes the Content-Type part of the signature for uploads", () => {
    const base = {
      method: "PUT" as const, host: "b.s3.ap-south-1.amazonaws.com", key: "products/2026/11/a.jpg", region: "ap-south-1",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "secret", expiresIn: 300, now: new Date("2026-11-11T00:00:00Z"),
    };
    const jpeg = presignUrl({ ...base, headers: { "content-type": "image/jpeg" } });
    const png  = presignUrl({ ...base, headers: { "content-type": "image/png" } });

    expect(jpeg).toContain("X-Amz-SignedHeaders=content-type%3Bhost");
    expect(jpeg).not.toBe(png); // a link signed for a JPG cannot be used to upload anything else
  });
});
