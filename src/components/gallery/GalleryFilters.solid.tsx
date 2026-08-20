/** @jsxImportSource @solidjs/web */
import { createSignal, For, onCleanup, Show } from "solid-js";

export interface GalleryFilterLabels {
  location: string;
  allLocations: string;
  year: string;
  allYears: string;
  month: string;
  allMonths: string;
  clear: string;
}

export interface GalleryFiltersProps {
  labels: GalleryFilterLabels;
  /** `id` is the reference id stored on gallery entries. */
  locations: Array<{ slug: string; city: string; id: string }>;
  years: string[];
  months: Array<{ value: string; label: string }>;
  selected: { location: string; year: string; month: string };
  /** Gallery URL for the current category, e.g. `/pt/gallery/cartazes/`. */
  basePath: string;
}

type Filters = { location: string; year: string; month: string };

const PILL_BASE =
  "flex min-h-12 cursor-pointer select-none list-none items-center gap-2 rounded-full border-2 px-5 font-medium transition";
const PILL_ACTIVE = "border-dark bg-dark text-white shadow-[0_4px_0_0_#b9ff66]";
const PILL_IDLE = "border-gray-300 bg-white hover:border-gray-400";
const PANEL =
  "absolute left-1/2 z-20 mt-2 -translate-x-1/2 overflow-hidden rounded-2xl border-2 border-dark bg-white shadow-[0_6px_0_0_#b9ff66]";
const OPTION = "block w-full rounded-xl px-4 py-2.5 text-left transition hover:bg-green/30";

