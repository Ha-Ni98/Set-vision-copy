import { describe, it, expect } from "vitest";
import { apiPath, withParams } from "@/lib/api-path";

describe("apiPath", () => {
  it("joins fragments with a single leading slash", () => {
    expect(apiPath("/users", "/:id")).toBe("/users/:id");
  });

  it("collapses duplicate slashes from adjacent fragments", () => {
    expect(apiPath("//foo//", "//bar//")).toBe("/foo/bar");
  });

  it("strips a trailing slash", () => {
    expect(apiPath("/users/")).toBe("/users");
  });

  it("returns a bare '/' for an all-slash fragment (e.g. contract's GET_ALL: '/')", () => {
    expect(apiPath("/lots", "/")).toBe("/lots");
  });

  it("returns '/' for no fragments at all", () => {
    expect(apiPath()).toBe("/");
  });
});

describe("withParams", () => {
  it("substitutes a single :param", () => {
    expect(withParams("/users/:id", { id: "42" })).toBe("/users/42");
  });

  it("substitutes multiple params in one path", () => {
    expect(withParams("/:a/:b", { a: "1", b: "2" })).toBe("/1/2");
  });

  it("URL-encodes spaces in param values", () => {
    expect(withParams("/search/:term", { term: "a b" })).toBe("/search/a%20b");
  });

  it("URL-encodes unicode in param values", () => {
    expect(withParams("/geography/:name", { name: "café" })).toBe("/geography/caf%C3%A9");
  });

  // Pinned sharp edge (plan.md §4.4): api-path.ts is kept verbatim from the rules, so a
  // missing param renders the literal string "undefined" rather than throwing. Documented
  // by test, not silently relied upon.
  it("renders a missing param as the literal string 'undefined'", () => {
    expect(withParams("/users/:id", {})).toBe("/users/undefined");
  });
});
