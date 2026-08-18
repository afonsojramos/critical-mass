import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalRedirectUrl } from "../src/canonical-url";

describe("canonicalRedirectUrl", () => {
  it("upgrades http to https in production", () => {
    assert.equal(
      canonicalRedirectUrl("http://massacritica.pt/pt")?.href,
      "https://massacritica.pt/pt",
    );
  });

  it("redirects www to the apex host", () => {
    assert.equal(
      canonicalRedirectUrl("https://www.massacritica.pt/pt")?.href,
      "https://massacritica.pt/pt",
    );
  });

  it("leaves plain-http local dev alone", () => {
    assert.equal(canonicalRedirectUrl("http://localhost:4321/pt"), null);
    assert.equal(canonicalRedirectUrl("http://127.0.0.1:4321/_emdash/admin"), null);
  });

  it("still trims trailing slashes on localhost without changing the scheme", () => {
    assert.equal(
      canonicalRedirectUrl("http://localhost:4321/pt/")?.href,
      "http://localhost:4321/pt",
    );
  });
});
