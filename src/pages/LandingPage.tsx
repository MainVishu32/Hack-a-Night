import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, MapPin, Search, Sparkles, Ticket, Music2, Laugh, Trophy, Theater, PartyPopper } from 'lucide-react';
import { api } from '../services/api.ts';
import type { EventItem } from '../types/index.ts';

interface LandingPageProps {
  onNavigate: (page: string, params?: any) => void;
}

const categories = [
  { name: 'Music', icon: Music2 },
  { name: 'Comedy', icon: Laugh },
  { name: 'Festivals', icon: PartyPopper },
  { name: 'Sports', icon: Trophy },
  { name: 'Theatre', icon: Theater },
];

const eventImage = (event: EventItem) => {
  const text = `${event.title} ${event.description}`.toLowerCase();
  if (/music|concert|band|dj/.test(text)) return 'photo-1501386761578-eac5c94b800a';
  if (/sport|football|basketball|tennis/.test(text)) return 'photo-1461896836934-ffe607ba8211';
  if (/theatre|theater|stage|comedy/.test(text)) return 'photo-1507676184212-d03ab07a01bf';
  return 'photo-1540575467063-178a50c2df87';
};

const eventCategory = (event: EventItem) => {
  const text = `${event.title} ${event.description}`.toLowerCase();
  if (/music|concert|band|dj/.test(text)) return 'Music';
  if (/comedy|comic|stand.?up/.test(text)) return 'Comedy';
  if (/festival|fair/.test(text)) return 'Festivals';
  if (/sport|football|basketball|tennis/.test(text)) return 'Sports';
  if (/theatre|theater|play|musical/.test(text)) return 'Theatre';
  return 'Live experiences';
};

const formatDate = (date: string) => new Date(date).toLocaleDateString([], {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    api.getEvents()
      .then(result => {
        if (active) setEvents(result.events.filter(event => event.status === 'ACTIVE'));
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load events.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const browse = (category?: string) => {
    onNavigate('events', { query, category: category || 'All' });
  };

  return (
    <div className="flash-page">
      <section className="flash-hero">
        <div className="flash-shell flash-hero-grid">
          <div className="flash-hero-copy">
            <span className="flash-eyebrow"><Sparkles size={15} /> GOOD TIMES, RIGHT THIS WAY</span>
            <h1>Your next great experience <span>starts here.</span></h1>
            <p>Find the little plans and big nights you’ll be talking about long after.</p>
            <form className="flash-search" onSubmit={event => { event.preventDefault(); browse(); }}>
              <Search size={19} aria-hidden="true" />
              <input
                aria-label="Search events, venues, or locations"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Events, venues, or locations"
              />
              <button type="submit">Find events</button>
            </form>
            <div className="flash-hero-note"><span className="flash-live-dot" /> Real events. Live availability. Easy booking.</div>
          </div>
          <div className="flash-hero-photo" role="img" aria-label="Friends enjoying a live event">
            <div className="flash-photo-note">
              <span className="flash-note-icon"><Ticket size={19} /></span>
              <span><strong>Make a night of it</strong><small>Your next favorite memory is out there</small></span>
            </div>
          </div>
        </div>
      </section>

      <section className="flash-shell flash-category-section" aria-labelledby="category-heading">
        <div className="flash-section-heading">
          <div><span className="flash-kicker">A LITTLE BIT OF EVERYTHING</span><h2 id="category-heading">What are you in the mood for?</h2></div>
        </div>
        <div className="flash-categories">
          {categories.map(({ name, icon: Icon }) => (
            <button key={name} className="flash-category" onClick={() => browse(name)}>
              <span><Icon size={20} /></span>{name}<ArrowRight size={15} className="flash-category-arrow" />
            </button>
          ))}
        </div>
      </section>

      <section className="flash-shell flash-events-section" aria-labelledby="events-heading">
        <div className="flash-section-heading">
          <div><span className="flash-kicker">GOOD THINGS COMING UP</span><h2 id="events-heading">Upcoming experiences</h2><p>Real listings from the event calendar, with availability checked when you book.</p></div>
          <button className="flash-text-link" onClick={() => browse()}>See all events <ArrowRight size={17} /></button>
        </div>

        {loading && <div className="flash-state"><span className="flash-spinner" />Finding your next night out…</div>}
        {!loading && error && <div className="flash-state flash-state-error" role="alert">We couldn’t load events just now. {error}<button onClick={() => window.location.reload()}>Try again</button></div>}
        {!loading && !error && events.length === 0 && (
          <div className="flash-state flash-empty"><Ticket size={26} /><strong>New events are on the way</strong><span>Check back soon for something worth going out for.</span></div>
        )}
        {!loading && !error && events.length > 0 && (
          <div className="flash-event-grid">
            {events.slice(0, 3).map(event => (
              <article className="flash-event-card" key={event.id}>
                <div className="flash-event-image">
                  <img src={`https://images.unsplash.com/${eventImage(event)}?auto=format&fit=crop&w=900&q=85`} alt="" />
                  <span className="flash-image-tag">{eventCategory(event)}</span>
                </div>
                <div className="flash-event-content">
                  <h3>{event.title}</h3>
                  <div className="flash-event-meta"><CalendarDays size={15} /><span>{formatDate(event.starts_at)}</span></div>
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
        <p className="flash-demo-note"><span>Demo inventory</span> Event listings and seat availability are loaded from this app’s live demo backend. Payment confirmation is simulated.</p>
      </section>

      <section className="flash-bottom-banner">
        <div className="flash-shell flash-bottom-inner">
          <div><span className="flash-kicker">THE GOOD STUFF DOESN’T WAIT</span><h2>Find a plan. Grab your people. Go.</h2></div>
          <button onClick={() => browse()}>Explore all events <ArrowRight size={17} /></button>
        </div>
      </section>
    </div>
  );
};
