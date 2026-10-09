import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, MapPin, Ticket, RefreshCw, Search } from 'lucide-react';
import { api } from '../services/api.ts';
import type { EventItem } from '../types/index.ts';

interface EventsPageProps { onNavigate: (page: string, params?: any) => void; }

export const EventsPage: React.FC<EventsPageProps> = ({ onNavigate }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    api.getEvents()
      .then(result => { if (active) setEvents(result.events.filter(event => event.status === 'ACTIVE')); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load events.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredEvents = events.filter(event =>
    `${event.title} ${event.venue} ${event.description}`.toLowerCase().includes(query.toLowerCase())
  );

  return <div className="min-h-screen bg-[#080E19] text-slate-100">
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-teal-200">Find your next experience</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Upcoming shows & events</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Browse listed events, check live seat availability, and reserve your place before it sells out.</p>
        </div>
        <label className="relative block w-full md:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search events or venues" className="w-full rounded-xl border border-white/10 bg-[#0E1726] py-3 pl-10 pr-4 text-sm outline-none focus:border-teal-200/50" />
        </label>
      </div>
      {loading && <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-400"><RefreshCw className="h-5 w-5 animate-spin text-teal-200" />Loading listed events…</div>}
      {!loading && error && <div className="mt-8 rounded-xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-200">Unable to load events: {error}</div>}
      {!loading && !error && filteredEvents.length === 0 && <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.025] p-12 text-center"><Ticket className="mx-auto h-10 w-10 text-slate-500" /><h2 className="mt-4 text-lg font-semibold">No active events found</h2><p className="mt-2 text-sm text-slate-400">Try another search or check back when new shows are listed.</p></div>}
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.map(event => <article key={event.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E1726] transition hover:-translate-y-1 hover:border-teal-200/30">
          <div className="flex h-36 items-end bg-[radial-gradient(ellipse_at_top_right,rgba(45,212,191,.25),transparent_55%),linear-gradient(135deg,#13283A,#101827)] p-5"><span className="rounded-full border border-teal-200/20 bg-teal-200/10 px-3 py-1 text-xs font-semibold text-teal-100">Now booking</span></div>
          <div className="p-5"><h2 className="text-xl font-semibold">{event.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{event.description}</p>
            <div className="mt-5 space-y-3 text-sm text-slate-300"><div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" /><span>{event.venue}</span></div><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-teal-200" /><span>{new Date(event.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div></div>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"><div><p className="text-xs text-slate-500">Tickets from</p><p className="text-lg font-bold text-teal-200">${event.base_price.toFixed(2)}</p></div><button onClick={() => onNavigate('seats', { eventId: event.id })} className="inline-flex items-center gap-2 rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-200">View seats <ArrowRight className="h-4 w-4" /></button></div>
          </div>
        </article>)}
      </div>
    </section>
  </div>;
};
