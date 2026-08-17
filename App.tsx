import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  BatteryCharging,
  BatteryMedium,
  Check,
  ChevronDown,
  CircleCheck,
  ExternalLink,
  Gauge,
  LocateFixed,
  MapPin,
  Menu,
  Navigation,
  PlugZap,
  Recycle,
  Route,
  ShieldCheck,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route as WouterRoute, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Station = {
  name: string;
  area: string;
  available: number;
  total: number;
  wait: string;
  reliability: string;
  connectors: string[];
};

const stations: Station[] = [
  { name: 'Moorfield Services', area: 'North ring · 0.8 mi', available: 5, total: 8, wait: 'No wait', reliability: '98%', connectors: ['CCS2', 'CHAdeMO'] },
  { name: 'Cedar Park & Ride', area: 'West route · 1.4 mi', available: 2, total: 6, wait: '8 min', reliability: '94%', connectors: ['CCS2', 'Type 2'] },
  { name: 'Riverside Exchange', area: 'City edge · 2.1 mi', available: 0, total: 10, wait: '22 min', reliability: '89%', connectors: ['CCS2'] },
  { name: 'Mile End Market', area: 'South route · 2.7 mi', available: 3, total: 4, wait: 'No wait', reliability: '96%', connectors: ['CCS2', 'Type 2'] },
];

const cars = [
  { name: 'Nissan Leaf Tekna', meta: '2020 · 38,240 mi · Automatic', price: '$16,480', soh: '91%', range: '168 mi', type: 'City' },
  { name: 'Hyundai Kona Electric', meta: '2021 · 29,110 mi · Automatic', price: '$21,750', soh: '94%', range: '258 mi', type: 'Long range' },
  { name: 'Kia e-Niro 4+', meta: '2020 · 46,880 mi · Automatic', price: '$19,620', soh: '89%', range: '239 mi', type: 'Long range' },
];

function AnchorLink({ href, children, className, testId }: { href: string; children: ReactNode; className?: string; testId: string }) {
  return <a href={href} className={className} data-testid={testId}>{children}</a>;
}

function Brand() {
  return (
    <AnchorLink href="#top" className="flex items-center gap-3 no-underline" testId="link-brand">
      <span className="brand-mark" aria-hidden="true"><Zap size={18} strokeWidth={2.5} /></span>
      <span className="display text-[1.08rem] font-bold tracking-[-.045em] text-[#edf1e8]">electrify<span className="text-[#f6ca4e]">.</span></span>
    </AnchorLink>
  );
}

function NavigationBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="topbar relative z-30">
      <nav className="container-wide flex h-[74px] items-center justify-between" aria-label="Primary navigation">
        <Brand />
        <div className="nav-links hidden items-center gap-8 md:flex">
          <AnchorLink href="#modules" className="nav-link no-underline" testId="link-nav-modules">The platform</AnchorLink>
          <AnchorLink href="#preview" className="nav-link no-underline" testId="link-nav-preview">Product preview</AnchorLink>
          <AnchorLink href="#proof" className="nav-link no-underline" testId="link-nav-proof">Our approach</AnchorLink>
          <AnchorLink href="#marketplace" className="nav-link no-underline" testId="link-nav-marketplace">Marketplace</AnchorLink>
        </div>
        <div className="hidden md:block">
          <AnchorLink href="#start" className="btn-primary" testId="link-nav-start">Explore the journey <ArrowRight size={15} /></AnchorLink>
        </div>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full border border-[#54716f] text-[#edf1e8] md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          data-testid="button-mobile-menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      {menuOpen && (
        <div className="menu-panel md:hidden">
          <AnchorLink href="#modules" className="no-underline" testId="link-mobile-modules">The platform</AnchorLink>
          <AnchorLink href="#preview" className="no-underline" testId="link-mobile-preview">Product preview</AnchorLink>
          <AnchorLink href="#proof" className="no-underline" testId="link-mobile-proof">Our approach</AnchorLink>
          <AnchorLink href="#marketplace" className="no-underline" testId="link-mobile-marketplace">Marketplace</AnchorLink>
          <AnchorLink href="#start" className="mt-2 btn-primary w-full" testId="link-mobile-start">Explore the journey <ArrowRight size={15} /></AnchorLink>
          <button type="button" className="sr-only" onClick={closeMenu} data-testid="button-close-mobile-menu">Close menu</button>
        </div>
      )}
    </header>
  );
}

