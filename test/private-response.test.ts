import { describe, expect, test } from "bun:test";
import { isPrivateResponseRequest, withPrivateResponseHeaders } from "../src/private-response";

describe("private response policy", () => {
  test.each([
    "/admin",
    "/_emdash/admin",
    "/_emdash/admin/login",
    "/_emdash/api/auth/callback",
    "/_emdash/api/users/invite",
    "/_emdash/api/content/articles/id/preview-url",
    "/_preview/reload",
  ])("classifies %s as private", (pathname) => {
    expect(
      isPrivateResponseRequest(new Request(`https://massacritica.pt${pathname}`), pathname),
    ).toBe(true);
  });

  test.each(["/pt", "/en/articles", "/_emdash/api/media/file/hero.webp"])(
    "leaves anonymous public content at %s public",
    (pathname) => {
      expect(
        isPrivateResponseRequest(new Request(`https://massacritica.pt${pathname}`), pathname),
      ).toBe(false);
    },
  );

  test("treats identity-bearing public requests as private", () => {
    const request = new Request("https://massacritica.pt/pt", {
      headers: { Cookie: "emdash_session=test" },
    });

    expect(isPrivateResponseRequest(request, "/pt")).toBe(true);
  });

  test("overrides weaker cache headers while preserving the response", async () => {
    const response = withPrivateResponseHeaders(
      new Response("streamed body", {
        status: 202,
        headers: {
          "Cache-Control": "public, s-maxage=300",
          "Content-Type": "text/plain",
        },
      }),
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(await response.text()).toBe("streamed body");
  });
});
