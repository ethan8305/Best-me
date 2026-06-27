import { Block } from "../../types";

/** A fixed event the scheduler must plan around, in minutes from midnight. */
export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  calendarId?: string;
}

/**
 * Abstraction over a calendar backend. The MVP ships a device implementation
 * (expo-calendar) that already aggregates the Google/Outlook/Apple accounts the
 * user added to their phone — covering all three providers with one integration.
 * Phase 2 adds direct Microsoft Graph / Google Calendar implementations behind
 * this same interface for server-side re-planning.
 */
export interface CalendarProvider {
  /** Ask the OS for calendar read/write permission. */
  requestPermission(): Promise<boolean>;
  /** Existing events for an ISO day, as fixed blocks to plan around. */
  getEventsForDay(date: string): Promise<CalendarEvent[]>;
  /** Write a planned block to the calendar; returns the created event id. */
  writeBlock(date: string, block: Block): Promise<string | undefined>;
  /** Remove a previously written block by its calendar event id. */
  removeEvent(calendarEventId: string): Promise<void>;
}
