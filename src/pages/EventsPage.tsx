import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, MapPin, Music2, Search, Ticket, RefreshCw, Laugh, Trophy, Theater, PartyPopper } from 'lucide-react';
import { api } from '../services/api.ts';
import type { EventItem } from '../types/index.ts';

interface EventsPageProps {
  onNavigate: (page: string, params?: any) => void;
  initialQuery?: string;
  initialCategory?: string;
}

const categories = [
  { name: 'All', icon: Ticket },
  { name: 'Music', icon: Music2 },
  { name: 'Comedy', icon: Laugh },
  { name: 'Festivals', icon: PartyPopper },
  { name: 'Sports', icon: Trophy },
  { name: 'Theatre', icon: Theater },
];

const getCategory = (event: EventItem) => {
  const text = `${event.title} ${event.description}`.toLowerCase();
  if (/music|concert|band|dj/.test(text)) return 'Music';
  if (/comedy|comic|stand.?up/.test(text)) return 'Comedy';
  if (/festival|fair/.test(text)) return 'Festivals';
  if (/sport|football|basketball|tennis/.test(text)) return 'Sports';
  if (/theatre|theater|play|musical/.test(text)) return 'Theatre';
  return 'Live experiences';
};

const getImage = (event: EventItem) => {
  const text = `${event.title} ${event.description}`.toLowerCase();
  if (/music|concert|band|dj/.test(text)) return 'photo-1501386761578-eac5c94b800a';
  if (/sport|football|basketball|tennis/.test(text)) return 'photo-1461896836934-ffe607ba8211';
  if (/theatre|theater|stage|comedy/.test(text)) return 'photo-1507676184212-d03ab07a01bf';
  return 'photo-1540575467063-178a50c2df87';
};

export const EventsPage: React.FC<EventsPageProps> = ({ onNavigate, initialQuery = '', initialCategory = 'All' }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);

  useEffect(() => {
    setQuery(initialQuery);
    setCategory(initialCategory);
  }, [initialQuery, initialCategory]);

  useEffect(() => {
    let active = true;
    api.getEvents()
      .then(result => { if (active) setEvents(result.events.filter(event => event.status === 'ACTIVE')); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load events.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredEvents = useMemo(() => events.filter(event => {
    const matchesQuery = `${event.title} ${event.venue} ${event.description}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = category === 'All' || getCategory(event) === category;
    return matchesQuery && matchesCategory;
  }), [events, query, category]);

  return (
    <div className="flash-page">
      <section className="flash-shell flash-browse">
        <div className="flash-browse-heading">
          <span className="flash-kicker">MAKE ROOM FOR A GOOD TIME</span>
          <h1>Find your next thing</h1>
          <p>Live events, good company, and nights worth remembering.</p>
          <label className="flash-browse-search">
            <Search size={19} aria-hidden="true" />
            <input
              aria-label="Search events, venues, or locations"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Try an event, venue, or location"
            />
          </label>
        </div>

        <div className="flash-filter-row" aria-label="Filter events by category">
          {categories.map(({ name, icon: Icon }) => (
            <button key={name} className={`flash-filter-chip${category === name ? ' is-selected' : ''}`} onClick={() => setCategory(name)}>
              <Icon size={16} />{name}
            </button>
          ))}
        </div>

        <div className="flash-results-heading">
          <div><h2>{category === 'All' ? 'Upcoming events' : `${category} events`}</h2><p>{loading ? 'Finding events…' : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'event' : 'events'} to explore`}</p></div>
          <span className="flash-live-label"><span className="flash-live-dot" /> Live availability</span>
        </div>

        {loading && <div className="flash-state"><span className="flash-spinner" />Finding your next night out…</div>}
        {!loading && error && <div className="flash-state flash-state-error" role="alert">We couldn’t load events just now. {error}<button onClick={() => window.location.reload()}>Try again</button></div>}
        {!loading && !error && filteredEvents.length === 0 && (
          <div className="flash-state flash-empty"><Ticket size={27} /><strong>No events found just yet</strong><span>Try another search or category. New experiences are added all the time.</span>{(query || category !== 'All') && <button onClick={() => { setQuery(''); setCategory('All'); }}>Show all events</button>}</div>
        )}

        {!loading && !error && filteredEvents.length > 0 && (
          <div className="flash-event-grid flash-browse-grid">
            {filteredEvents.map(event => (
              <article className="flash-event-card" key={event.id}>
                <div className="flash-event-image">
                  <img src={`https://images.unsplash.com/${getImage(event)}?auto=format&fit=crop&w=900&q=85`} alt="" />
                  <span className="flash-image-tag">{getCategory(event)}</span>
                </div>
                <div className="flash-event-content">
                  <h3>{event.title}</h3>
                  <div className="flash-event-meta"><CalendarDays size={15} /><span>{new Date(event.starts_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
                  <div className="flash-event-meta"><MapPin size={15} /><span>{event.venue}</span></div>
                  <div className="flash-card-bottom">
                    <div><small>Tickets from</small><strong>${event.base_price.toFixed(2)}</strong></div>
                    <button onClick={() => onNavigate('seats', { eventId: event.id })}>Book tickets <ArrowRight size={15} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="flash-demo-note"><span>Demo inventory</span> Prices and event listings come from the app’s demo backend. Seat availability is checked live when you choose tickets.</p>
      </section>
    </div>
  );
};