function HeroMap() {
  const [selected, setSelected] = useState(0);
  const station = stations[selected];
  return (
    <div className="hero-demo reveal reveal-2">
      <div className="map-window" aria-label="Map preview showing available charging stations">
        <div className="map-toolbar">
          <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
          <span className="mono text-[.62rem] text-[#59716e]">LIVE ROUTE PREVIEW</span>
          <LocateFixed size={14} className="text-[#4eae75]" />
        </div>
        <div className="map-canvas">
          <div className="map-road" /><div className="map-road two" /><div className="map-road three" />
          <button type="button" className={`map-pin p1 ${selected === 0 ? 'selected' : ''}`} onClick={() => setSelected(0)} aria-label="Select Moorfield Services" data-testid="button-hero-station-moorfield"><MapPin size={14} /></button>
          <button type="button" className={`map-pin p2 ${selected === 1 ? 'selected' : ''}`} onClick={() => setSelected(1)} aria-label="Select Cedar Park and Ride" data-testid="button-hero-station-cedar"><MapPin size={14} /></button>
          <button type="button" className={`map-pin p3 ${selected === 2 ? 'selected' : ''}`} onClick={() => setSelected(2)} aria-label="Select Riverside Exchange" data-testid="button-hero-station-riverside"><MapPin size={14} /></button>
          <button type="button" className={`map-pin p4 ${selected === 3 ? 'selected' : ''}`} onClick={() => setSelected(3)} aria-label="Select Mile End Market" data-testid="button-hero-station-mile-end"><MapPin size={14} /></button>
          <div className="map-label">
            <div><strong data-testid="text-hero-station">{station.name}</strong><small>{station.available} of {station.total} connectors available</small></div>
            <span className="live-pill"><i className="pulse-dot" /> LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <>
      <section className="hero noise" id="top">
        <div className="hero-grid" aria-hidden="true" /><div className="hero-orb" aria-hidden="true" />
        <div className="container-wide">
          <div className="hero-copy">
            <p className="eyebrow reveal text-[#8bcf83]">A clearer route to electric</p>
            <h1 className="display reveal reveal-1">Move forward. <em>Know more.</em></h1>
            <p className="hero-lede reveal reveal-2">Electrify Mobility brings the decisions that matter into one trusted journey — from your next charge to your next car.</p>
            <div className="hero-actions reveal reveal-3">
              <AnchorLink href="#preview" className="btn-primary" testId="link-hero-preview">See the platform preview <ArrowRight size={16} /></AnchorLink>
              <AnchorLink href="#modules" className="btn-ghost" testId="link-hero-platform">How it fits together <ChevronDown size={16} /></AnchorLink>
            </div>
            <div className="trust-line reveal reveal-3" aria-label="Platform foundations">
              <span><CircleCheck size={14} /> Verified by data</span>
              <span><Route size={14} /> Built for real roads</span>
            </div>
          </div>
          <HeroMap />
        </div>
      </section>
      <section className="stats-band" aria-label="Electrify Mobility platform scale">
        <div className="container-wide stats-grid">
          <div className="stat" data-testid="stat-charging-sites"><strong>242k+</strong><span>global charging sites in open datasets</span></div>
          <div className="stat" data-testid="stat-charging-piles"><strong>24k+</strong><span>charging piles mapped for preview</span></div>
          <div className="stat" data-testid="stat-signal-sources"><strong>OCPI + OCPP</strong><span>telemetry and compatibility signals</span></div>
          <div className="stat" data-testid="stat-battery-reports"><strong>1 clear route</strong><span>from old car to verified EV</span></div>
        </div>
      </section>
    </>
  );
}

