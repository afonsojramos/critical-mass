import { createEditable, createNoop, getRequestContext } from "emdash";

/**
 * Emdash visual-editing annotations for a content entry.
 *
 * Spread onto elements to make them clickable in the CMS edit overlay:
 * - `{...editable(coll, entry)}` on the entry container (entry-level)
 * - `{...editable(coll, entry).title}` on a field element (field-level)
 *
 * Outside edit mode this returns a noop proxy that spreads to nothing, so it is
 * safe in production. We rebuild the proxy from `(collection, id)` rather than
 * reusing `entry.edit` because `getEmDashCollection` strips the proxy from
 * cached list results (only `getEmDashEntry` preserves it). The DB id lives on
 * `entry.data.id` (a ULID); `entry.id` is the slug, which the overlay can't
 * resolve.
 */
// biome-ignore lint/suspicious/noExplicitAny: emdash returns untyped entries
export function editable(collection: string, entry: any) {
  const id = entry?.data?.id ?? entry?.id;
  return getRequestContext()?.editMode && id ? createEditable(collection, id) : createNoop();
}
