# EmDash 1.x local validation

## Upgrade

The site now targets EmDash, its React admin, and the Cloudflare adapter at 1.1.0. The AT Protocol auth plugin is updated to 0.2.46.

Reference fields bound to relations are no longer scalar values in `entry.data`. Gallery location filters, gallery author labels, and article authors read hydrated references. Collection queries do not accept a `references` option in 1.1.0, so listing entries are hydrated through `getEmDashEntry` in batches of eight. The native reference editor replaces the site's old custom reference widget.

The Cloudflare email provider declares `hooks.email-transport:register`, the current name for its existing capability. Delivery behavior is unchanged. Email sending and AT Protocol login were not exercised in the isolated test.

## Released uploader fixes

The site uses the published `emdash-plugin-bulk-upload@^0.2.1`, which includes both EmDash 1.x compatibility fixes:

- Carry the host's configured React admin entry into the runtime plugin definition.
- Move relation-bound fields from `data` to the content API's `references` payload, for both primary and translated drafts. Unbound legacy fields stay in `data`.

The package declares EmDash 1.x-compatible peers, so the temporary pnpm source patch and package-specific peer allowances are no longer needed. No temporary tarball or sibling-checkout dependency is required.

## Safe local server

```sh
pnpm install --frozen-lockfile
pnpm dev:local --host 127.0.0.1
```

Use `dev:local`, not `dev`, for write tests. `astro.local.config.mjs` disables remote bindings and persists D1/R2 state only under `.wrangler/local-test`. The normal Wrangler configuration includes remote production bindings.

The local validation database was provisioned from a SELECT-only schema/content snapshot. Production users, credentials, sessions, and secrets were excluded. Local startup applied the EmDash core migrations from 69 through 90. One legacy naive timestamp was normalized by the built-in migration using UTC. This local migration does not migrate the production database.

A fresh checkout has no local database. Before running the browser test, provision the isolated database with the site's collections and relations, a published Portuguese Porto location, a published Portuguese author, and the Portuguese `cartazes` category. Existing local state from this validation is already provisioned. Do not point the test at production or copy production authentication data.

Authenticate locally through `/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin`.

## Verification

```sh
pnpm test
pnpm lint
pnpm build
pnpm exec playwright test
```

Playwright owns a loopback-only server on port 4323 with remote bindings disabled. The browser test verifies:

- Two-image imports with Porto, an author, Cartazes, and a per-row month.
- Portuguese drafts without unwanted translation drafts.
- Grid/list switching and mobile rendering.
- An injected draft-creation failure and retry, with only two upload-url requests across three creation attempts.
- Persisted relations, taxonomy assignment, retrieval of the uploaded image bytes, and loaded editor/public image previews.
- Opening the created entry with its title, author, and month intact.
- Publishing a disposable local entry and rendering its location filter and author label on the public gallery.
- Successful Portuguese/English home, articles, and gallery route responses.

Fixture teardown removes the entries and newly allocated media created by that test, including after assertion failures. It never deletes media returned by deduplication as already existing. Screenshots and failure traces are generated under ignored `test-results/`.

## Review coverage

Code review: skipped (ce-code-review unavailable). The dedicated review could not complete because its required nested subagent dispatch was unavailable. Three simplification passes inspected the named files; their coverage did not include Git diffs. A manual diff scan and the verification commands above were completed. This is local compatibility evidence, not a full merge-ready review receipt.

## Before production deployment

No deployment, production migration/write, or npm publication was performed as part of this local validation.

Take a database backup and rehearse restoration before deploying, because the EmDash startup migrations change persisted data. After deployment, check gallery location filters and author labels, open an existing entry, create one controlled draft, and exercise real login/email delivery. Monitor Worker logs for migration failures and content API 4xx/5xx responses. If migration or persisted references are wrong, stop editorial writes and restore the database backup together with the previous application version; an application-only rollback is not sufficient after a database migration.
