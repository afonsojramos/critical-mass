export type CalendarLocale = "en" | "pt";

export interface LocationCalendarEntry {
  id: string;
  slug?: string | null;
  data: {
    city?: unknown;
    exact_location?: unknown;
    link?: unknown;
    sort_index?: unknown;
    date_frequency?: unknown;
    day_of_week?: unknown;
    custom_date?: unknown;
  };
}

interface Recurrence {
  ordinal: number;
  weekday: Weekday;
}

type Weekday = "FR" | "MO" | "SA" | "SU" | "TH" | "TU" | "WE";

const WEEKDAY_INDEX: Record<Weekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const TIME_PATTERN = /\b([01]?\d|2[0-3])(?:\s*[:hH]\s*([0-5]\d)?)\b/;

const TIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Lisbon",
  "X-LIC-LOCATION:Europe/Lisbon",
  "BEGIN:STANDARD",
  "TZNAME:WET",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "TZNAME:WEST",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "DTSTART:19700329T010000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];

function requiredString(value: unknown, field: string, entryId: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Location ${entryId} is missing ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function weekdayFromText(value: string): Weekday | undefined {
  const text = normalized(value);
  const weekdays: Array<[string[], Weekday]> = [
    [["sunday", "domingo"], "SU"],
    [["monday", "segunda"], "MO"],
    [["tuesday", "terca"], "TU"],
    [["wednesday", "quarta"], "WE"],
    [["thursday", "quinta"], "TH"],
    [["friday", "sexta"], "FR"],
    [["saturday", "sabado"], "SA"],
  ];

  return weekdays.find(([names]) => names.some((name) => text.includes(name)))?.[1];
}

function ordinalFromText(value: string): number | undefined {
  const text = normalized(value);
  if (
    text.includes("penultimo") ||
    text.includes("second-to-last") ||
    text.includes("second to last")
  ) {
    return -2;
  }
  if (text.includes("ultimo") || text.includes("last")) return -1;
  if (text.includes("primeiro") || text.includes("first") || text === "1st") return 1;
  if (text.includes("segundo") || text.includes("second") || text === "2nd") return 2;
  if (text.includes("terceiro") || text.includes("third") || text === "3rd") return 3;
  if (text.includes("quarto") || text.includes("fourth") || text === "4th") return 4;
  return undefined;
}

export function resolveRecurrence(entry: LocationCalendarEntry): Recurrence {
  const customDate = optionalString(entry.data.custom_date);
  if (customDate) {
    const ordinal = ordinalFromText(customDate);
    const weekday = weekdayFromText(customDate);
    if (ordinal && weekday) return { ordinal, weekday };
    throw new Error(`Location ${entry.id} has an unsupported custom schedule: ${customDate}`);
  }

  const frequency = optionalString(entry.data.date_frequency);
  const dayOfWeek = optionalString(entry.data.day_of_week);
  if (frequency || dayOfWeek) {
    const ordinal = frequency ? ordinalFromText(frequency) : undefined;
    const weekday = dayOfWeek ? weekdayFromText(dayOfWeek) : undefined;
    if (ordinal && weekday) return { ordinal, weekday };
    throw new Error(`Location ${entry.id} has an incomplete recurring schedule.`);
  }

  return { ordinal: -1, weekday: "FR" };
}

function resolveTime(exactLocation: string): { hour: number; minute: number } {
  const match = exactLocation.match(TIME_PATTERN);
  if (!match) return { hour: 18, minute: 30 };
  return { hour: Number(match[1]), minute: Number(match[2] ?? 0) };
}

function locationWithoutTime(exactLocation: string): string {
  return exactLocation
    .replace(TIME_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function anchorDate(recurrence: Recurrence): string {
  const matchingDays: number[] = [];
  for (let day = 1; day <= 31; day += 1) {
    if (new Date(Date.UTC(2025, 0, day)).getUTCMonth() !== 0) break;
    if (new Date(Date.UTC(2025, 0, day)).getUTCDay() === WEEKDAY_INDEX[recurrence.weekday]) {
      matchingDays.push(day);
    }
  }

  const index =
    recurrence.ordinal > 0 ? recurrence.ordinal - 1 : matchingDays.length + recurrence.ordinal;
  const day = matchingDays[index];
  if (!day)
    throw new Error(`Cannot create an anchor date for ${recurrence.ordinal}${recurrence.weekday}.`);
  return `202501${String(day).padStart(2, "0")}`;
}

function scheduleLabel(locale: CalendarLocale, recurrence: Recurrence): string {
  const days =
    locale === "pt"
      ? {
          SU: "domingo",
          MO: "segunda-feira",
          TU: "terça-feira",
          WE: "quarta-feira",
          TH: "quinta-feira",
          FR: "sexta-feira",
          SA: "sábado",
        }
      : {
          SU: "Sunday",
          MO: "Monday",
          TU: "Tuesday",
          WE: "Wednesday",
          TH: "Thursday",
          FR: "Friday",
          SA: "Saturday",
        };
  const day = days[recurrence.weekday];

  if (locale === "en") {
    const ordinal =
      recurrence.ordinal === -2
        ? "Second-to-last"
        : recurrence.ordinal === -1
          ? "Last"
          : ["First", "Second", "Third", "Fourth"][recurrence.ordinal - 1];
    return `${ordinal} ${day} of the month`;
  }

  const masculine = recurrence.weekday === "SU" || recurrence.weekday === "SA";
  const ordinal =
    recurrence.ordinal === -2
      ? masculine
        ? "Penúltimo"
        : "Penúltima"
      : recurrence.ordinal === -1
        ? masculine
          ? "Último"
          : "Última"
        : `${recurrence.ordinal}${masculine ? "º" : "ª"}`;
  return `${ordinal} ${day} do mês`;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line: string): string[] {
  const output: string[] = [];
  let segment = "";
  let limit = 75;

  for (const character of line) {
    if (Buffer.byteLength(segment + character, "utf8") > limit) {
      output.push(output.length === 0 ? segment : ` ${segment}`);
      segment = character;
      limit = 74;
    } else {
      segment += character;
    }
  }

  output.push(output.length === 0 ? segment : ` ${segment}`);
  return output;
}

function utcTimestamp(value: Date): string {
  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function buildLocationCalendar(
  entries: LocationCalendarEntry[],
  locale: CalendarLocale,
  generatedAt = new Date(),
): string {
  const calendarName = locale === "pt" ? "Massa Crítica Portugal" : "Critical Mass Portugal";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Massa Critica Portugal//Locations//${locale.toUpperCase()}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "X-WR-TIMEZONE:Europe/Lisbon",
    ...TIMEZONE,
  ];

  const locations = entries
    .filter((entry) => entry.data.sort_index !== 100)
    .sort((a, b) => Number(a.data.sort_index ?? 0) - Number(b.data.sort_index ?? 0));

  for (const entry of locations) {
    const city = requiredString(entry.data.city, "city", entry.id);
    const exactLocation = requiredString(entry.data.exact_location, "exact_location", entry.id);
    const recurrence = resolveRecurrence(entry);
    const { hour, minute } = resolveTime(exactLocation);
    const time = `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
    const label = scheduleLabel(locale, recurrence);
    const link = optionalString(entry.data.link) ?? `https://massacritica.pt/${locale}/#locations`;
    const description =
      locale === "pt"
        ? `${label}, às ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}. Consulta atualizações em ${link}`
        : `${label} at ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}. Check for updates at ${link}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:location-${entry.id}-${locale}@massacritica.pt`,
      `DTSTAMP:${utcTimestamp(generatedAt)}`,
      `DTSTART;TZID=Europe/Lisbon:${anchorDate(recurrence)}T${time}`,
      `RRULE:FREQ=MONTHLY;BYDAY=${recurrence.ordinal}${recurrence.weekday}`,
      "DURATION:PT1H",
      `SUMMARY:${escapeText(`${locale === "pt" ? "Massa Crítica" : "Critical Mass"} — ${city}`)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `LOCATION:${escapeText(locationWithoutTime(exactLocation))}`,
      `URL:${link}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`;
}