function Intro() {
  return (
    <section className="intro section-pad" id="journey">
      <div className="container-wide">
        <p className="section-kicker eyebrow">The old way is fragmented</p>
        <h2 className="section-title">The switch to electric should feel like <span className="soft">one decision.</span></h2>
        <p className="intro-copy">Instead, most drivers juggle three tabs, five unknowns and a lot of second-guessing. Electrify turns that noise into a considered next step, with the evidence alongside it.</p>
      </div>
    </section>
  );
}

function ModuleVisual({ kind }: { kind: 'charge' | 'scrap' | 'ev' }) {
  if (kind === 'charge') {
    return <div className="mini-ui" aria-label="Charging availability example">
      <div className="mini-row"><span className="mini-dot" /><span>Moorfield Services</span><b>5 / 8 free</b></div>
      <div className="mini-row"><span className="mini-dot" /><span>Cedar Park & Ride</span><b>2 / 6 free</b></div>
      <div className="mini-row"><span className="mini-dot warn" /><span>Riverside Exchange</span><b>0 / 10 free</b></div>
    </div>;
  }
  if (kind === 'scrap') {
    return <div className="price-box" aria-label="Scrap valuation example"><div><span>Estimated handover value</span><strong className="block mt-1">$2,860</strong></div><TrendingUp size={19} className="text-[#8bcf83]" /></div>;
  }
  return <div className="health-box" aria-label="Battery state of health example"><div className="health-top"><span>Battery diagnostic</span><Check size={14} className="text-[#6b5b86]" /></div><div className="mt-1 flex items-end justify-between"><span className="health-score">91%</span><span className="mono text-[.6rem] text-[#6b5b86]">SOH VERIFIED</span></div><div className="health-meter mt-2"><span /></div></div>;
}

