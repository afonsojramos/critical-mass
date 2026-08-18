import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isPrivateResponseRequest,
  privateRouteRedirectUrl,
  withPrivateResponseHeaders,
} from "../src/private-response.ts";

describe("private response policy", () => {
  test("keeps the /admin redirect inside the private Worker policy", () => {
    assert.equal(
      privateRouteRedirectUrl("https://massacritica.pt/admin")?.href,
      "https://massacritica.pt/_emdash/admin",
    );
    assert.equal(privateRouteRedirectUrl("https://massacritica.pt/pt"), null);
  });

  for (const pathname of [
    "/admin",
    "/_emdash/admin",
    "/_emdash/admin/login",
    "/_emdash/api/auth/callback",
    "/_emdash/api/users/invite",
    "/_emdash/api/content/articles/id/preview-url",
    "/_preview/reload",
  ]) {
    test(`classifies ${pathname} as private`, () => {
      assert.equal(
        isPrivateResponseRequest(new Request(`https://massacritica.pt${pathname}`), pathname),
        true,
      );
    });
  }

  for (const pathname of ["/pt", "/en/articles", "/_emdash/api/media/file/hero.webp"]) {
    test(`leaves anonymous public content at ${pathname} public`, () => {
      assert.equal(
        isPrivateResponseRequest(new Request(`https://massacritica.pt${pathname}`), pathname),
        false,
      );
    });
  }

  test("treats identity-bearing public requests as private", () => {
    const request = new Request("https://massacritica.pt/pt", {
      headers: { Cookie: "emdash_session=test" },
    });

    assert.equal(isPrivateResponseRequest(request, "/pt"), true);
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

    assert.equal(response.status, 202);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
    assert.match(response.headers.get("Content-Type") ?? "", /text\/plain/);
    assert.equal(await response.text(), "streamed body");
  });
});
