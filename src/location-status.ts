export interface LocationStatusEntry {
  data: {
    activity_status?: unknown;
    sort_index?: unknown;
  };
}

/** Missing activity status means active for pre-migration compatibility. */
export function isActiveLocation(entry: LocationStatusEntry): boolean {
  return entry.data.activity_status !== "inactive";
}

export function isLiveLocation(entry: LocationStatusEntry): boolean {
  return entry.data.sort_index !== 100 && isActiveLocation(entry);
}
