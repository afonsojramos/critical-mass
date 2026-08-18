import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildLocationCalendar,
  resolveRecurrence,
  type LocationCalendarEntry,
} from "../src/location-calendar.ts";

const locations: LocationCalendarEntry[] = [
  {
    id: "porto-id",
    slug: "porto",
    data: {
      city: "Porto",
      exact_location: "Praça do Marquês 18h30",
      link: "https://example.com/porto",
      sort_index: 1,
    },
  },
  {
    id: "santa-iria-id",
    slug: "santa-iria",
    data: {
      city: "Santa Iria de Azóia",
      exact_location: "Pirescoxe 10H",
      date_frequency: "1st",
      day_of_week: "Sunday",
      sort_index: 2,
    },
  },
  {
    id: "maia-id",
    slug: "maia",
    data: {
      city: "Maia",
      exact_location: "Pr. Dr. José Vieira de Carvalho 15h30",
      custom_date: "Penúltimo sábado de cada mês",
      sort_index: 3,
    },
  },
  {
    id: "placeholder-id",
    slug: "new-cities",
    data: {
      city: "Coming soon",
      exact_location: "Create your movement",
      sort_index: 100,
    },
  },
  {
    id: "inactive-id",
    slug: "inactive",
    data: {
      city: "Inactive city",
      exact_location: "Old square 18h30",
      activity_status: "inactive",
      sort_index: 4,
    },
  },
];

function unfold(calendar: string): string {
  return calendar.replace(/\r\n[ \t]/g, "");
}

describe("location calendar", () => {
  test("creates one standards-shaped event per real published location", () => {
    const calendar = buildLocationCalendar(locations, "pt", new Date("2026-08-11T10:00:00Z"));
    const content = unfold(calendar);

    assert.equal((content.match(/BEGIN:VEVENT/g) ?? []).length, 3);
    assert.equal((content.match(/\r\nUID:/g) ?? []).length, 3);
    assert.doesNotMatch(content, /Coming soon/);
    assert.doesNotMatch(content, /Inactive city/);
    assert.match(content, /UID:location-porto-id-pt@massacritica\.pt/);
    assert.match(content, /DTSTAMP:20260811T100000Z/);
    assert.match(content, /LOCATION:Praça do Marquês/);
    assert.doesNotMatch(content, /LOCATION:Praça do Marquês 18h30/);
  });

  test("represents default and explicit monthly recurrences with their local times", () => {
    const calendar = unfold(
      buildLocationCalendar(locations, "en", new Date("2026-08-11T10:00:00Z")),
    );

    assert.match(calendar, /DTSTART;TZID=Europe\/Lisbon:20250131T183000/);
    assert.match(calendar, /RRULE:FREQ=MONTHLY;BYDAY=-1FR/);
    assert.match(calendar, /DTSTART;TZID=Europe\/Lisbon:20250105T100000/);
    assert.match(calendar, /RRULE:FREQ=MONTHLY;BYDAY=1SU/);
    assert.match(calendar, /DTSTART;TZID=Europe\/Lisbon:20250118T153000/);
    assert.match(calendar, /RRULE:FREQ=MONTHLY;BYDAY=-2SA/);
  });

  test("folds every physical content line to at most 75 UTF-8 bytes", () => {
    const calendar = buildLocationCalendar(locations, "pt", new Date("2026-08-11T10:00:00Z"));

    assert.ok(calendar.endsWith("\r\n"));
    for (const line of calendar.split("\r\n")) {
      assert.ok(Buffer.byteLength(line, "utf8") <= 75, `Line exceeds 75 bytes: ${line}`);
    }
  });

  test("refuses to invent a recurrence for unsupported custom copy", () => {
    assert.throws(
      () =>
        resolveRecurrence({
          id: "unknown-id",
          data: { custom_date: "Whenever the group announces a ride" },
        }),
      /unsupported custom schedule/,
    );
  });
});
