import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PricingSection } from "@/components/marketing/PricingSection";
import { RoiCalculatorSection } from "@/components/marketing/RoiCalculatorSection";
import { appUrl } from "@/lib/appOrigin";
import {
  ArrowRight,
  PlayCircle,
  Sparkles,
  Mail,
  Phone,
  Clock,
  FileSpreadsheet,
  ShieldOff,
  ClockAlert,
  UsersRound,
  Library,
  GitBranch,
  Smartphone,
  ScrollText,
  DatabaseZap,
  KeyRound,
  Undo2,
  HardDriveDownload,
  LockKeyhole,
  WifiOff,
  Layers,
  RefreshCcw,
  ChevronLeft,
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Cpu,
  Users,
  FileText,
  CheckCircle2,
  RotateCcw,
  HardHat,
  ListChecks,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

/* ============================================================
   REVEAL ON SCROLL
   ============================================================ */
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setTimeout(() => el.classList.add("in"), delay);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
};

/* ============================================================
   DECORATIVE SVG GRAPHICS
   ============================================================ */
const Rings = ({ className = "", count = 5 }: { className?: string; count?: number }) => (
  <svg className={className} viewBox="-100 -100 200 200" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <circle key={i} cx="0" cy="0" r={20 + i * 16} fill="none" stroke="currentColor" strokeOpacity={0.12 - i * 0.015} strokeWidth="0.5" />
    ))}
    <circle cx="0" cy="0" r="5" fill="currentColor" fillOpacity=".25" />
  </svg>
);

const Reticle = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="-100 -100 200 200" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="0.4" strokeOpacity=".25">
      <circle cx="0" cy="0" r="70" />
      <circle cx="0" cy="0" r="50" />
      <circle cx="0" cy="0" r="30" />
      <line x1="-95" y1="0" x2="95" y2="0" />
      <line x1="0" y1="-95" x2="0" y2="95" />
      <line x1="-67" y1="-67" x2="67" y2="67" />
      <line x1="-67" y1="67" x2="67" y2="-67" />
    </g>
    {[0, 60, 120, 180, 240, 300].map((a, i) => (
      <g key={i} transform={`rotate(${a})`}>
        <line x1="0" y1="-70" x2="0" y2="-78" stroke="currentColor" strokeOpacity=".4" strokeWidth="0.8" />
      </g>
    ))}
  </svg>
);

const CircuitMaze = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 600 400" aria-hidden="true" fill="none" stroke="currentColor">
    <g strokeWidth="0.8" strokeOpacity=".25">
      <path d="M0 60 L120 60 L150 90 L300 90 L330 60 L480 60 L510 90 L600 90" />
      <path d="M0 180 L80 180 L110 150 L260 150 L290 180 L420 180 L450 210 L600 210" />
      <path d="M0 300 L160 300 L190 270 L350 270 L380 300 L520 300 L550 330 L600 330" />
      <path d="M120 60 L120 180 M330 60 L330 270 M450 210 L450 300" />
    </g>
    <g fill="currentColor" fillOpacity=".5">
      <circle cx="120" cy="60" r="2" />
      <circle cx="330" cy="60" r="2" />
      <circle cx="290" cy="180" r="2" />
      <circle cx="450" cy="210" r="2" />
      <circle cx="380" cy="300" r="2" />
    </g>
  </svg>
);

const PylonGlyph = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 160" fill="none" stroke="currentColor" strokeWidth="0.9" strokeOpacity=".35" aria-hidden="true">
    <path d="M20 150 L60 10 L100 150 M30 120 L90 120 M36 90 L84 90 M42 60 L78 60 M48 30 L72 30" />
    <path d="M60 10 L60 0" />
    <line x1="15" y1="30" x2="48" y2="30" strokeDasharray="2 3" />
    <line x1="72" y1="30" x2="105" y2="30" strokeDasharray="2 3" />
    <line x1="10" y1="60" x2="42" y2="60" strokeDasharray="2 3" />
    <line x1="78" y1="60" x2="110" y2="60" strokeDasharray="2 3" />
  </svg>
);

/* ============================================================
   DASHBOARD MOCK (Product section)
   ============================================================ */
