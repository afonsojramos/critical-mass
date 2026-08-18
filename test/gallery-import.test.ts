import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { galleryMediaValue, galleryTitleFromFilename } from "../src/gallery-import";

describe("gallery import helpers", () => {
  test("turns filenames into editable titles", () => {
    assert.equal(
      galleryTitleFromFilename("massa-critica_porto-2026.webp"),
      "Massa critica porto 2026",
    );
    assert.equal(galleryTitleFromFilename("poster.jpg"), "Poster");
  });

  test("creates the same local media value as the Emdash image picker", () => {
    assert.deepEqual(
      galleryMediaValue(
        {
          id: "media-id",
          filename: "poster.webp",
          mimeType: "image/webp",
          url: "/unused-for-local",
          storageKey: "poster-key.webp",
          width: 1200,
          height: 1600,
        },
        "Porto poster",
      ),
      {
        id: "media-id",
        provider: "local",
        previewUrl: undefined,
        alt: "Porto poster",
        width: 1200,
        height: 1600,
        filename: "poster.webp",
        mimeType: "image/webp",
        blurhash: undefined,
        dominantColor: undefined,
        meta: { storageKey: "poster-key.webp" },
      },
    );
  });
});
