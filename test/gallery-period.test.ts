import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  galleryPeriodLabel,
  galleryPeriodRange,
  nextGalleryPeriod,
  normalizeGalleryPeriod,
} from "../src/gallery-period.ts";

describe("gallery periods", () => {
  test("normalizes current month values and legacy ISO timestamps", () => {
    assert.equal(normalizeGalleryPeriod("2026-08"), "2026-08");
    assert.equal(normalizeGalleryPeriod("2026-08-19T00:00:00.000Z"), "2026-08");
    assert.equal(normalizeGalleryPeriod("2026-13"), undefined);
    assert.equal(normalizeGalleryPeriod("2026-08garbage"), undefined);
    assert.equal(normalizeGalleryPeriod("2026-08-xx"), undefined);
  });

  test("builds exclusive month ranges across year boundaries", () => {
    assert.deepEqual(galleryPeriodRange("2026-08"), { gte: "2026-08", lt: "2026-09" });
    assert.deepEqual(galleryPeriodRange("2026-12"), { gte: "2026-12", lt: "2027-01" });
    assert.equal(nextGalleryPeriod("not-a-period"), undefined);
  });

  test("supports year-only periods", () => {
    assert.deepEqual(galleryPeriodRange("2023"), { gte: "2023-01", lt: "2024-01" });
    assert.equal(galleryPeriodRange("202"), undefined);
    assert.equal(galleryPeriodRange("20233"), undefined);
  });

  test("formats a period without inventing a day", () => {
    assert.equal(galleryPeriodLabel("2026-08", "pt"), "agosto de 2026");
    assert.equal(galleryPeriodLabel("2026-08", "en"), "August 2026");
  });
});