const DashboardMock = () => {
  const sidebarItems: [LucideIcon, string, boolean][] = [
    [LayoutDashboard, "Dashboard", false],
    [FolderKanban, "Projects", true],
    [ClipboardCheck, "Test queue", false],
    [Cpu, "Equipment", false],
    [Users, "Team", false],
    [FileText, "Reports", false],
  ];
  const rows = [
    { id: "Transformer #3", name: "Winding resistance check", eng: "R. Anand", status: "review" },
    { id: "CT bay 4", name: "Ratio & polarity test", eng: "S. Kapoor", status: "pass" },
    { id: "VCB #7", name: "Contact resistance", eng: "M. Iqbal", status: "rework" },
    { id: "Arrester #2", name: "Insulation resistance", eng: "P. Joshi", status: "pass" },
  ];
  return (
    <div className="relative rounded-2xl grad-border bg-[#131320]/80 backdrop-blur-xl shadow-[0_50px_120px_-30px_rgba(59,130,246,.30)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
        </div>
        <div className="font-mono text-[11px] text-white/40 tracking-wide hidden sm:block">acme-power.testflow.io / projects / neeldih-400kv</div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-mono">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-dot" /> LIVE
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3 hidden md:block border-r border-white/5 p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono mb-2">Workspace</div>
          {sidebarItems.map(([I, l, a]) => (
            <div key={l} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12.5px] ${a ? "bg-white/[.06] text-white" : "text-white/55"}`}>
              <I className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>{l}</span>
              {l === "Test queue" && <span className="ml-auto font-mono text-[10px] text-white/40">23</span>}
            </div>
          ))}
          <div className="pt-4 mt-3 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono mb-2">Active project</div>
            <div className="px-2.5 py-2 rounded-md bg-gradient-to-br from-[#3b82f6]/10 to-[#8b5cf6]/10 border border-white/5">
              <div className="text-[12.5px] font-medium leading-snug">Neeldih 400 / 220 kV</div>
              <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[62%] bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]" />
              </div>
              <div className="flex items-center justify-between mt-1.5 font-mono text-[10px] text-white/45">
                <span>62% complete</span><span>148/238</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-9 p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <div className="font-mono text-[10px] text-white/40 tracking-widest">PROJECT · ACTIVE</div>
              <h3 className="text-xl md:text-2xl font-semibold tracking-tight mt-0.5">Neeldih 400 / 220 kV Substation</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="chip rounded-md px-2 py-1 text-[10.5px] font-mono text-white/60">PHASE 2 · ENERGIZATION</span>
              <span className="chip rounded-md px-2 py-1 text-[10.5px] font-mono text-emerald-300/90 border-emerald-400/20">ON SCHEDULE</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {([
              ["Equipment", "37", Cpu],
              ["Tests done", "148", CheckCircle2],
              ["In rework", "06", RotateCcw],
              ["Engineers", "12", HardHat],
            ] as [string, string, LucideIcon][]).map(([l, v, I]) => (
              <div key={l} className="rounded-lg bg-[#0f0f17] border border-white/5 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{l}</span>
                  <I className="w-3.5 h-3.5 text-white/40" strokeWidth={1.6} />
                </div>
                <div className="text-[22px] font-semibold tracking-tight tabular-nums">{v}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/5 overflow-hidden bg-[#0f0f17]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <div className="flex items-center gap-2 text-[12px] text-white/70">
                <ListChecks className="w-3.5 h-3.5 text-white/50" strokeWidth={1.6} /> Test queue
              </div>
              <span className="chip rounded px-1.5 py-0.5 font-mono text-[10px] text-white/40">AWAITING REVIEW</span>
            </div>
            <div className="divide-y divide-white/5 text-[12.5px]">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-12 items-center px-3 py-2.5 hover:bg-white/[.02]">
                  <div className="col-span-4 font-mono text-[11px] text-white/60">{r.id}</div>
                  <div className="col-span-5 text-white/90 truncate">{r.name}</div>
                  <div className="col-span-2 text-white/55 truncate hidden md:block">{r.eng}</div>
                  <div className="col-span-3 md:col-span-1 text-right">
                    {r.status === "review" && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded chip border-amber-400/25 text-amber-300/90">AWAIT</span>}
                    {r.status === "pass" && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded chip border-emerald-400/25 text-emerald-300/90">PASS</span>}
                    {r.status === "rework" && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded chip border-rose-400/25 text-rose-300/90">REWORK</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   PHONE FORM (Field section)
   ============================================================ */
const PhoneFrame = ({ children }: { children: ReactNode }) => (
  <div className="relative w-[240px] mx-auto">
    <div className="rounded-[40px] bg-gradient-to-b from-white/10 to-white/5 p-[2px] shadow-2xl">
      <div className="rounded-[38px] bg-[#07070c] overflow-hidden relative h-[500px]">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[88px] h-5 bg-black rounded-full z-20" />
        <div className="absolute inset-0 pt-7 pb-2 px-3 overflow-hidden">{children}</div>
      </div>
    </div>
  </div>
);

const PhoneForm = () => (
  <div className="h-full flex flex-col text-[11px]">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-white/5 grid place-items-center">
        <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
      </div>
      <div className="flex-1">
        <div className="font-mono text-[8.5px] text-white/45 uppercase">Transformer #3</div>
        <div className="text-[13px] font-semibold tracking-tight">Routine test</div>
      </div>
    </div>
    {([
      ["Reading 1", "0.182"],
      ["Reading 2", "0.181"],
      ["Reading 3", ""],
      ["Temperature", "42"],
    ] as const).map(([l, v], i) => (
      <div key={i} className="mb-1.5">
        <div className="font-mono text-[9px] text-white/45 mb-0.5">{l}</div>
        <div className={`rounded-md border px-2 py-1.5 ${v ? "border-white/[.12] bg-white/[.02]" : "border-[#3b82f6]/40 bg-[#3b82f6]/5"}`}>
          {v || <span className="text-white/30">Enter value…</span>}
        </div>
      </div>
    ))}
    <div className="mt-auto flex gap-2 pt-2">
      <button className="flex-1 rounded-md border border-white/10 text-white/70 py-2 text-[11px]">Save draft</button>
      <button className="flex-1 rounded-md btn-primary text-white py-2 text-[11px] font-medium">Submit</button>
    </div>
  </div>
);

/* ============================================================
   NAV
   ============================================================ */
const Nav = () => (
  <header className="sticky top-0 z-40 navblur">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <a href="#" className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-md bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] grid place-items-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
            <path fill="currentColor" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
          </svg>
        </span>
        <span className="text-[17px] font-semibold tracking-tight">TestFlow</span>
      </a>
      <nav className="hidden md:flex items-center gap-7 text-[13.5px] text-white/65">
        <a href="#product" className="hover:text-white">Product</a>
        <a href="#workflow" className="hover:text-white">Workflow</a>
        <a href="#pricing" className="hover:text-white">Pricing</a>
        <a href="#security" className="hover:text-white">Security</a>
        <a href="#cta" className="hover:text-white">Contact</a>
      </nav>
      <div className="flex items-center gap-2.5">
        <a href={appUrl('/auth')} className="text-[13.5px] font-medium px-3.5 py-2 text-white/75 hover:text-white">Sign in</a>
        <a href={appUrl('/start-trial')} className="btn-primary text-[13.5px] font-medium px-3.5 py-2 rounded-md text-white">Get started</a>
      </div>
    </div>
  </header>
);

/* ============================================================
   HERO
   ============================================================ */
const Hero = () => (
  <section className="relative overflow-hidden">
    <div className="substation-bg-soft" />
    <div className="absolute inset-0 bg-grid" />
    <div className="absolute inset-0 spotlight pointer-events-none" />
    {/* drifting orbs */}
    <div className="absolute -top-32 -left-32 w-[520px] h-[520px] orb-blue rounded-full drift pointer-events-none" />
    <div className="absolute top-40 -right-40 w-[600px] h-[600px] orb-vio rounded-full drift pointer-events-none" style={{ animationDelay: "-6s" }} />
    {/* reticle */}
    <Reticle className="absolute top-20 right-6 w-72 h-72 text-[#60a5fa]/60 spin-slow pointer-events-none hidden md:block" />
    {/* circuit traces */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 900">
      <defs>
        <linearGradient id="mk-trace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset=".5" stopColor="#3b82f6" stopOpacity=".5" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mk-trace2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0" />
          <stop offset=".5" stopColor="#a78bfa" stopOpacity=".45" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,140 L320,140 L360,180 L1100,180 L1140,140 L1440,140" fill="none" stroke="url(#mk-trace)" strokeWidth="1" className="dashflow" />
      <path d="M0,520 L240,520 L280,560 L640,560 L680,520 L980,520 L1020,560 L1440,560" fill="none" stroke="url(#mk-trace2)" strokeWidth="1" className="dashflow" style={{ animationDelay: "-3s" }} />
      <path d="M0,780 L420,780 L460,740 L820,740 L860,780 L1440,780" fill="none" stroke="url(#mk-trace)" strokeWidth="1" className="dashflow" style={{ animationDelay: "-5s" }} />
      <circle cx="360" cy="180" r="2.5" fill="#60a5fa" className="pulse-dot" />
      <circle cx="1140" cy="140" r="2.5" fill="#a78bfa" className="pulse-dot" />
      <circle cx="680" cy="520" r="2.5" fill="#60a5fa" className="pulse-dot" />
      <circle cx="460" cy="740" r="2.5" fill="#a78bfa" className="pulse-dot" />
    </svg>

    <div className="relative max-w-7xl mx-auto px-6 pt-20 md:pt-28 pb-20">
      <Reveal>
        <div className="inline-flex items-center gap-2 chip rounded-full px-3 py-1 text-[11px] font-mono text-white/65 tracking-wide uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] pulse-dot" />
          For commissioning contractors, EPCs &amp; utilities
        </div>
      </Reveal>

      <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 mt-8 items-center">
        <div className="lg:col-span-7">
          <Reveal delay={60}>
            <h1 className="text-[40px] sm:text-6xl md:text-[72px] leading-[1.03] font-semibold tracking-[-0.03em]">
              Substation commissioning,{" "}
              <span className="grad-text">digitized end&#8209;to&#8209;end</span>.
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/60">
              A single, role-based system for scoping, testing, approval, and handover — replacing fragmented spreadsheets across your field operations.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#cta" className="btn-primary inline-flex items-center gap-2 text-[14.5px] font-medium px-5 py-3 rounded-lg text-white">
                Request access <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
              </a>
              <a href="#product" className="inline-flex items-center gap-2 text-[14.5px] font-medium px-5 py-3 rounded-lg border border-white/[.12] text-white/85 hover:bg-white/[.04]">
                <PlayCircle className="w-4 h-4" strokeWidth={1.6} /> Watch overview
              </a>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {([["Field", "Mobile"], ["Office", "Web"], ["Audit", "Built-in"]] as const).map(([n, l]) => (
                <div key={l}>
                  <div className="text-xl font-semibold tracking-tight">{n}</div>
                  <div className="font-mono text-[10.5px] text-white/45 uppercase tracking-wider mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={200} className="lg:col-span-5">
          <div className="relative grad-border rounded-2xl overflow-hidden">
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/11" }}>
              <img
                src="https://images.unsplash.com/photo-1554232694-39f041f74d13?w=1200&q=80&auto=format&fit=crop"
                alt="Substation"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="absolute left-4 bottom-4 right-4 flex items-center justify-between">
              <div className="chip rounded-md px-2.5 py-1.5 font-mono text-[10.5px] text-white/75 backdrop-blur bg-[#07070c]/60">
                SS-NEELDIH-400KV · ACTIVE · 62%
              </div>
              <div className="chip rounded-md px-2 py-1 font-mono text-[10px] text-emerald-300/90 backdrop-blur bg-[#07070c]/60">● LIVE</div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* trust strip */}
      <Reveal delay={380}>
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-wrap items-center gap-x-12 gap-y-4">
          <div className="font-mono text-[10.5px] uppercase tracking-widest text-white/35">In use by commissioning teams at</div>
          {["Voltarc Power", "Meridian EPC", "Sundyne Utilities", "Greycell Energy"].map((c) => (
            <div key={c} className="text-white/45 text-[14px] tracking-tight">
              <span className="font-semibold text-white/65">{c.split(" ")[0]}</span>{" "}
              <span className="font-light">{c.split(" ").slice(1).join(" ")}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);

/* ============================================================
   PROBLEM
   ============================================================ */
const Problem = () => {
  const items: { icon: LucideIcon; t: string; d: string }[] = [
    {
      icon: FileSpreadsheet,
      t: "Fragmented test records",
      d: "Test sheets spread across spreadsheets, laptops, and personal devices — with no single source of truth at handover.",
    },
    {
      icon: ShieldOff,
      t: "Untraceable changes",
      d: "No reliable audit of who modified which value, when, or on what authority. Reconstructing the trail is manual and slow.",
    },
    {
      icon: ClockAlert,
      t: "Delayed handover",
      d: "Final reports are assembled by hand from incomplete inputs, often arriving weeks after project closure.",
    },
  ];
  return (
    <section className="relative py-20 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-dots opacity-50 mask-fade-radial pointer-events-none" />
      <CircuitMaze className="absolute -left-20 top-20 w-[600px] h-[400px] text-[#60a5fa]/40 pointer-events-none hidden md:block" />
      <PylonGlyph className="absolute right-10 top-10 w-32 h-44 text-[#a78bfa]/40 pointer-events-none hidden lg:block" />
      <div className="absolute -right-20 bottom-0 w-[420px] h-[420px] orb-vio rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Problem</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl">
            The legacy stack wasn't built for substation work.
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-4 mt-12">
          {items.map((it, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="rounded-xl border border-white/[.08] bg-[#131320]/50 p-6 h-full">
                <div className="w-10 h-10 rounded-lg bg-white/[.03] border border-white/[.08] grid place-items-center text-white/70 mb-5">
                  <it.icon className="w-5 h-5" strokeWidth={1.6} />
                </div>
                <h3 className="text-[18px] font-semibold tracking-tight">{it.t}</h3>
                <p className="mt-2 text-white/55 text-[14px] leading-relaxed">{it.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============================================================
   PRODUCT / FEATURES
   ============================================================ */
const ProductSection = () => {
  const items: { icon: LucideIcon; t: string; d: string }[] = [
    { icon: UsersRound, t: "Role-based workspace", d: "Each team member sees the views and actions relevant to their role." },
    { icon: Library, t: "Ready-to-use templates", d: "Standard test forms across every equipment class your team works with." },
    { icon: GitBranch, t: "Guided project flow", d: "From scoping to handover — a clear path with the right approvals at each step." },
    { icon: Smartphone, t: "Mobile for the field", d: "Engineers capture results on-site, even without a signal." },
    { icon: Sparkles, t: "One-click reporting", d: "Polished handover reports ready when the project closes." },
    { icon: ScrollText, t: "Full traceability", d: "Every action is recorded — easy to review later if needed." },
  ];
  return (
    <section id="product" className="relative py-20 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-iso opacity-60 mask-fade-radial pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] orb-soft rounded-full pointer-events-none" />
      <Rings className="absolute top-40 -right-32 w-[480px] h-[480px] text-[#60a5fa] spin-slow-rev pointer-events-none hidden lg:block" count={6} />
      <div className="relative max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Product</div>
              <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">One platform. Every commissioning workflow.</h2>
            </div>
            <p className="lg:col-span-5 text-white/55 text-[15px] leading-relaxed">
              From project scoping to final report — built around the people who actually do the work in the field.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12">
            <DashboardMock />
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4 mt-12">
          {items.map((it, i) => (
            <Reveal key={i} delay={i * 50}>
              <div className="rounded-xl border border-white/[.08] bg-[#131320]/50 p-6 h-full hover:border-white/15 transition">
                <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 grid place-items-center text-[#60a5fa] mb-5">
                  <it.icon className="w-5 h-5" strokeWidth={1.6} />
                </div>
                <h3 className="text-[16.5px] font-semibold tracking-tight">{it.t}</h3>
                <p className="mt-2 text-white/55 text-[13.5px] leading-relaxed">{it.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============================================================
   WORKFLOW
   ============================================================ */
const WorkflowSection = () => {
  const steps = [
    { k: "DRAFT", t: "Scope", role: "GM", i: 0 },
    { k: "APPROVED", t: "Authorize", role: "Superadmin", i: 1 },
    { k: "ACTIVE", t: "Execute", role: "Field", i: 2 },
    { k: "CLOSED", t: "Handover", role: "GM", i: 3 },
  ];
  const stepCls = [
    "bg-white/[.08] text-white/70 border-white/15",
    "bg-[#8b5cf6]/15 text-[#c4b5fd] border-[#8b5cf6]/30",
    "bg-[#3b82f6]/15 text-[#60a5fa] border-[#3b82f6]/30",
    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ];
  const labelCls = ["text-white/45", "text-[#c4b5fd]", "text-[#60a5fa]", "text-emerald-300"];
  return (
    <section id="workflow" className="relative py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Lifecycle</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl">
            Four states. Clear ownership at every step.
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-12 rounded-2xl border border-white/[.08] bg-[#131320]/40 p-8 md:p-12 overflow-hidden">
            <div className="absolute inset-0 bg-grid-fine opacity-40" />
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
              {steps.map((s, i) => (
                <div key={i} className="relative">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full grid place-items-center font-mono text-[11px] font-semibold border ${stepCls[i]}`}>
                      0{i + 1}
                    </div>
                    {i < steps.length - 1 && <div className="hidden md:block flex-1 h-px bg-white/10" />}
                  </div>
                  <div className={`mt-4 font-mono text-[10.5px] tracking-widest ${labelCls[i]}`}>{s.k}</div>
                  <div className="text-[17px] font-semibold tracking-tight mt-1">{s.t}</div>
                  <div className="text-white/50 text-[13px] font-mono mt-0.5">{s.role}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ============================================================
   EQUIPMENT
   ============================================================ */
const Equipment = () => {
  const items: [string, string][] = [
    ["Power Transformers", "PTR"],
    ["Current Transformers", "CT"],
    ["Capacitive Voltage Transformers", "CVT"],
    ["Lightning Arresters", "LA"],
    ["SF6 Circuit Breakers", "SF6"],
    ["Isolators", "ISO"],
    ["Vacuum Circuit Breakers", "VCB"],
    ["Earth Pits", "EP"],
  ];
  return (
    <section id="equipment" className="relative py-20 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <PylonGlyph className="absolute left-6 top-32 w-24 h-32 text-[#60a5fa]/60 pointer-events-none hidden md:block" />
      <PylonGlyph className="absolute right-6 bottom-32 w-24 h-32 text-[#a78bfa]/60 pointer-events-none hidden md:block" />
      <Reticle className="absolute top-1/2 -translate-y-1/2 -right-40 w-[420px] h-[420px] text-[#a78bfa]/70 spin-slow pointer-events-none hidden lg:block" />
      <div className="relative max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Equipment coverage</div>
              <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl">
                Covers every equipment type in a typical substation.
              </h2>
            </div>
            <div className="font-mono text-[11px] text-white/45">Aligned with industry test standards.</div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 relative grad-border rounded-2xl overflow-hidden">
            <div style={{ position: "relative", width: "100%", aspectRatio: "21/9" }}>
              <img
                src="https://images.unsplash.com/photo-1693013112835-5f3128bb555f?w=1800&q=80&auto=format&fit=crop"
                alt="Substation overview"
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {items.map(([name, code]) => (
              <div key={code} className="rounded-xl border border-white/[.08] bg-[#131320]/50 p-5 hover:border-white/15 hover:-translate-y-0.5 transition">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[10.5px] text-white/45 tracking-wider">{code}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]/60" />
                </div>
                <div className="text-[14.5px] font-medium tracking-tight leading-snug">{name}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ============================================================
   IN THE FIELD
   ============================================================ */
const Field = () => (
  <section className="relative py-20 md:py-24 overflow-hidden">
    <div className="absolute inset-0 bg-grid opacity-30" />
    <div className="absolute -left-32 top-1/3 w-[520px] h-[520px] orb-blue rounded-full drift pointer-events-none" />
    <div className="absolute -right-20 bottom-1/4 w-[480px] h-[480px] orb-vio rounded-full drift pointer-events-none" style={{ animationDelay: "-5s" }} />
    <CircuitMaze className="absolute right-0 top-10 w-[600px] h-[400px] text-[#a78bfa]/40 pointer-events-none hidden lg:block" />

    <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-10 items-center">
      <Reveal className="lg:col-span-7">
        <div className="relative grad-border rounded-2xl overflow-hidden">
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/10" }}>
            <img
              src="https://images.unsplash.com/photo-1556205435-e94d9c12be26?w=1200&q=80&auto=format&fit=crop"
              alt="Engineer on-site"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </Reveal>
      <Reveal delay={120} className="lg:col-span-5">
        <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">In the field</div>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">Built for the switchyard.</h2>
        <p className="mt-5 text-white/60 text-[15px] leading-relaxed">
          Field engineers run tests offline, capture readings against the standard sequence, and submit for supervisor review when connectivity returns.
        </p>
        <div className="mt-7 space-y-3 max-w-md">
          {([
            [WifiOff, "Works without signal", "Drafts persist on-device and sync on reconnect."],
            [Layers, "Standardized templates", "One source of truth across teams and projects."],
            [RefreshCcw, "Real-time approval", "Supervisor decisions reflect instantly on the engineer's device."],
          ] as [LucideIcon, string, string][]).map(([I, t, d]) => (
            <div key={t} className="flex gap-3">
              <div className="w-8 h-8 rounded-md bg-white/[.04] border border-white/[.08] grid place-items-center text-white/70 shrink-0">
                <I className="w-4 h-4" strokeWidth={1.6} />
              </div>
              <div>
                <div className="text-[14px] font-medium">{t}</div>
                <div className="text-white/50 text-[13px]">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>

    {/* phone preview */}
    <div className="relative max-w-7xl mx-auto px-6 mt-16 flex justify-center">
      <Reveal delay={200}>
        <PhoneFrame>
          <PhoneForm />
        </PhoneFrame>
      </Reveal>
    </div>
  </section>
);

/* ============================================================
   SECURITY
   ============================================================ */
const Security = () => {
  const items: [LucideIcon, string, string][] = [
    [DatabaseZap, "Your data, isolated", "Every organization operates within its own tenant boundary, enforced at the database layer via row-level security."],
    [LockKeyhole, "Encrypted in transit", "All traffic runs over HTTPS/TLS, and data at rest is encrypted through our infrastructure providers."],
    [ScrollText, "Complete history", "Administrative and workflow actions are recorded for traceability."],
    [KeyRound, "Clear permissions", "People only see and approve what's relevant to their role."],
    [Undo2, "Restore in a click", "Accidentally removed something? It's recoverable."],
    [HardDriveDownload, "Nightly backups", "Database backups run automatically every night and are retained for 30 days."],
  ];
  return (
    <section id="security" className="relative py-20 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-dots opacity-40 mask-fade-radial pointer-events-none" />
      <Rings className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] text-[#60a5fa]/80 spin-slow pointer-events-none" count={7} />
      <Reticle className="absolute bottom-10 -left-32 w-80 h-80 text-[#a78bfa]/70 spin-slow-rev pointer-events-none hidden md:block" />
      <div className="relative max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Security &amp; compliance</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl">Security controls, by design.</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-3 mt-12">
          {items.map(([I, t, d], i) => (
            <Reveal key={t} delay={i * 40}>
              <div className="rounded-xl border border-white/[.08] bg-[#131320]/50 p-5 h-full">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-md bg-white/[.04] border border-white/[.08] grid place-items-center text-[#60a5fa]">
                    <I className="w-4 h-4" strokeWidth={1.6} />
                  </div>
                  <div className="text-[14.5px] font-medium tracking-tight">{t}</div>
                </div>
                <p className="text-white/55 text-[13px] leading-relaxed">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={300}>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[11px] text-white/45">
            <span>Row-level tenant isolation</span>
            <span className="text-white/20">·</span>
            <span>Rate-limited admin APIs</span>
            <span className="text-white/20">·</span>
            <span>Encrypted in transit</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ============================================================
   FAQ
   ============================================================ */
const FAQ = () => {
  const faqs: [string, string][] = [
    ["How long does onboarding take?", "Most teams run their first live project within 48 hours of provisioning."],
    ["Can data be exported?", "Yes — CSV, per-equipment Excel, and PDF reports are available on every plan. Direct database access is available on Enterprise."],
    ["Does the mobile app work offline?", "Yes. Engineers can draft and edit tests without connectivity; data syncs on reconnect."],
    ["Is our data kept private?", "Yes. Each customer's data is fully isolated from every other customer's."],
  ];
  return (
    <section id="faq" className="relative py-20 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-iso opacity-50 mask-fade-radial pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] orb-soft rounded-full pointer-events-none" />
      <div className="relative max-w-4xl mx-auto px-6">
        <Reveal>
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/40 text-center">FAQ</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight text-center">Common questions.</h2>
        </Reveal>
        <div className="mt-12 space-y-2">
          {faqs.map(([q, a], i) => (
            <Reveal key={i} delay={i * 40}>
              <details className="group rounded-xl border border-white/[.08] bg-[#131320]/40 hover:bg-[#131320]/60 open:bg-[#131320]/70 transition">
                <summary className="list-none cursor-pointer flex items-center gap-4 px-5 py-4">
                  <span className="font-mono text-[11px] text-white/35 w-8">0{i + 1}</span>
                  <span className="text-[15px] font-medium tracking-tight flex-1">{q}</span>
                  <span className="acc-icon text-white/60 text-xl leading-none">+</span>
                </summary>
                <div className="px-5 pb-5 pl-[60px] text-white/60 text-[14px] leading-relaxed">{a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============================================================
   DEMO REQUEST FORM
   ============================================================ */
function DemoRequestForm() {
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) return;
    setStatus('submitting');
    const { error } = await supabase.from('demo_requests').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      phone: form.phone.trim() || null,
      message: form.message.trim() || null,
    });
    if (error) console.error('[DemoRequestForm] submit failed:', error);
    setStatus(error ? 'error' : 'success');

    if (!error) {
      supabase.functions.invoke('notify-demo-request', {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          phone: form.phone.trim() || null,
          message: form.message.trim() || null,
        },
      }).catch((notifyError) => {
        console.error('[DemoRequestForm] notify failed:', notifyError);
      });
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-white/15 bg-[#07070c]/60 backdrop-blur p-6 md:p-7 text-center">
        <div className="text-4xl mb-3">✓</div>
        <div className="text-white font-semibold text-lg">Request received</div>
        <div className="mt-2 text-white/55 text-sm">We'll reach out within one business day.</div>
      </div>
    );
  }

  const fieldBase = 'w-full rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#3b82f6]/60 transition';

  return (
    <div className="rounded-2xl border border-white/15 bg-[#07070c]/60 backdrop-blur p-6 md:p-7">
      <div className="font-mono text-[10.5px] uppercase tracking-widest text-white/50 mb-5">Book a demo</div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-white/45 mb-1">Full name *</label>
            <input type="text" required value={form.name} onChange={set('name')} className={fieldBase} />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-white/45 mb-1">Company *</label>
            <input type="text" required value={form.company} onChange={set('company')} className={fieldBase} />
          </div>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-white/45 mb-1">Work email *</label>
          <input type="email" required value={form.email} onChange={set('email')} className={fieldBase} />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-white/45 mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={set('phone')} className={fieldBase} />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-white/45 mb-1">Message</label>
          <textarea rows={3} value={form.message} onChange={set('message')} className={`${fieldBase} resize-none`} />
        </div>
        {status === 'error' && (
          <p className="text-red-400 text-sm">Something went wrong — email us at sharmaparakh05@gmail.com</p>
        )}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-60 px-4 py-2.5 text-[14px] font-semibold text-white transition"
        >
          {status === 'submitting' ? 'Sending…' : 'Request a Demo'}
        </button>
        <p className="text-center font-mono text-[10.5px] text-white/35">
          Or call{' '}
          <a href="tel:+919413552887" className="underline text-white/55">+91 94135-52887</a>
        </p>
      </form>
    </div>
  );
}

/* ============================================================
   FOOTER CTA — contact section
   ============================================================ */
const FooterCTA = () => (
  <section id="cta" className="relative py-20 md:py-24">
    <div className="max-w-7xl mx-auto px-6">
      <div className="relative rounded-3xl overflow-hidden p-10 md:p-16">
        {/* substation bg */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1554232694-39f041f74d13?w=2000&q=80&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, rgba(22,26,69,.7) 0%, rgba(26,15,58,.8) 60%, rgba(10,10,15,.9) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-[#3b82f6]/25 blur-[140px]" />
        <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full bg-[#8b5cf6]/25 blur-[140px]" />

        <div className="relative grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="font-mono text-[11px] uppercase tracking-widest text-white/55">Contact us</div>
            <h2 className="mt-3 text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.05]">
              Let's get your team <span className="grad-text">on TestFlow</span>.
            </h2>
            <p className="mt-5 text-white/70 text-[16px] max-w-xl">
              Tell us about your commissioning workflow — we'll set up a walkthrough and provision a workspace for your team. Typical response within one business day.
            </p>
          </div>

          <div className="lg:col-span-5">
            <DemoRequestForm />
          </div>
        </div>
      </div>

      <footer className="mt-16 grid md:grid-cols-5 gap-8 text-[13.5px] text-white/55">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] grid place-items-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
                <path fill="currentColor" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
              </svg>
            </span>
            <span className="font-semibold text-white">TestFlow</span>
          </div>
          <p className="text-white/45 max-w-sm">The commissioning operating system for electrical substations.</p>
        </div>
        {([
          ["Product", ["Features", "Mobile app", "Changelog"]],
          ["Company", ["About", "Contact", "Careers"]],
          ["Resources", ["Docs", "Status", "Security", "Trust"]],
        ] as [string, string[]][]).map(([h, ls]) => (
          <div key={h}>
            <div className="font-mono text-[10.5px] uppercase tracking-widest text-white/35 mb-3">{h}</div>
            <ul className="space-y-1.5">
              {ls.map((l) => (
                <li key={l}>
                  <a href={l === "Contact" ? "#cta" : "#"} className="hover:text-white">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </footer>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 font-mono text-[10.5px] text-white/35 pt-6 border-t border-white/5">
        <span>© 2026 TestFlow Systems</span>
        <span>Built for substation commissioning teams</span>
      </div>
    </div>
  </section>
);

/* ============================================================
   SCOPED STYLES
   ============================================================ */
const MarketingStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    .marketing-root {
      background: #07070c;
      color: #e8e9ee;
      font-family: 'Inter Tight', Inter, system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      scroll-behavior: smooth;
    }
    .marketing-root .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

    /* ── grids ── */
    .marketing-root .bg-grid {
      background-image:
        linear-gradient(rgba(139,92,246,.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59,130,246,.04) 1px, transparent 1px);
      background-size: 72px 72px;
    }
    .marketing-root .bg-grid-fine {
      background-image:
        linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
      background-size: 32px 32px;
    }
    .marketing-root .bg-dots {
      background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px);
      background-size: 22px 22px;
    }
    .marketing-root .bg-iso {
      background-image:
        linear-gradient(60deg, rgba(96,165,250,.05) 1px, transparent 1px),
        linear-gradient(-60deg, rgba(167,139,250,.05) 1px, transparent 1px);
      background-size: 56px 96px;
    }

    /* ── masks ── */
    .marketing-root .mask-fade-b { -webkit-mask-image: linear-gradient(to bottom, black 0%, black 60%, transparent 100%); mask-image: linear-gradient(to bottom, black 0%, black 60%, transparent 100%); }
    .marketing-root .mask-fade-t { -webkit-mask-image: linear-gradient(to top, black 0%, black 60%, transparent 100%); mask-image: linear-gradient(to top, black 0%, black 60%, transparent 100%); }
    .marketing-root .mask-fade-radial { -webkit-mask-image: radial-gradient(60% 60% at 50% 50%, black 0%, transparent 80%); mask-image: radial-gradient(60% 60% at 50% 50%, black 0%, transparent 80%); }

    /* ── ambient blobs ── */
    .marketing-root .orb-blue  { background: radial-gradient(circle, rgba(59,130,246,.25), rgba(59,130,246,0) 70%); }
    .marketing-root .orb-vio   { background: radial-gradient(circle, rgba(139,92,246,.25), rgba(139,92,246,0) 70%); }
    .marketing-root .orb-soft  { background: radial-gradient(circle, rgba(96,165,250,.10), rgba(255,255,255,0) 70%); }

    /* ── hero overlays ── */
    .marketing-root .substation-bg-soft {
      position: absolute; inset: 0;
      background-image: url('https://images.unsplash.com/photo-1693013112835-5f3128bb555f?w=2000&q=80&auto=format&fit=crop');
      background-size: cover;
      background-position: center 30%;
      opacity: .18;
      filter: saturate(.7);
      pointer-events: none;
    }
    .marketing-root .substation-bg-soft::after {
      content: "";
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(7,7,12,0) 0%, rgba(7,7,12,.5) 50%, rgba(7,7,12,.95) 100%);
    }
    .marketing-root .spotlight {
      background:
        radial-gradient(55% 50% at 15% 0%, rgba(59,130,246,.14), transparent 60%),
        radial-gradient(45% 45% at 85% 10%, rgba(139,92,246,.16), transparent 60%);
    }

    /* ── animations ── */
    @keyframes mk-spinSlow { to { transform: rotate(360deg); } }
    .marketing-root .spin-slow     { animation: mk-spinSlow 60s linear infinite; transform-origin: center; }
    .marketing-root .spin-slow-rev { animation: mk-spinSlow 90s linear infinite reverse; transform-origin: center; }

    @keyframes mk-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px,-14px); } }
    .marketing-root .drift { animation: mk-drift 16s ease-in-out infinite; }

    @keyframes mk-dashflow { to { stroke-dashoffset: -200; } }
    .marketing-root .dashflow { stroke-dasharray: 6 10; animation: mk-dashflow 9s linear infinite; }

    @keyframes mk-pulseDot { 0%,100% { opacity:.5; } 50% { opacity:1; } }
    .marketing-root .pulse-dot { animation: mk-pulseDot 2.4s ease-in-out infinite; }

    @keyframes mk-floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .marketing-root .floaty { animation: mk-floaty 6s ease-in-out infinite; }

    /* ── reveal on scroll ── */
    .marketing-root .reveal { opacity:0; transform:translateY(12px); transition: opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
    .marketing-root .reveal.in { opacity:1; transform:none; }

    /* ── typography ── */
    .marketing-root .grad-text {
      background: linear-gradient(90deg,#93c5fd 0%, #c4b5fd 70%);
      -webkit-background-clip:text; background-clip:text; color:transparent;
    }

    /* ── grad border ── */
    .marketing-root .grad-border { position:relative; }
    .marketing-root .grad-border::before {
      content:""; position:absolute; inset:0; padding:1px; border-radius:inherit;
      background: linear-gradient(135deg, rgba(96,165,250,.55), rgba(167,139,250,.45) 40%, rgba(255,255,255,.04) 80%);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude;
      pointer-events:none;
    }

    /* ── components ── */
    .marketing-root .btn-primary {
      background: linear-gradient(180deg, #3b82f6 0%, #2f6fdb 100%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 8px 30px -10px rgba(59,130,246,.5);
    }
    .marketing-root .btn-primary:hover { filter: brightness(1.08); }

    .marketing-root .chip { border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.02); }
    .marketing-root .navblur { backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); background:rgba(7,7,12,.65); border-bottom:1px solid rgba(255,255,255,.06); }

    /* ── FAQ accordion ── */
    .marketing-root details[open] .acc-icon { transform: rotate(45deg); }
    .marketing-root .acc-icon { transition: transform .2s ease; }
  `}</style>
);

/* ============================================================
   ROOT
   ============================================================ */
const Marketing = () => (
  <div className="marketing-root min-h-screen relative">
    <MarketingStyles />
    <Nav />
    <Hero />
    <Problem />
    <ProductSection />
    <WorkflowSection />
    <Equipment />
    <PricingSection />
    <RoiCalculatorSection />
    <Field />
    <Security />
    <FAQ />
    <FooterCTA />
  </div>
);

export default Marketing;
