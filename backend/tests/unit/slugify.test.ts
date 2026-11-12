import { slugify } from "../../src/utils/slugify";

describe("slugify()", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Daily Pooja Essentials")).toBe("daily-pooja-essentials");
  });

  it("drops punctuation and trims leading/trailing hyphens", () => {
    expect(slugify("  Pooja Thali (Brass)! ")).toBe("pooja-thali-brass");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugify("पूजा")).toBe("");
  });
});
