'use client';

import { useCallback, useEffect, useState } from 'react';
import { toGoogleCalendarUrl, toIcs } from '../../lib/calendar-ics';
import { getDateInTimeZone } from '../../lib/site-date';
import { useDialogFocus } from '../../lib/use-dialog-focus';

type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  description: string;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstDay }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  return cells;
}

function downloadIcs(event: CalendarEvent) {
  const blob = new Blob([toIcs(event)], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${event.title.replace(/\s+/g, '-')}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CalendarPage() {
  const today = getDateInTimeZone(new Date());
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  const [year, setYear] = useState(todayYear);
  const [month, setMonth] = useState(todayMonth - 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [rsvpState, setRsvpState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const eventDialogRef = useDialogFocus(selectedEvent !== null, () => setSelectedEvent(null));

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/events?limit=100', { credentials: 'include' });
      if (!response.ok) {
        setLoadError('The calendar could not be loaded. Try again in a moment.');
        return;
      }
      const data = await response.json() as { events?: CalendarEvent[] };
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      setLoadError('The calendar could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  const prevMonth = () => {
    if (month === 0) { setYear((value) => value - 1); setMonth(11); }
    else setMonth((value) => value - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((value) => value + 1); setMonth(0); }
    else setMonth((value) => value + 1);
  };

  const cells = buildCalendarGrid(year, month);

  const eventsThisMonth = events.filter((event) => {
    const [eventYear, eventMonth] = event.date.split('-').map(Number);
    return eventYear === year && eventMonth - 1 === month;
  });

  const eventsByDay: Record<number, CalendarEvent[]> = {};
  for (const event of eventsThisMonth) {
    const day = Number(event.date.split('-')[2]);
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(event);
  }

  const upcoming = events
    .filter((event) => event.date >= today)
    .slice(0, 6);

  const openEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setRsvpState('idle');
  };

  const handleRsvp = async () => {
    if (!selectedEvent) return;
    setRsvpState('sending');
    try {
      const response = await fetch(`/api/events/${selectedEvent.id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'attending' }),
      });
      setRsvpState(response.ok ? 'done' : 'error');
    } catch {
      setRsvpState('error');
    }
  };

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="calendar-title">
        <div className="hero-overlay">
          <p className="eyebrow">Community calendar</p>
          <h1 id="calendar-title">Meetings, workshops, rallies, and volunteer shifts.</h1>
          <p>Select a date to see details, RSVP, or add the event to your own calendar.</p>
        </div>
      </section>

      <section className="featured">
        {loading && <p>Loading events…</p>}
        {loadError && (
          <div className="notice notice--error" role="alert">
            <p>{loadError}</p>
            <button type="button" className="btn btn-secondary" onClick={() => void fetchEvents()}>
              Try again
            </button>
          </div>
        )}

        {!loadError && (
          <>
            <div className="cal-nav" role="group" aria-label="Calendar month navigation">
              <button type="button" onClick={prevMonth} aria-label="Previous month">‹</button>
              <h2>{MONTHS[month]} {year}</h2>
              <button type="button" onClick={nextMonth} aria-label="Next month">›</button>
            </div>

            <div className="cal-grid" aria-label={`${MONTHS[month]} ${year} calendar`}>
              {DAYS.map((day) => (
                <div key={day} className="cal-day-label">{day}</div>
              ))}
              {cells.map((day, index) => {
                if (day === null) return <div key={`empty-${index}`} className="cal-cell cal-cell--empty" aria-hidden="true" />;
                const isToday = day === todayDay && month === todayMonth - 1 && year === todayYear;
                const dayEvents = eventsByDay[day] ?? [];
                return (
                  <div
                    key={day}
                    className={`cal-cell ${isToday ? 'cal-cell--today' : ''} ${dayEvents.length > 0 ? 'cal-cell--has-event' : ''}`}
                    aria-label={`${MONTHS[month]} ${day}${dayEvents.length > 0 ? `, ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : ''}`}
                  >
                    <span className="cal-date">{day}</span>
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className="cal-event-pill"
                        onClick={() => openEvent(event)}
                      >
                        {event.title}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>

            <h2 className="calendar-subheading">Upcoming events</h2>
            {upcoming.length === 0 ? (
              <p>No upcoming events are posted yet. Organizers can add events from the admin dashboard.</p>
            ) : (
              <div className="events">
                {upcoming.map((event) => (
                  <article key={event.id}>
                    <p className="eyebrow">{event.date}</p>
                    <h3>
                      <button type="button" className="event-title-btn" onClick={() => openEvent(event)}>
                        {event.title}
                      </button>
                    </h3>
                    <p>{event.time}{event.location ? ` • ${event.location}` : ''}</p>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {selectedEvent && (
        <div
          className="modal-backdrop"
          ref={eventDialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={selectedEvent.title}
          onClick={(event) => { if (event.target === event.currentTarget) setSelectedEvent(null); }}
        >
          <div className="modal-card">
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close event details"
            >
              ×
            </button>
            <p className="eyebrow">{selectedEvent.date}</p>
            <h2>{selectedEvent.title}</h2>
            {selectedEvent.time && <p><strong>Time:</strong> {selectedEvent.time}</p>}
            {selectedEvent.location && <p><strong>Location:</strong> {selectedEvent.location}</p>}
            {selectedEvent.description && <p>{selectedEvent.description}</p>}
            <p className="helper">Calendar exports use all-day dates in America/Denver.</p>

            <div className="btn-row btn-row--start">
              <button
                type="button"
                className="btn"
                onClick={() => void handleRsvp()}
                disabled={rsvpState === 'sending' || rsvpState === 'done'}
                aria-busy={rsvpState === 'sending'}
              >
                {rsvpState === 'sending' ? 'Saving…' : rsvpState === 'done' ? "You're attending" : 'RSVP'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => downloadIcs(selectedEvent)}>
                Add to Calendar (.ics)
              </button>
              <a
                className="btn btn-secondary"
                href={toGoogleCalendarUrl(selectedEvent)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Calendar
              </a>
            </div>
            {rsvpState === 'error' && (
              <p className="notice notice--error" role="alert">
                Your RSVP could not be saved. Try again in a moment.
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
