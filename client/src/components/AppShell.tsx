import { Leaf, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navigation = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/operations", label: "Operations" },
  { href: "/fpo-studio", label: "FPO studio" },
  { href: "/impact", label: "Impact command center" },
];

export function Wordmark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 no-underline text-ink" aria-label="Annadata Direct home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest text-white shadow-lg shadow-forest/15"><Leaf size={19} strokeWidth={2.4} /></span>
      <span className="leading-none"><span className="block font-display text-[1.06rem] font-semibold tracking-[-0.05em]">Annadata</span><span className="block pt-0.5 font-mono text-[0.56rem] font-medium tracking-[0.16em] text-leaf">DIRECT</span></span>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  return (
    <div className="page-shell bg-cream">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/88 backdrop-blur-xl">
        <div className="site-container flex h-[70px] items-center justify-between">
          <Wordmark />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {navigation.map((item) => <Link key={item.href} href={item.href} className={`rounded-full px-3.5 py-2 text-sm font-semibold no-underline transition ${location === item.href ? "bg-sage text-forest" : "text-ink/65 hover:bg-white hover:text-forest"}`}>{item.label}</Link>)}
          </nav>
          <div className="hidden items-center gap-3 md:flex"><span className="pill bg-sage text-forest"><span className="h-1.5 w-1.5 rounded-full bg-leaf" />Demo mode</span><Link href="/marketplace" className="action-button action-primary no-underline">Explore produce</Link></div>
          <button className="grid h-10 w-10 place-items-center rounded-full border border-line bg-paper md:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X size={19} /> : <Menu size={20} />}</button>
        </div>
        {open && <div className="border-t border-line bg-paper px-5 py-4 md:hidden"><nav className="site-container grid gap-1" aria-label="Mobile navigation">{navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`rounded-xl px-3 py-3 text-sm font-semibold no-underline ${location === item.href ? "bg-sage text-forest" : "text-ink"}`}>{item.label}</Link>)}</nav></div>}
      </header>
      {children}
      <footer className="mt-20 border-t border-line bg-[#f1f2e8] py-10"><div className="site-container grid gap-8 md:grid-cols-[1.1fr_1fr]"><div><Wordmark /><p className="mt-4 max-w-md text-sm leading-6 text-ink/65">A transparent, traceable marketplace prototype for SIH 2026 PS 26033. Built around direct farmer/FPO-to-buyer trade, demand-aware supply, and shared logistics.</p></div><div className="grid gap-3 text-sm text-ink/65"><p className="font-semibold text-ink">Demo-data integrity</p><p>Public mandi references are dated AGMARKNET/data.gov.in records. Farmer codes, FPO profiles, orders, routes, forecasts, and operational KPIs are illustrative demo records.</p><p className="font-mono text-[0.68rem] uppercase tracking-[0.12em]">SIH 2026 · Ministry of Consumer Affairs · PS 26033</p></div></div></footer>
    </div>
  );
}