function Modules() {
  const moduleData: { index: string; kind: 'charge' | 'scrap' | 'ev'; icon: ReactNode; title: string; text: string; tag: string }[] = [
    { index: '01 / CHARGE', kind: 'charge', icon: <PlugZap size={28} />, title: 'Charge with certainty.', text: 'Find a compatible connector that is actually available — ranked by occupancy, live telemetry and reliability, not just a pin on a map.', tag: 'Live availability · connector fit · reliability' },
    { index: '02 / VALUE', kind: 'scrap', icon: <Recycle size={28} />, title: 'Know your old car’s value.', text: 'A transparent scrap estimate built from curb weight, metal spot prices and registered scrappage facilities near you.', tag: 'Algorithmic estimate · local handover' },
    { index: '03 / CHOOSE', kind: 'ev', icon: <BatteryCharging size={28} />, title: 'Buy the battery, not the badge.', text: 'Compare used EVs with diagnostic battery State-of-Health reports and fair residual price estimates in plain language.', tag: 'BMS report · residual value · confidence' },
  ];
  return (
    <section className="module-section section-pad" id="modules">
      <div className="container-wide">
        <div className="module-header">
          <div><p className="section-kicker eyebrow">One platform, three decisions</p><h2 className="section-title">Everything you need to <span className="soft">change lanes.</span></h2></div>
          <p>Not another dashboard to decipher. A calm, map-first guide for the moment you decide your next car should be electric.</p>
        </div>
        <div className="module-list">
          {moduleData.map((module, index) => (
            <article className={`module-card reveal reveal-${index + 1}`} key={module.index} data-testid={`card-module-${module.kind}`}>
              <div className="module-index">{module.index}</div>
              <div><div className="module-icon" aria-hidden="true">{module.icon}</div></div>
              <div><h3>{module.title}</h3><p>{module.text}</p><p className="mono mt-4 text-[.61rem] uppercase tracking-[.08em] text-[#4eae75]">{module.tag}</p></div>
              <div className="module-visual"><ModuleVisual kind={module.kind} /></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChargingDemo() {
  const [selected, setSelected] = useState(0);
  const station = stations[selected];
  return (
    <div className="demo-shell">
      <div className="demo-tabs" role="tablist" aria-label="Product preview modes">
        <button type="button" className="demo-tab active" role="tab" aria-selected="true" onClick={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })} data-testid="tab-preview-charge"><span className="mono block text-[.59rem] opacity-70">PREVIEW 01</span><span className="mt-1 block">Live charging map</span></button>
        <button type="button" className="demo-tab" role="tab" aria-selected="false" onClick={() => document.getElementById('estimator')?.scrollIntoView({ behavior: 'smooth' })} data-testid="tab-preview-value"><span className="mono block text-[.59rem] opacity-70">PREVIEW 02</span><span className="mt-1 block">Scrap value signal</span></button>
        <button type="button" className="demo-tab" role="tab" aria-selected="false" onClick={() => document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' })} data-testid="tab-preview-market"><span className="mono block text-[.59rem] opacity-70">PREVIEW 03</span><span className="mt-1 block">Battery-first cars</span></button>
      </div>
      <div className="demo-panel">
        <div className="demo-panel-map">
          <div className="map-note"><i className="pulse-dot" /> telemetry snapshot · 09:42</div>
          <button type="button" className={`big-pin one ${selected === 0 ? 'selected' : ''}`} onClick={() => setSelected(0)} aria-label="View Moorfield Services" data-testid="button-map-station-0"><MapPin size={17} /></button>
          <button type="button" className={`big-pin two ${selected === 1 ? 'selected' : ''}`} onClick={() => setSelected(1)} aria-label="View Cedar Park and Ride" data-testid="button-map-station-1"><MapPin size={17} /></button>
          <button type="button" className={`big-pin three ${selected === 2 ? 'selected' : ''}`} onClick={() => setSelected(2)} aria-label="View Riverside Exchange" data-testid="button-map-station-2"><MapPin size={17} /></button>
          <button type="button" className={`big-pin four ${selected === 3 ? 'selected' : ''}`} onClick={() => setSelected(3)} aria-label="View Mile End Market" data-testid="button-map-station-3"><MapPin size={17} /></button>
        </div>
        <aside className="demo-side" aria-live="polite">
          <p className="eyebrow text-[#4eae75]">Selected station</p>
          <h3 data-testid="text-selected-station">{station.name}</h3>
          <p>{station.area} · confidence from network signals</p>
          <div className="side-status"><span>Current availability</span><strong>{station.available > 0 ? `${station.available} / ${station.total} free` : 'FULL · ' + station.wait}</strong></div>
          <div className="side-detail">
            <div className="detail-cell"><span>Reliability score</span><b>{station.reliability}</b></div>
            <div className="detail-cell"><span>Likely wait</span><b>{station.wait}</b></div>
          </div>
          <div className="text-[.68rem] font-bold text-[#59716e]">Compatible connectors</div>
          <div className="connector-row">{station.connectors.map((connector) => <span className="connector active" key={connector} data-testid={`text-connector-${connector.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>{connector} <Check size={10} className="ml-1 inline" /></span>)}</div>
          <button type="button" className="btn-dark mt-6 w-full" onClick={() => window.alert(`Route preview set for ${station.name}.`)} data-testid="button-set-route">Set this as my stop <Navigation size={14} /></button>
        </aside>
      </div>
    </div>
  );
}

function ProductPreview() {
  return (
    <section className="demo-section section-pad" id="preview">
      <div className="container-wide">
        <p className="section-kicker eyebrow">Platform preview</p>
        <h2 className="section-title">A map that tells you <span className="text-[#f6ca4e]">what’s true.</span></h2>
        <p className="demo-intro">This is a product vision built around the signals drivers rarely get to see: occupancy, connector compatibility, battery health and a price that has a reason behind it.</p>
        <ChargingDemo />
      </div>
    </section>
  );
}

function Estimator() {
  const [weight, setWeight] = useState(1480);
  const [submitted, setSubmitted] = useState(false);
  const estimated = Math.round(980 + weight * 1.27);
  return (
    <section className="proof-section section-pad" id="estimator">
      <div className="container-wide proof-grid">
        <div>
          <p className="section-kicker eyebrow">A better goodbye</p>
          <h2 className="proof-title">Your old car still has a next chapter.</h2>
          <p className="proof-copy">Our valuation model connects curb weight and current metal spot prices to registered scrappage facilities. No mystery multiplier. Just a grounded starting point for your switch.</p>
          <div className="proof-quote">“The most useful number is the one you can explain.”<strong>— The Electrify principle</strong></div>
        </div>
        <div className="rounded-[19px] border border-[#d7cbb4] bg-[#edf1e8] p-6 md:p-8" data-testid="card-scrap-estimator">
          <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-[#d37854]">Estimator preview</p><h3 className="display mt-3 text-[1.65rem] font-bold tracking-[-.05em]">What could your car return?</h3></div><Recycle className="text-[#d37854]" size={25} /></div>
          <label htmlFor="vehicle-weight" className="mt-8 block text-[.76rem] font-bold text-[#59716e]">Approximate curb weight</label>
          <div className="mt-3 flex items-center gap-3"><input id="vehicle-weight" type="range" min="900" max="2600" step="20" value={weight} onChange={(event) => { setWeight(Number(event.target.value)); setSubmitted(false); }} className="w-full accent-[#d37854]" data-testid="input-vehicle-weight" /><span className="mono min-w-[82px] text-right text-[.72rem]" data-testid="text-vehicle-weight">{weight.toLocaleString()} kg</span></div>
          <div className="mt-7 flex items-end justify-between rounded-[13px] bg-[#15333a] p-5 text-[#edf1e8]"><div><span className="block text-[.68rem] text-[#a7c1ba]">Indicative value range</span><strong className="display mt-1 block text-[2.2rem] font-bold tracking-[-.06em]" data-testid="text-estimated-value">${estimated.toLocaleString()}</strong></div><span className="mono text-[.61rem] text-[#8bcf83]">± 8%</span></div>
          <div className="mt-5 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[.68rem] text-[#71847e]"><CircleCheck size={14} className="text-[#4eae75]" /> Connected to local facilities</span><button type="button" className="btn-dark min-h-[40px] px-4 text-[.72rem]" onClick={() => setSubmitted(true)} data-testid="button-check-value">{submitted ? 'Estimate saved' : 'Check my estimate'} <ArrowRight size={13} /></button></div>
        </div>
      </div>
    </section>
  );
}

function Proof() {
  return (
    <section className="proof-section section-pad" id="proof">
      <div className="container-wide proof-grid">
        <div>
          <p className="section-kicker eyebrow">Trust, made visible</p>
          <h2 className="proof-title">Confidence is a feature.</h2>
          <p className="proof-copy">Electrify doesn’t ask drivers to take a platform’s word for it. We show the signal, explain the estimate and put a useful confidence marker beside every important answer.</p>
          <div className="proof-quote">“Not more information. Better evidence, at the exact moment it matters.”<strong>— Product direction, Electrify Mobility</strong></div>
        </div>
        <div className="proof-items">
          <article className="proof-item" data-testid="card-proof-telemetry"><Gauge size={22} /><h3>Signals, not static pins</h3><p>OCPI and OCPP telemetry is designed to surface occupancy, connector fit and station reliability together.</p></article>
          <article className="proof-item" data-testid="card-proof-battery"><BatteryMedium size={22} /><h3>Battery health up front</h3><p>Diagnostic BMS reports make State of Health legible before you make an offer.</p></article>
          <article className="proof-item wide" data-testid="card-proof-explainable"><ShieldCheck size={22} /><h3>Every number has a trail</h3><p>From 242k+ global charging sites in open datasets to a fair residual price estimate, we are building for explainable decisions — not false precision.</p></article>
        </div>
      </div>
    </section>
  );
}

function Marketplace() {
  const [filter, setFilter] = useState('All cars');
  const filteredCars = filter === 'All cars' ? cars : cars.filter((car) => car.type === filter);
  return (
    <section className="market-section section-pad" id="marketplace">
      <div className="container-wide">
        <div className="market-head"><div><p className="section-kicker eyebrow">The next car, clearly</p><h2 className="section-title">Shop by <span className="soft">battery confidence.</span></h2></div><p>Used EVs shown with the detail that changes the decision: diagnostic State of Health, real range and a residual price that feels fair.</p></div>
        <div className="filters" role="group" aria-label="Filter used EVs">
          {['All cars', 'City', 'Long range'].map((option) => <button type="button" className={`filter-chip ${filter === option ? 'active' : ''}`} key={option} onClick={() => setFilter(option)} data-testid={`button-filter-${option.toLowerCase().replace(' ', '-')}`}>{option}<span className="ml-1 opacity-60">({option === 'All cars' ? cars.length : cars.filter((car) => car.type === option).length})</span></button>)}
        </div>
        <div className="cars-grid" aria-live="polite">
          {filteredCars.map((car, index) => <article className="car-card" key={car.name} data-testid={`card-car-${index}`}><div className="car-art"><span className="car-badge"><CircleCheck size={10} className="mr-1 inline" /> BMS checked</span></div><div className="car-info"><h3>{car.name}</h3><div className="car-meta">{car.meta}</div><div className="car-bottom"><div><div className="car-price">{car.price}</div><div className="car-meta">{car.range} estimated range</div></div><div className="soh">BATTERY SOH<strong>{car.soh}</strong></div></div></div></article>)}
        </div>
        {filteredCars.length === 0 && <div className="rounded-xl border border-dashed border-[#c6d1c4] p-10 text-center text-[#59716e]">More verified cars are being added to this route.</div>}
        <div className="mt-8 flex justify-end"><AnchorLink href="#start" className="btn-dark" testId="link-marketplace-cta">See the buying journey <ArrowRight size={15} /></AnchorLink></div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="cta-section" id="start">
      <div className="container-wide cta-content">
        <p className="eyebrow">The road is changing</p>
        <h2>Make your next move the informed one.</h2>
        <p>Electrify Mobility is shaping a calmer way into electric. Follow the product preview as we turn fragmented signals into forward motion.</p>
        <div className="cta-actions"><button type="button" className="btn-dark" onClick={() => window.alert('Thanks — the Electrify preview list is coming soon.')} data-testid="button-join-preview">Join the preview list <ArrowRight size={15} /></button><AnchorLink href="#top" className="btn-ghost" testId="link-back-to-top">Back to the top <ArrowRight size={15} className="-rotate-90" /></AnchorLink></div>
      </div>
    </section>
  );
}

function Footer() {
  return <footer className="footer"><div className="container-wide footer-inner"><div><Brand /><p className="footer-copy mt-3">A trusted guide for the move from petrol to electric.</p></div><div className="footer-links"><AnchorLink href="#modules" testId="link-footer-platform">Platform</AnchorLink><AnchorLink href="#proof" testId="link-footer-trust">Trust</AnchorLink><AnchorLink href="#start" testId="link-footer-preview">Preview <ExternalLink size={11} className="ml-1 inline" /></AnchorLink></div></div></footer>;
}

function Home() {
  return <div className="site-shell"><NavigationBar /><main><Hero /><Intro /><Modules /><ProductPreview /><Estimator /><Proof /><Marketplace /><FinalCta /></main><Footer /></div>;
}

function Router() {
  return <ErrorBoundary resetKey={useLocation()[0]}><Switch><WouterRoute path="/" component={Home} /><WouterRoute component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;