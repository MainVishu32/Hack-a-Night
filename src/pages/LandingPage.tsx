import React from 'react';
import { ArrowRight, CalendarDays, MapPin, Ticket, ShieldCheck, Clock3, Music2, Cpu, Sparkles } from 'lucide-react';

interface LandingPageProps { onNavigate: (page: string) => void; }

const demoShows = [
  { tag: 'TECH & INNOVATION', title: 'Global Tech Summit 2026', venue: 'Metropolis Convention Arena', date: 'Featured event', price: 'From $140', icon: Cpu, color: 'from-cyan-500/25 to-blue-500/5' },
  { tag: 'LIVE MUSIC', title: 'Neon Nights Live', venue: 'Riverside Open-Air Stage', date: 'Demo listing', price: 'From $65', icon: Music2, color: 'from-fuchsia-500/20 to-violet-500/5' },
  { tag: 'CREATIVE & CULTURE', title: 'Design Futures Expo', venue: 'The Foundry Exhibition Hall', date: 'Demo listing', price: 'From $35', icon: Sparkles, color: 'from-amber-500/20 to-orange-500/5' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => (
  <div className="min-h-screen overflow-hidden bg-[#080E19] text-slate-100">
    <section className="relative border-b border-white/10">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 20%, rgba(45,212,191,.14), transparent 42%), radial-gradient(ellipse at 15% 80%, rgba(96,165,250,.09), transparent 35%)' }} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/[0.07] px-3 py-1.5 text-xs font-medium text-teal-200"><Ticket className="h-3.5 w-3.5"/> YOUR SEAT. YOUR MOMENT.</div>
          <h1 className="text-5xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-7xl"><span className="block text-white">Pulse</span><span className="block bg-gradient-to-r from-teal-200 via-cyan-300 to-blue-400 bg-clip-text pb-2 text-transparent">Reserve.</span></h1>
          <p className="mt-6 max-w-xl text-xl font-medium leading-8 text-slate-200">Your next experience starts here.</p>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">Discover shows, choose your seat, and book with confidence. Every seat claim is checked against live availability.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => onNavigate('events')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-300 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-950/30 transition hover:-translate-y-0.5 hover:bg-teal-200">Explore Shows <ArrowRight className="h-4 w-4"/></button>
            <button onClick={() => onNavigate('register')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition hover:border-teal-200/40">Create an account</button>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-teal-300"/> Conflict-aware reservations</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-teal-300"/> Temporary seat holds</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-5 rounded-[2rem] bg-teal-400/10 blur-3xl"/>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0E1726] shadow-2xl shadow-black/40">
            <div className="relative flex h-48 items-end bg-[radial-gradient(ellipse_at_70%_20%,rgba(45,212,191,.35),transparent_40%),linear-gradient(135deg,#17334A,#111827_70%)] p-6 sm:h-56">
              <div className="absolute right-6 top-6 rounded-2xl border border-white/10 bg-black/20 p-3 text-teal-200"><CalendarDays className="h-6 w-6"/></div>
              <div><span className="rounded-full bg-teal-300 px-3 py-1 text-[10px] font-bold tracking-wider text-slate-950">FEATURED SHOW</span><h2 className="mt-3 text-2xl font-bold">Global Tech Summit</h2><p className="mt-1 text-sm text-slate-300">Technology · Talks · Networking</p></div>
            </div>
            <div className="p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold">Grand Hall A</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5"/> Metropolis Convention Arena</p></div><div className="text-right"><p className="text-xs text-slate-400">Tickets from</p><p className="text-xl font-bold text-teal-200">$140</p></div></div>
              <div className="mt-5 rounded-xl border border-white/10 bg-[#080E19] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold">Seat availability preview</span><span className="text-[10px] text-teal-200">Live inventory in booking flow</span></div><div className="mb-3 rounded-md border border-blue-300/20 bg-blue-300/[0.05] py-1.5 text-center text-[9px] font-bold uppercase tracking-[.35em] text-blue-200">Stage</div><div className="grid grid-cols-10 gap-1.5">{Array.from({length:50},(_,i)=><span key={i} className={`aspect-square rounded-[4px] border ${[2,8,11,22,31,43].includes(i)?'border-slate-600 bg-slate-700/80':[14,15,24,25].includes(i)?'border-amber-300/40 bg-amber-300/25':'border-teal-200/25 bg-teal-300/15'}`}/>)}</div><div className="mt-3 flex gap-4 text-[10px] text-slate-400"><span>● Available</span><span className="text-amber-200">● Held</span><span>● Booked</span></div></div>
              <button onClick={() => onNavigate('events')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-200">Choose your seat <ArrowRight className="h-4 w-4"/></button>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-200">Find your next experience</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Shows worth showing up for</h2><p className="mt-2 text-sm text-slate-400">Explore sample listings, then choose a seat from the live demo inventory.</p></div><button onClick={() => onNavigate('events')} className="inline-flex items-center gap-2 self-start text-sm font-semibold text-teal-200 hover:text-teal-100">View all shows <ArrowRight className="h-4 w-4"/></button></div>
      <div className="mt-7 grid gap-5 md:grid-cols-3">{demoShows.map(show=>{const Icon=show.icon;return <article key={show.title} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E1726] transition hover:-translate-y-1 hover:border-teal-200/30"><div className={`flex h-32 items-end bg-gradient-to-br ${show.color} p-5`}><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/20"><Icon className="h-5 w-5 text-teal-200"/></div></div><div className="p-5"><p className="text-[10px] font-bold tracking-[.16em] text-teal-200">{show.tag}</p><h3 className="mt-2 text-lg font-bold">{show.title}</h3><p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5"/>{show.venue}</p><div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"><div><p className="text-xs text-slate-500">{show.date}</p><p className="mt-1 text-sm font-bold">{show.price}</p></div><button onClick={() => onNavigate('events')} className="rounded-lg border border-teal-200/25 px-3 py-2 text-xs font-semibold text-teal-200 hover:bg-teal-200/10">View event</button></div></div></article>})}</div>
      <p className="mt-4 text-xs text-slate-500">The featured event is connected to the demo seat inventory. Other cards are illustrative listings for the landing page and will route to the active event list.</p>
    </section>
    <footer className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© PulseReserve · Demo reservation experience</span><button onClick={() => onNavigate('login')} className="self-start text-slate-500 transition hover:text-teal-200 sm:self-auto">Admin access</button></div></footer>
  </div>
);
