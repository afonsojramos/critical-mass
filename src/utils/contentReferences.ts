import { getEmDashEntry, type ContentEntry, type ReferenceSelection } from "emdash";

export async function withEntryReferences<D>(
  collection: string,
  entries: ContentEntry<D>[],
  references: ReferenceSelection,
  locale?: string,
) {
  const hydrated: ContentEntry<D>[] = [];
  for (let offset = 0; offset < entries.length; offset += 8) {
    const batch = await Promise.all(
      entries.slice(offset, offset + 8).map(async (entry) => {
        const result = await getEmDashEntry(collection, entry.id, { references, locale });
        if (result.error) throw result.error;
        return { ...entry, references: result.entry?.references };
      }),
    );
    hydrated.push(...batch);
  }
  return hydrated;
}