function GalleryFilters(props: GalleryFiltersProps) {
  const [filters, setFilters] = createSignal<Filters>(props.selected);
  const [openMenu, setOpenMenu] = createSignal<string | null>(null);

  const cityOf = (slug: string) => props.locations.find((location) => location.slug === slug)?.city;
  const monthLabelOf = (value: string) =>
    props.months.find((month) => month.value === value)?.label;

  const hrefFor = (next: Filters) => {
    const search = new URLSearchParams();
    if (next.location) search.set("location", next.location);
    if (next.year) search.set("year", next.year);
    if (next.year && next.month) search.set("month", next.month);
    return search.size > 0 ? `${props.basePath}?${search}` : props.basePath;
  };

  // Clearing the year clears the month with it, mirroring the server.
  const withOverrides = (overrides: Partial<Filters>): Filters => {
    const next = { ...filters(), ...overrides };
    if (!next.year) next.month = "";
    return next;
  };

  const apply = (event: MouseEvent, overrides: Partial<Filters>) => {
    // Modified clicks stay real navigations so links keep opening in tabs.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const next = withOverrides(overrides);
    setOpenMenu(null);
    setFilters(next);
    history.pushState(next, "", hrefFor(next));
    applyToGrid(next);
  };

  // The grid stays server-rendered; the island only toggles visibility so the
  // first paint (and no-JS visitors) keep the full, indexable markup.
  const applyToGrid = (next: Filters) => {
    // Cards carry the location reference id; the filter state carries slugs.
    const locationId = props.locations.find((location) => location.slug === next.location)?.id;
    const update = () => {
      const cards = document.querySelectorAll<HTMLElement>("#gallery-grid > [data-poster]");
      let visible = 0;
      for (const card of cards) {
        const date = card.dataset.posterDate ?? "";
        const matches =
          (!next.location || card.dataset.posterLocation === locationId) &&
          (!next.year || date.startsWith(next.year)) &&
          (!next.month || date === `${next.year}-${next.month}`);
        card.hidden = !matches;
        if (matches) visible++;
      }
      const empty = document.getElementById("gallery-empty");
      if (empty) empty.hidden = visible > 0;
    };
    // Same-document view transition: posters morph to their new position
    // instead of jumping. Unsupported browsers just get the instant update.
    if (document.startViewTransition) document.startViewTransition(update);
    else update();
  };

  // Back/forward moves between filter states we pushed, so re-apply them.
  {
    const onPopState = (event: PopStateEvent) => {
      const url = new URL(window.location.href);
      const next: Filters = (event.state as Filters | null) ?? {
        location: url.searchParams.get("location") ?? "",
        year: url.searchParams.get("year") ?? "",
        month: url.searchParams.get("month") ?? "",
      };
      setFilters(next);
      applyToGrid(next);
    };
    window.addEventListener("popstate", onPopState);
    onCleanup(() => window.removeEventListener("popstate", onPopState));
  }

  const menu = (name: string) => ({
    open: openMenu() === name,
    onToggle: (event: Event) => {
      const details = event.currentTarget as HTMLDetailsElement;
      setOpenMenu(details.open ? name : null);
    },
  });

  return (
    <div
      class="mx-auto mb-8 flex max-w-4xl flex-wrap items-center justify-center gap-3"
      id="gallery-filters"
    >
      <details class="gallery-dropdown relative" {...menu("location")}>
        <summary class={`${PILL_BASE} ${filters().location ? PILL_ACTIVE : PILL_IDLE}`}>
          <span class="text-sm opacity-70">{props.labels.location}</span>
          <span>{cityOf(filters().location) ?? props.labels.allLocations}</span>
          <Chevron />
        </summary>
        <div class={`${PANEL} w-56`}>
          <div class="max-h-80 overflow-y-auto p-2 [scrollbar-width:thin]">
            <a
              href={hrefFor(withOverrides({ location: "" }))}
              class={`${OPTION} ${filters().location ? "" : "bg-dark text-white"}`}
              onClick={(event) => apply(event, { location: "" })}
            >
              {props.labels.allLocations}
            </a>
            <For each={props.locations}>
              {(location) => (
                <a
                  href={hrefFor(withOverrides({ location: location.slug }))}
                  class={`${OPTION} ${
                    filters().location === location.slug ? "bg-dark text-white" : ""
                  }`}
                  onClick={(event) => apply(event, { location: location.slug })}
                >
                  {location.city}
                </a>
              )}
            </For>
          </div>
        </div>
      </details>

      <details class="gallery-dropdown relative" {...menu("year")}>
        <summary class={`${PILL_BASE} ${filters().year ? PILL_ACTIVE : PILL_IDLE}`}>
          <span class="text-sm opacity-70">{props.labels.year}</span>
          <span>{filters().year || props.labels.allYears}</span>
          <Chevron />
        </summary>
        <div class={`${PANEL} w-44`}>
          <div class="max-h-80 overflow-y-auto p-2 [scrollbar-width:thin]">
            <a
              href={hrefFor(withOverrides({ year: "" }))}
              class={`${OPTION} ${filters().year ? "" : "bg-dark text-white"}`}
              onClick={(event) => apply(event, { year: "" })}
            >
              {props.labels.allYears}
            </a>
            <For each={props.years}>
              {(year) => (
                <a
                  href={hrefFor(withOverrides({ year }))}
                  class={`${OPTION} tabular-nums ${
                    filters().year === year ? "bg-dark text-white" : ""
                  }`}
                  onClick={(event) => apply(event, { year })}
                >
                  {year}
                </a>
              )}
            </For>
          </div>
        </div>
      </details>

      {/* The month filter only makes sense once a year is picked. */}
      <Show when={filters().year}>
        <details class="gallery-dropdown relative" {...menu("month")}>
          <summary class={`${PILL_BASE} ${filters().month ? PILL_ACTIVE : PILL_IDLE}`}>
            <span class="text-sm opacity-70">{props.labels.month}</span>
            <span>{monthLabelOf(filters().month) ?? props.labels.allMonths}</span>
            <Chevron />
          </summary>
          <div class={`${PANEL} w-48`}>
            <div class="max-h-80 overflow-y-auto p-2 [scrollbar-width:thin]">
              <a
                href={hrefFor(withOverrides({ month: "" }))}
                class={`${OPTION} ${filters().month ? "" : "bg-dark text-white"}`}
                onClick={(event) => apply(event, { month: "" })}
              >
                {props.labels.allMonths}
              </a>
              <For each={props.months}>
                {(month) => (
                  <a
                    href={hrefFor(withOverrides({ month: month.value }))}
                    class={`${OPTION} ${
                      filters().month === month.value ? "bg-dark text-white" : ""
                    }`}
                    onClick={(event) => apply(event, { month: month.value })}
                  >
                    {month.label}
                  </a>
                )}
              </For>
            </div>
          </div>
        </details>
      </Show>

      <Show when={filters().location || filters().year}>
        <a
          href={props.basePath}
          class="rounded-lg px-2 py-3 text-sm underline decoration-green decoration-2 underline-offset-4 hover:text-green"
          onClick={(event) => apply(event, { location: "", year: "", month: "" })}
        >
          {props.labels.clear}
        </a>
      </Show>
    </div>
  );
}

function Chevron() {
  return (
    <svg
      class="size-4 shrink-0 transition-transform"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export default GalleryFilters;
