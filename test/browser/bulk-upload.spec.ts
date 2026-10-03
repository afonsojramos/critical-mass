import { expect, test as base } from "@playwright/test";
import sharp from "sharp";

const test = base.extend<{ artifacts: { entries: Map<string, string>; media: Set<string> } }>({
  artifacts: async ({ page, baseURL }, use) => {
    expect(baseURL).toBe("http://127.0.0.1:4323");
    const artifacts = { entries: new Map<string, string>(), media: new Set<string>() };
    try {
      await use(artifacts);
    } finally {
      for (const id of artifacts.entries.values()) {
        const response = await page.request.delete(`/_emdash/api/content/gallery/${id}`, {
          headers: { "X-EmDash-Request": "1" },
        });
        expect(response.ok(), `Delete local test entry ${id}: ${await response.text()}`).toBe(true);
        const permanent = await page.request.delete(
          `/_emdash/api/content/gallery/${id}/permanent`,
          {
            headers: { "X-EmDash-Request": "1" },
          },
        );
        expect(permanent.ok(), `Remove local test entry ${id}: ${await permanent.text()}`).toBe(
          true,
        );
      }
      for (const id of artifacts.media) {
        const response = await page.request.delete(`/_emdash/api/media/${id}`, {
          headers: { "X-EmDash-Request": "1" },
        });
        expect(response.ok(), `Delete local test media ${id}: ${await response.text()}`).toBe(true);
      }
    }
  },
});

