import { Globe, Leaf, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useI18n, type Language } from "@/contexts/I18nContext";

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
  const { language, setLanguage, t } = useI18n();

  const navigation = [
    { href: "/marketplace", label: t("nav.marketplace") },
    { href: "/operations", label: t("nav.operations") },
    { href: "/fpo-studio", label: t("nav.fpoStudio") },
    { href: "/farmer", label: t("nav.farmer") },
    { href: "/driver", label: t("nav.driver") },
    { href: "/telemetry", label: t("nav.telemetry") },
    { href: "/disputes", label: t("nav.disputes") },
    { href: "/impact", label: t("nav.impact") },
  ];

  return (
    <div className="page-shell bg-cream">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/88 backdrop-blur-xl">
        <div className="site-container flex h-[70px] items-center justify-between">
          <Wordmark />
          <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold no-underline transition ${
                  location === item.href ? "bg-sage text-forest" : "text-ink/65 hover:bg-white hover:text-forest"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 rounded-full border border-line bg-white px-2 py-1 text-xs">
              <Globe size={13} className="text-leaf" />
              {(["en", "hi", "ta"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase transition ${
                    language === lang ? "bg-forest text-white" : "text-ink/60 hover:text-ink"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <Link href="/marketplace" className="action-button action-primary no-underline text-xs py-2 px-3">
              {t("btn.explore")}
            </Link>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full border border-line bg-paper xl:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X size={19} /> : <Menu size={20} />}</button>
        </div>
        {open && (
          <div className="border-t border-line bg-paper px-5 py-4 xl:hidden">
            <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
              <span className="text-xs text-ink/60">Select Language</span>
              <div className="flex gap-1">
                {(["en", "hi", "ta"] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`rounded-md px-2 py-1 text-xs font-bold uppercase ${
                      language === lang ? "bg-forest text-white" : "bg-cream text-ink"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            <nav className="site-container grid gap-1" aria-label="Mobile navigation">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold no-underline ${
                    location === item.href ? "bg-sage text-forest" : "text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      {children}
      <footer className="mt-20 border-t border-line bg-[#f1f2e8] py-10"><div className="site-container grid gap-8 md:grid-cols-[1.1fr_1fr]"><div><Wordmark /><p className="mt-4 max-w-md text-sm leading-6 text-ink/65">A transparent, traceable marketplace prototype for SIH 2026 PS 26033. Built around direct farmer/FPO-to-buyer trade, demand-aware supply, and shared logistics.</p></div><div className="grid gap-3 text-sm text-ink/65"><p className="font-semibold text-ink">Demo-data integrity</p><p>Public mandi references are dated AGMARKNET/data.gov.in records. Farmer codes, FPO profiles, orders, routes, forecasts, and operational KPIs are illustrative demo records.</p><p className="font-mono text-[0.68rem] uppercase tracking-[0.12em]">SIH 2026 · Ministry of Consumer Affairs · PS 26033</p></div></div></footer>
    </div>
  );
}

