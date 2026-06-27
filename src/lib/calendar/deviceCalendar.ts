import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

import { Block } from "../../types";
import { dateFromMinutes, minutesFromMidnight } from "../time";
import { CalendarEvent, CalendarProvider } from "./types";

/**
 * Device-calendar provider. On iOS/Android the OS calendar already merges the
 * user's Google/Outlook/Apple accounts, so reading device calendars plans
 * around all three, and writing back surfaces blocks in whichever calendar app
 * the user uses. Best me writes to a dedicated "Best me" calendar so its blocks
 * stay separable from real events.
 */
const BEST_ME_CALENDAR_TITLE = "Best me";

async function ensureBestMeCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === BEST_ME_CALENDAR_TITLE);
  if (existing) return existing.id;

  const defaultSource =
    Platform.OS === "ios"
      ? await Calendar.getDefaultCalendarAsync().then((c) => c.source)
      : { isLocalAccount: true, name: BEST_ME_CALENDAR_TITLE, type: Calendar.SourceType.LOCAL };

  return Calendar.createCalendarAsync({
    title: BEST_ME_CALENDAR_TITLE,
    color: "#FF7A45",
    entityType: Calendar.EntityTypes.EVENT,
    source: defaultSource as Calendar.Source,
    name: BEST_ME_CALENDAR_TITLE,
    ownerAccount: BEST_ME_CALENDAR_TITLE,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

export const deviceCalendarProvider: CalendarProvider = {
  async requestPermission() {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === "granted";
  },

  async getEventsForDay(date) {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const ids = calendars.map((c) => c.id);
    if (ids.length === 0) return [];

    const start = dateFromMinutes(date, 0);
    const end = dateFromMinutes(date, 24 * 60);
    const events = await Calendar.getEventsAsync(ids, start, end);

    return events
      .filter((e) => !e.allDay && e.calendarId)
      .map<CalendarEvent>((e) => ({
        id: e.id,
        title: e.title ?? "Busy",
        start: minutesFromMidnight(new Date(e.startDate as string)),
        end: minutesFromMidnight(new Date(e.endDate as string)),
        calendarId: e.calendarId,
      }));
  },

  async writeBlock(date, block: Block) {
    const calendarId = await ensureBestMeCalendar();
    return Calendar.createEventAsync(calendarId, {
      title: block.title,
      startDate: dateFromMinutes(date, block.start),
      endDate: dateFromMinutes(date, block.end),
      notes: `Best me · ${block.category}`,
    });
  },

  async removeEvent(calendarEventId) {
    await Calendar.deleteEventAsync(calendarEventId);
  },
};