test("creates related gallery drafts and retries without uploading twice", async ({
  page,
  artifacts,
}) => {
  await page.goto("/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin");
  await page.getByRole("link", { name: "Gallery bulk upload" }).click();
  await expect(page.getByRole("heading", { name: "Bulk upload", exact: true })).toBeVisible();

  const locationsResponse = await page.request.get("/_emdash/api/content/locations?locale=pt");
  expect(locationsResponse.ok()).toBe(true);
  const locations = await locationsResponse.json();
  const porto = locations.data.items.find(
    (entry: { data: { city: string } }) => entry.data.city === "Porto",
  );
  expect(porto).toBeDefined();
  await page.getByRole("combobox", { name: "Location", exact: true }).click();
  await page.getByRole("option", { name: "Porto", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Category", exact: true })).toContainText(
    "Cartazes",
  );
  await expect(page.getByText("Create linked translation drafts", { exact: true })).toHaveCount(0);
  const authorsResponse = await page.request.get("/_emdash/api/content/authors?locale=pt");
  expect(authorsResponse.ok()).toBe(true);
  const author = (await authorsResponse.json()).data.items[0];
  expect(author).toBeDefined();
  await page.getByRole("combobox", { name: "Author", exact: true }).click();
  await page.getByRole("option", { name: author.data.name, exact: true }).click();

  let uploads = 0;
  let attempts = 0;
  const created = artifacts.entries;
  const payloads: Array<Record<string, unknown>> = [];
  await page.route("**/_emdash/api/media/upload-url", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    uploads++;
    const response = await route.fetch();
    if (response.ok()) {
      const body = await response.json();
      if (!body.data.existing) artifacts.media.add(body.data.mediaId);
    }
    await route.fulfill({ response });
  });
  await page.route("**/_emdash/api/content/gallery", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts++;
    payloads.push(route.request().postDataJSON());
    if (attempts === 1) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "TEST_FAILURE", message: "Retry test" },
        }),
      });
    }
    const response = await route.fetch();
    if (response.ok()) {
      const body = await response.json();
      created.set(body.data.item.data.title, body.data.item.id);
    }
    await route.fulfill({ response });
  });

  const titleOne = `EmDash 1.x retry one ${Date.now()}`;
  const titleTwo = `EmDash 1.x retry two ${Date.now()}`;
  const image = (title: string) =>
    sharp({
      create: { width: 300, height: 450, channels: 3, background: "#256344" },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: title } } })
      .png()
      .toBuffer();
  await page.locator('input[type="file"]').setInputFiles([
    { name: "emdash-1-retry-one.png", mimeType: "image/png", buffer: await image(titleOne) },
    { name: "emdash-1-retry-two.png", mimeType: "image/png", buffer: await image(titleTwo) },
  ]);
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveCount(2);
  await page.getByRole("textbox", { name: "Title", exact: true }).first().fill(titleOne);
  await page.getByRole("textbox", { name: "Title", exact: true }).nth(1).fill(titleTwo);
  await page.getByRole("textbox", { name: "Month and year", exact: true }).first().fill("2026-09");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Grid", exact: true }).click();

  await page.getByRole("button", { name: "Create drafts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry failed items", exact: true })).toBeEnabled();
  await expect.poll(() => created.size).toBe(1);
  expect(uploads).toBe(2);
  await page.getByRole("button", { name: "Retry failed items", exact: true }).click();
  await expect.poll(() => created.size).toBe(2);
  expect(attempts).toBe(3);
  expect(uploads).toBe(2);
  expect(artifacts.media.size).toBe(2);

  for (const payload of payloads) {
    expect(payload.status).toBe("draft");
    expect(payload.locale).toBe("pt");
    expect(payload.translationOf).toBeUndefined();
    expect(payload.references).toEqual({ location: [porto.id], author: [author.id] });
    expect(payload.data).not.toHaveProperty("location");
    expect(payload.data).not.toHaveProperty("author");
  }

  for (const id of created.values()) {
    const response = await page.request.get(`/_emdash/api/content/gallery/${id}`);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    const data = body.data.item;
    expect(data.status).toBe("draft");
    expect(data.references.location.children).toHaveLength(1);
    expect(data.references.location.children[0].id).toBe(porto.id);
    expect(data.references.author.children[0].id).toBe(author.id);
    const taxonomyResponse = await page.request.get(
      `/_emdash/api/content/gallery/${id}/terms/category`,
    );
    expect(taxonomyResponse.ok()).toBe(true);
    expect(
      (await taxonomyResponse.json()).data.terms.map((term: { slug: string }) => term.slug),
    ).toContain("cartazes");
    const media = await page.request.get(
      `/_emdash/api/media/file/${data.data.image.meta.storageKey}`,
    );
    expect(media.ok()).toBe(true);
    expect(media.headers()["content-type"]).toContain("image/png");
  }

  const retryEntryId = created.get(titleOne);
  expect(retryEntryId).toBeDefined();
  await page.goto(`/_emdash/admin/content/gallery/${retryEntryId}`);
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue(titleOne);
  await expect(page.locator('input[type="month"]')).toHaveValue("2026-09");
  await expect(page.getByText(author.data.name, { exact: true }).first()).toBeVisible();
  const editorImage = page.locator('img[src*="/_emdash/api/media/"]');
  await expect(editorImage).toHaveCount(1);
  await expect
    .poll(() => editorImage.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/gallery-editor.png", fullPage: true });
  await page.getByRole("button", { name: "Publish now", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Publish now", exact: true }).click();
  await expect
    .poll(async () => {
      const response = await page.request.get(`/_emdash/api/content/gallery/${retryEntryId}`);
      return (await response.json()).data.item.status;
    })
    .toBe("published");
  await page.goto(`/pt/gallery?location=${porto.slug}&year=2026&month=09`);
  const poster = page.locator("[data-poster]").filter({ hasText: titleOne });
  await expect(poster).toBeVisible();
  await expect(poster).toHaveAttribute("data-poster-location", porto.id);
  await expect(poster.locator(".gallery-overlay")).toHaveAttribute(
    "data-author-name",
    author.data.name,
  );
  await expect
    .poll(() => poster.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/gallery-public.png", fullPage: true });
  for (const path of ["/pt", "/en", "/pt/articles", "/en/articles", "/en/gallery"]) {
    const response = await page.request.get(path);
    expect(response.ok(), path).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/_emdash/admin/plugins/gallery-tools/bulk-upload");
  await expect(page.getByRole("heading", { name: "Bulk upload", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Category", exact: true })).toContainText(
    "Cartazes",
  );
  await expect(page.getByRole("combobox", { name: "Location", exact: true })).toBeEnabled();
  await page.screenshot({ path: "test-results/bulk-upload-mobile.png", fullPage: true });
});
