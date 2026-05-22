import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  PlayCircle,
  Sparkles,
  Mail,
  Check,
  Tag,
  FileSpreadsheet,
  ShieldOff,
  Clock,
  Users,
  Library,
  GitBranch,
  Smartphone,
  ScrollText,
  Zap,
  Activity,
  Waves,
  Triangle,
  Power,
  ToggleRight,
  CircuitBoard,
  Anchor,
  Database,
  Key,
  Undo2,
  HardDrive,
  Lock,
  WifiOff,
  RefreshCcw,
  ChevronLeft,
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Cpu,
  FileText,
  CheckCircle2,
  RotateCcw,
  HardHat,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

/* ============== reveal-on-scroll ============== */
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

/* ============== NAV ============== */
const Nav = () => (
  <header className="sticky top-0 z-40 navblur">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <a href="#" className="flex items-center gap-2.5">
        <span className="relative w-7 h-7 rounded-md bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] grid place-items-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
            <path fill="currentColor" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
          </svg>
        </span>
        <span className="text-[17px] font-semibold tracking-tight">TestFlow</span>
        <span className="font-mono text-[10px] text-white/40 ml-1 mt-0.5 hidden sm:inline">v2.4</span>
      </a>
      <nav className="hidden md:flex items-center gap-7 text-sm text-white/70">
        <a href="#features" className="hover:text-white">Product</a>
        <a href="#workflow" className="hover:text-white">Workflow</a>
        <a href="#equipment" className="hover:text-white">Equipment</a>
        <a href="#security" className="hover:text-white">Security</a>
        <a href="#pricing" className="hover:text-white">Pricing</a>
        <a href="#faq" className="hover:text-white">FAQ</a>
      </nav>
      <div className="flex items-center gap-2.5">
        <a href="/auth" className="hidden sm:inline text-sm text-white/70 hover:text-white px-3 py-1.5">Sign in</a>
        <a href="#cta" className="btn-primary text-sm font-medium px-3.5 py-2 rounded-md text-white">Start free trial</a>
      </div>
    </div>
  </header>
);

/* ============== HERO dashboard mock ============== */
const HeroDashboard = () => {
  const sidebarItems: [LucideIcon, string, boolean][] = [
    [LayoutDashboard, "Dashboard", false],
    [FolderKanban, "Projects", true],
    [ClipboardCheck, "Test queue", false],
    [Cpu, "Equipment", false],
    [Users, "Team", false],
    [FileText, "Reports", false],
  ];
  const stats: [string, string, string, LucideIcon][] = [
    ["Equipment", "37", "+5 today", Cpu],
    ["Tests done", "148", "of 238", CheckCircle2],
    ["In rework", "06", "−2 from yest.", RotateCcw],
    ["Engineers", "12", "8 on-site", HardHat],
  ];
  const rows = [
    { id: "PTR-003", name: "Power Transformer #3 · Winding resistance", eng: "R. Anand", status: "review" },
    { id: "CT-014", name: "Current Transformer · Ratio & polarity", eng: "S. Kapoor", status: "pass" },
    { id: "VCB-007", name: "VCB · Contact resistance (µΩ)", eng: "M. Iqbal", status: "rework" },
    { id: "LA-002", name: "Lightning Arrester · Insulation resistance", eng: "P. Joshi", status: "pass" },
    { id: "SF6-001", name: "SF6 Breaker · Timing test", eng: "A. Verma", status: "draft" },
  ];
  return (
    <div className="relative w-full">
      <div className="relative rounded-2xl grad-border bg-[#131320]/80 backdrop-blur-xl shadow-[0_50px_120px_-30px_rgba(59,130,246,.35)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
          </div>
          <div className="font-mono text-[11px] text-white/40 tracking-wide hidden sm:block">acme-power.testflow.io / projects / SS-NEELDIH-400KV</div>
          <div className="flex items-center gap-1 text-[10px] text-white/40 font-mono">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-dot" /> LIVE
          </div>
        </div>

        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-3 hidden md:block border-r border-white/5 p-4 space-y-1.5">
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
                <div className="font-mono text-[10px] text-white/40">SS-NEELDIH-400KV</div>
                <div className="text-[12.5px] font-medium leading-snug">Neeldih 400 / 220 kV<br />GIS Substation</div>
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
                <div className="font-mono text-[10px] text-white/40 tracking-widest">PROJECT / ACTIVE</div>
                <h3 className="text-xl md:text-2xl font-semibold tracking-tight mt-0.5">Neeldih 400 / 220 kV Substation</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="chip rounded-md px-2 py-1 text-[10.5px] font-mono text-white/60">PHASE 2 — ENERGIZATION</span>
                <span className="chip rounded-md px-2 py-1 text-[10.5px] font-mono text-emerald-300/90 border-emerald-400/20">ON SCHEDULE</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {stats.map(([l, v, sub, I]) => (
                <div key={l} className="rounded-lg bg-[#0f0f17] border border-white/5 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{l}</span>
                    <I className="w-3.5 h-3.5 text-white/40" strokeWidth={1.6} />
                  </div>
                  <div className="text-[22px] font-semibold tracking-tight tabular-nums">{v}</div>
                  <div className="font-mono text-[10px] text-white/40">{sub}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-white/5 overflow-hidden bg-[#0f0f17]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-[12px] text-white/70">
                  <ListChecks className="w-3.5 h-3.5 text-white/50" strokeWidth={1.6} /> Active test queue
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-white/40">
                  <span className="chip rounded px-1.5 py-0.5">FILTER: AWAITING REVIEW</span>
                </div>
              </div>
              <div className="divide-y divide-white/5 text-[12.5px]">
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 items-center px-3 py-2.5 hover:bg-white/[.02]">
                    <div className="col-span-3 font-mono text-[11px] text-white/60">{r.id}</div>
                    <div className="col-span-5 text-white/90 truncate">{r.name}</div>
                    <div className="col-span-2 text-white/55 truncate">{r.eng}</div>
                    <div className="col-span-2 text-right">
                      {r.status === "review" && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded chip border-amber-400/25 text-amber-300/90">AWAITING</span>}
                      {r.status === "pass" && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded chip border-emerald-400/25 text-emerald-300/90">PASS</span>}
                      {r.status === "rework" && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded chip border-rose-400/25 text-rose-300/90">REWORK</span>}
                      {r.status === "draft" && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded chip text-white/50">DRAFT</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute -left-10 top-24 w-[230px] rounded-xl bg-[#131320]/95 border border-white/10 p-3 backdrop-blur shadow-2xl floaty">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-md bg-[#8b5cf6]/15 grid place-items-center text-[#a78bfa]"><Sparkles className="w-3.5 h-3.5" strokeWidth={1.6} /></span>
          <div>
            <div className="text-[12px] font-medium">Report generated</div>
            <div className="font-mono text-[10px] text-white/45">SS-NEELDIH · 4.2 MB · PDF + XLSX</div>
          </div>
        </div>
        <div className="font-mono text-[10px] text-white/50 leading-relaxed">Claude · 12.4s · 238 tests · 37 equipment instances</div>
      </div>
      <div className="hidden lg:block absolute -right-6 bottom-20 w-[230px] rounded-xl bg-[#131320]/95 border border-white/10 p-3 backdrop-blur shadow-2xl floaty" style={{ animationDelay: "1.5s" }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="font-mono text-[10px] text-white/45">PTR-003 / TR-WR-Y2</div>
          <span className="font-mono text-[10px] text-emerald-300">APPROVED</span>
        </div>
        <div className="text-[12.5px] font-medium leading-snug">Winding resistance — Y phase 2</div>
        <div className="grid grid-cols-3 gap-1.5 mt-2 font-mono text-[10.5px]">
          <div className="rounded bg-white/[.04] p-1.5"><div className="text-white/40">R</div><div>0.182 Ω</div></div>
          <div className="rounded bg-white/[.04] p-1.5"><div className="text-white/40">Y</div><div>0.181 Ω</div></div>
          <div className="rounded bg-white/[.04] p-1.5"><div className="text-white/40">B</div><div>0.183 Ω</div></div>
        </div>
      </div>
    </div>
  );
};

const Hero = () => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0 bg-grid" />
    <div className="absolute inset-0 spotlight pointer-events-none" />
    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 900">
      <defs>
        <linearGradient id="trace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="0.5" stopColor="#3b82f6" stopOpacity=".55" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,160 L320,160 L360,200 L720,200 L760,160 L1100,160 L1140,200 L1440,200" fill="none" stroke="url(#trace)" strokeWidth="1.2" className="dashflow" />
      <path d="M0,740 L260,740 L300,700 L640,700 L680,740 L1040,740 L1080,700 L1440,700" fill="none" stroke="url(#trace)" strokeWidth="1.2" className="dashflow" style={{ animationDelay: "-2s" }} />
      <circle cx="360" cy="200" r="3" fill="#60a5fa" className="pulse-dot" />
      <circle cx="1140" cy="200" r="3" fill="#a78bfa" className="pulse-dot" />
      <circle cx="680" cy="740" r="3" fill="#60a5fa" className="pulse-dot" />
    </svg>

    <div className="relative max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-24">
      <Reveal>
        <div className="inline-flex items-center gap-2 chip rounded-full pl-2 pr-3 py-1 text-[11.5px] font-mono text-white/70">
          <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-[10px]">NEW</span>
          AI-generated handover reports — one click on project close
        </div>
      </Reveal>

      <Reveal delay={80}>
        <h1 className="mt-6 text-[44px] sm:text-6xl md:text-[78px] leading-[1.02] font-semibold tracking-[-0.03em] max-w-5xl">
          Commission substations <span className="grad-text">10× faster</span>.<br />
          Without the Excel, paper, or WhatsApp.
        </h1>
      </Reveal>

      <Reveal delay={160}>
        <p className="mt-6 max-w-2xl text-[17px] md:text-[19px] leading-relaxed text-white/65">
          TestFlow is the role-based operating system for substation commissioning. Scope projects, run pre-built test templates in the field, approve from your desk, and ship the final report the day you close — instead of the month after.
        </p>
      </Reveal>

      <Reveal delay={240}>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#cta" className="btn-primary inline-flex items-center gap-2 text-[15px] font-medium px-5 py-3 rounded-lg text-white">
            Start free trial <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
          </a>
          <a href="#features" className="inline-flex items-center gap-2 text-[15px] font-medium px-5 py-3 rounded-lg border border-white/[.12] text-white hover:bg-white/[.04]">
            <PlayCircle className="w-4 h-4" strokeWidth={1.6} /> Book a demo
          </a>
          <span className="font-mono text-[11px] text-white/45 ml-1">14-day trial · no card · unlimited users</span>
        </div>
      </Reveal>

      <Reveal delay={320} className="mt-14 md:mt-20">
        <HeroDashboard />
      </Reveal>
    </div>
  </section>
);

/* ============== PROBLEM ============== */
const Problem = () => {
  const items: { icon: LucideIcon; t: string; d: string; stamp: string }[] = [
    {
      icon: FileSpreadsheet,
      t: "Test sheets that vanish",
      d: "The Y-phase ratio test for transformer #3 is on someone's laptop in a hotel in Raipur. Or it's not. You'll find out at handover.",
      stamp: "EXCEL.XLSX · v17_final_FINAL",
    },
    {
      icon: ShieldOff,
      t: "An audit trail nobody trusts",
      d: "Who changed the tap setting? When? On whose authority? The WhatsApp group is 4,200 messages deep and the answer isn't in there.",
      stamp: "AUDIT · WHO_KNOWS",
    },
    {
      icon: Clock,
      t: "Handover reports that miss deadlines",
      d: "Three engineers, two weeks, one cursed Word template. The utility wants the report on Monday. They got it on the 28th of next month.",
      stamp: "REPORT · DUE −34 DAYS",
    },
  ];
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">The problem</div>
              <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight max-w-2xl">Commissioning isn't broken because engineers are slow.</h2>
            </div>
            <p className="text-white/55 max-w-md text-[15.5px]">It's broken because the tooling stopped at a shared drive and a group chat. We rebuilt the workflow around the people doing the work.</p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {items.map((it, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="group relative rounded-xl border border-white/[.08] bg-[#131320]/60 p-6 h-full overflow-hidden hover:border-white/15 transition">
                <div className="absolute inset-0 bg-grid-fine opacity-60 [mask-image:radial-gradient(circle_at_top_right,black,transparent_70%)]" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-300 grid place-items-center mb-5 border border-rose-400/20">
                    <it.icon className="w-5 h-5" strokeWidth={1.6} />
                  </div>
                  <h3 className="text-[19px] font-semibold tracking-tight">{it.t}</h3>
                  <p className="mt-2 text-white/55 text-[14.5px] leading-relaxed">{it.d}</p>
                  <div className="mt-6 inline-flex items-center gap-1.5 font-mono text-[10.5px] text-white/35">
                    <Tag className="w-3 h-3" strokeWidth={1.6} /> {it.stamp}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============== FEATURES ============== */
const Features = () => {
  const items: { icon: LucideIcon; t: string; a: "ele" | "vio"; d: string; foot: string; span?: string }[] = [
    {
      icon: Users, t: "Multi-role workflow", a: "ele",
      d: "Four roles — Superadmin, GM, Supervisor, Engineer — each with permissions and a dashboard tuned for what they actually do.",
      foot: "Roles: SUPERADMIN · GM · SUP · ENG",
      span: "md:col-span-2",
    },
    {
      icon: Library, t: "46 test templates", a: "vio",
      d: "Pre-built dynamic forms across 8 equipment types — ratio, IR, polarity, contact resistance, SF6 timing, the lot. Engineers fill, supervisors approve.",
      foot: "8 equipment · 46 tests",
    },
    {
      icon: GitBranch, t: "Lifecycle automation", a: "ele",
      d: '"5 transformers" becomes PTR-001 through PTR-005, each pre-loaded with the right tasks. DRAFT → APPROVED → ACTIVE → CLOSED.',
      foot: "AUTO-GENERATED · 4 STATES",
    },
    {
      icon: Smartphone, t: "Offline-aware mobile app", a: "vio",
      d: "Engineers run tests on iOS / Android in switchyards with no signal. Auto-save drafts, submit when the radio comes back.",
      foot: "EXPO · iOS · ANDROID",
      span: "md:col-span-2",
    },
    {
      icon: Sparkles, t: "AI handover reports", a: "ele",
      d: "Close a project, click once: Claude writes the polished commissioning report. Markdown, PDF, and an Excel file with one sheet per equipment.",
      foot: "MD · PDF · XLSX",
    },
    {
      icon: ScrollText, t: "Audit trail by default", a: "vio",
      d: "Every field change logged at the database. Soft-deletes, restores, and a Superadmin viewer that lets you answer who-changed-what in seconds.",
      foot: "SOC2-FRIENDLY · DB-LEVEL",
    },
  ];
  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="relative max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Platform</div>
          <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl">Everything a commissioning team needs. Nothing it doesn't.</h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4 mt-12 auto-rows-fr">
          {items.map((it, i) => (
            <Reveal key={i} delay={i * 60} className={it.span || ""}>
              <div className="group relative h-full rounded-xl border border-white/[.08] bg-[#131320]/60 p-6 hover:border-white/15 hover:bg-[#131320]/80 transition overflow-hidden">
                <div className={`absolute -top-20 -right-20 w-60 h-60 rounded-full ${it.a === "ele" ? "bg-[#3b82f6]/10" : "bg-[#8b5cf6]/10"} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                <div className="relative">
                  <div className={`w-10 h-10 rounded-lg grid place-items-center mb-5 border ${it.a === "ele" ? "bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/25" : "bg-[#8b5cf6]/10 text-[#a78bfa] border-[#8b5cf6]/25"}`}>
                    <it.icon className="w-5 h-5" strokeWidth={1.6} />
                  </div>
                  <h3 className="text-[19px] font-semibold tracking-tight">{it.t}</h3>
                  <p className="mt-2 text-white/55 text-[14.5px] leading-relaxed">{it.d}</p>
                  <div className="mt-6 pt-4 border-t border-white/5 font-mono text-[10.5px] text-white/40 tracking-wider">{it.foot}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============== WORKFLOW STEPPER ============== */
const WorkflowSection = () => {
  const steps = [
    { k: "DRAFT", t: "Scope the project", role: "GM", roleCls: "b-gm", d: "Define equipment counts, ratings, and target dates. Generate the work breakdown without typing a single equipment ID." },
    { k: "APPROVED", t: "Lock the scope", role: "SUPERADMIN", roleCls: "b-admin", d: "Superadmin signs off. Equipment instances and test tasks fan out automatically. Nothing's editable upstream now." },
    { k: "ACTIVE", t: "Run tests in the field", role: "ENGINEER · SUPERVISOR", roleCls: "b-eng", d: "Engineers execute on mobile, supervisors approve or send back for rework. Real-time across every dashboard." },
    { k: "CLOSED", t: "Generate handover", role: "GM", roleCls: "b-gm", d: "One click. Claude writes the report. PDF, Markdown, and per-equipment Excel sheets land in your inbox." },
  ];
  return (
    <section id="workflow" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Lifecycle</div>
          <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl">One project. Four states. Zero ambiguity about who's holding the ball.</h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-14 rounded-2xl border border-white/[.08] bg-[#131320]/50 p-6 md:p-10 overflow-hidden">
            <div className="absolute inset-0 bg-grid-fine opacity-40" />
            <div className="relative">
              <div className="absolute left-5 right-5 top-[42px] hidden md:block">
                <div className="track-x" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
                {steps.map((s, i) => (
                  <div key={i} className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full grid place-items-center font-mono text-[11px] font-semibold tracking-wider ${
                        i === 0 ? "bg-white/[.08] text-white/70 border border-white/15" :
                        i === 1 ? "bg-[#8b5cf6]/15 text-[#c4b5fd] border border-[#8b5cf6]/30 glow-vio" :
                        i === 2 ? "bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/30 glow-blue" :
                                  "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      }`}>0{i + 1}</div>
                      <div>
                        <div className={`font-mono text-[11px] tracking-widest ${i === 0 ? "text-white/50" : i === 1 ? "text-[#c4b5fd]" : i === 2 ? "text-[#60a5fa]" : "text-emerald-300"}`}>{s.k}</div>
                        <div className="text-[16px] font-semibold tracking-tight leading-tight">{s.t}</div>
                      </div>
                    </div>
                    <p className="text-white/55 text-[13.5px] leading-relaxed mb-3">{s.d}</p>
                    <span className={`inline-block chip ${s.roleCls} rounded font-mono text-[10px] px-1.5 py-0.5`}>{s.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ============== EQUIPMENT ============== */
const Equipment = () => {
  const items: [string, string, number, LucideIcon][] = [
    ["Power Transformers", "PTR", 13, Zap],
    ["Current Transformers", "CT", 6, Activity],
    ["Capacitive Voltage Transformers", "CVT", 6, Waves],
    ["Lightning Arresters", "LA", 4, Triangle],
    ["SF6 Circuit Breakers", "SF6", 7, Power],
    ["Isolators", "ISO", 3, ToggleRight],
    ["Vacuum Circuit Breakers", "VCB", 6, CircuitBoard],
    ["Earth Pits", "EP", 1, Anchor],
  ];
  return (
    <section id="equipment" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Coverage</div>
              <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl">8 equipment types. 46 tests. The exact ones your engineers already run.</h2>
            </div>
            <div className="font-mono text-[11px] text-white/45">IS · IEC · IEEE conformant</div>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map(([name, code, count, I], i) => (
            <Reveal key={code} delay={i * 40}>
              <div className="group relative rounded-xl border border-white/[.08] bg-[#131320]/60 p-5 hover:border-white/20 hover:-translate-y-0.5 transition">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3b82f6]/15 to-[#8b5cf6]/15 border border-white/[.08] grid place-items-center text-[#60a5fa]">
                    <I className="w-5 h-5" strokeWidth={1.6} />
                  </div>
                  <span className="font-mono text-[10px] text-white/40">{code}</span>
                </div>
                <div className="mt-5 text-[15.5px] font-medium leading-tight tracking-tight">{name}</div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tabular-nums">{count}</span>
                  <span className="font-mono text-[10.5px] text-white/45">test templates</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={300}>
          <div className="mt-6 text-center font-mono text-[11px] text-white/40">
            Need a custom equipment class or test sequence? Superadmins can add them.
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ============== MOBILE ============== */
const PhoneFrame = ({ children, label }: { children: ReactNode; label: string }) => (
  <div className="relative">
    <div className="relative w-[260px] mx-auto">
      <div className="rounded-[42px] bg-gradient-to-b from-white/10 to-white/[.03] p-[3px] shadow-2xl">
        <div className="rounded-[39px] bg-[#07070c] overflow-hidden relative h-[540px]">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20" />
          <div className="absolute inset-0 pt-7 pb-2 px-3 nb overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
    <div className="mt-4 text-center font-mono text-[10.5px] text-white/40 tracking-widest">{label}</div>
  </div>
);

const PhoneA = () => (
  <div className="h-full flex flex-col">
    <div className="flex items-center justify-between mb-3 px-1">
      <div>
        <div className="font-mono text-[9px] text-white/45 uppercase tracking-widest">Engineer</div>
        <div className="text-[15px] font-semibold tracking-tight">My projects</div>
      </div>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] grid place-items-center text-[10.5px] font-semibold">RA</div>
    </div>
    <div className="space-y-2">
      {([
        ["Neeldih 400 kV", "12 tasks", "ele", true],
        ["Barhi 220 kV", "4 tasks", "vio", false],
        ["Chandwa Lite-up", "1 task", "emerald", false],
      ] as const).map(([n, t, c, active], i) => (
        <div key={i} className={`rounded-xl border p-3 ${active ? "border-[#3b82f6]/40 bg-[#3b82f6]/5" : "border-white/[.08] bg-white/[.03]"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium">{n}</span>
            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${c === "ele" ? "bg-[#3b82f6]/15 text-[#60a5fa]" : c === "vio" ? "bg-[#8b5cf6]/15 text-[#c4b5fd]" : "bg-emerald-500/15 text-emerald-300"}`}>ACTIVE</span>
          </div>
          <div className="mt-1 font-mono text-[9.5px] text-white/50">{t} · today</div>
          <div className="mt-2 h-1 bg-white/5 rounded">
            <div className={`h-full rounded ${i === 0 ? "w-[42%]" : i === 1 ? "w-[18%]" : "w-[80%]"} bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]`} />
          </div>
        </div>
      ))}
    </div>
    <div className="mt-auto pt-3">
      <div className="rounded-xl bg-white/[.03] border border-white/[.06] p-2.5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-emerald-500/15 grid place-items-center text-emerald-300"><WifiOff className="w-3.5 h-3.5" strokeWidth={1.6} /></div>
        <div>
          <div className="text-[11px] font-medium">3 drafts saved offline</div>
          <div className="font-mono text-[9px] text-white/45">Auto-sync when connected</div>
        </div>
      </div>
    </div>
  </div>
);

const PhoneB = () => (
  <div className="h-full flex flex-col text-[11px]">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-6 h-6 rounded-md bg-white/5 grid place-items-center"><ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.6} /></div>
      <div className="flex-1">
        <div className="font-mono text-[8.5px] text-white/45 uppercase">PTR-003 / Winding resistance</div>
        <div className="text-[13px] font-semibold tracking-tight">Test form — TR-WR-Y2</div>
      </div>
    </div>
    <div className="rounded-lg bg-white/[.03] border border-white/[.08] px-2.5 py-2 mb-2">
      <div className="font-mono text-[9px] text-white/45 mb-1">NAMEPLATE</div>
      <div className="grid grid-cols-2 gap-y-1 font-mono text-[9.5px]">
        <span className="text-white/45">MVA</span><span>50/63</span>
        <span className="text-white/45">Vector</span><span>YNyn0</span>
        <span className="text-white/45">Tap range</span><span>±10%</span>
      </div>
    </div>
    {([
      ["R phase (Ω)", "0.182"],
      ["Y phase (Ω)", "0.181"],
      ["B phase (Ω)", ""],
      ["Oil temp (°C)", "42"],
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

const PhoneC = () => (
  <div className="h-full flex flex-col items-center justify-center text-center px-2">
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3b82f6]/30 to-[#8b5cf6]/30 border border-[#3b82f6]/40 grid place-items-center mb-4">
      <Check className="w-7 h-7 text-emerald-300" strokeWidth={2} />
    </div>
    <div className="text-[14px] font-semibold tracking-tight leading-tight">Submitted for review</div>
    <div className="mt-1.5 font-mono text-[10px] text-white/50">PTR-003 · 14:32 IST</div>
    <div className="mt-5 w-full rounded-lg bg-white/[.03] border border-white/[.08] p-3 text-left">
      <div className="font-mono text-[9px] text-white/45 mb-1.5">AWAITING REVIEW</div>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[#8b5cf6]/20 grid place-items-center text-[10.5px] font-semibold">SK</div>
        <div>
          <div className="text-[12px] font-medium">S. Kapoor</div>
          <div className="font-mono text-[9px] text-white/45">Supervisor · Zone B</div>
        </div>
      </div>
    </div>
    <div className="mt-3 font-mono text-[9.5px] text-white/40">Next: LA-002 · Insulation resistance</div>
  </div>
);

const MobileSection = () => (
  <section className="relative py-24 md:py-32 overflow-hidden">
    <div className="absolute inset-0 bg-grid opacity-40" />
    <div className="absolute -left-20 top-1/3 w-[420px] h-[420px] bg-[#3b82f6]/15 blur-[120px] rounded-full pointer-events-none" />
    <div className="absolute -right-10 bottom-1/4 w-[360px] h-[360px] bg-[#8b5cf6]/15 blur-[120px] rounded-full pointer-events-none" />

    <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-10 items-center">
      <Reveal className="lg:col-span-4">
        <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Mobile</div>
        <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">Built for switchyards. Not boardrooms.</h2>
        <p className="mt-5 text-white/60 text-[15.5px] leading-relaxed">
          The engineer's app is the product. Offline-aware auto-save, large hit targets for gloved hands, and a submit screen that closes the loop with the supervisor — no "did you get my message?" texts.
        </p>
        <div className="mt-7 space-y-3">
          {([
            [WifiOff, "Offline-aware", "Drafts persist for days. Sync on reconnect."],
            [Smartphone, "iOS & Android", "One Expo codebase, native everywhere."],
            [RefreshCcw, "Real-time sync", "Supervisor approves → engineer sees it."],
          ] as [LucideIcon, string, string][]).map(([I, t, d]) => (
            <div key={t} className="flex gap-3">
              <div className="w-8 h-8 rounded-md bg-white/[.04] border border-white/[.08] grid place-items-center text-white/70 shrink-0"><I className="w-4 h-4" strokeWidth={1.6} /></div>
              <div>
                <div className="text-[14px] font-medium">{t}</div>
                <div className="text-white/50 text-[13px]">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={120} className="lg:col-span-8">
        <div className="grid grid-cols-3 gap-3 md:gap-6 items-end">
          <div className="floaty"><PhoneFrame label="01 · MY PROJECTS"><PhoneA /></PhoneFrame></div>
          <div className="floaty" style={{ animationDelay: "1s" }}><PhoneFrame label="02 · DYNAMIC FORM"><PhoneB /></PhoneFrame></div>
          <div className="floaty" style={{ animationDelay: "2s" }}><PhoneFrame label="03 · SUBMITTED"><PhoneC /></PhoneFrame></div>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ============== SECURITY ============== */
const Security = () => {
  const items: [LucideIcon, string, string, string][] = [
    [Database, "Postgres RLS isolation", "Tenant boundary enforced at the row level. App bugs can't leak data across customers.", "WHERE company_id = my_company_id()"],
    [ScrollText, "Database-level audit", "Every change captured by Postgres triggers, not the API. Includes who, when, before, after.", "audit_logs · trigger-driven"],
    [Key, "Role-based access", "Four roles, granular permissions. Engineers can't approve their own tests.", "RBAC · least-privilege"],
    [Undo2, "Soft-delete recovery", "Deletes are tombstoned. Restore from the Superadmin viewer in two clicks.", "deleted_at · restore RPC"],
    [HardDrive, "Nightly encrypted backups", "Point-in-time recovery up to 14 days. AES-256 at rest, TLS 1.3 in transit.", "14d PITR"],
    [Lock, "Password & session policy", "10+ chars, upper/lower/digit, 30-min idle timeout, rate-limited admin endpoints.", "SSO on roadmap"],
  ];
  return (
    <section id="security" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Security & compliance</div>
              <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight max-w-2xl">Built like the auditors are already inside the room.</h2>
            </div>
            <p className="text-white/55 max-w-sm text-[14.5px]">Because eventually they will be. SOC2 controls baked into the schema, not bolted on for the assessment.</p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-3 mt-12">
          {items.map(([I, t, d, code], i) => (
            <Reveal key={t} delay={i * 50}>
              <div className="rounded-xl border border-white/[.08] bg-[#131320]/60 p-5 h-full hover:border-white/15 transition">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-md bg-white/[.04] border border-white/[.08] grid place-items-center text-[#60a5fa]">
                    <I className="w-4 h-4" strokeWidth={1.6} />
                  </div>
                  <div className="text-[15px] font-medium tracking-tight">{t}</div>
                </div>
                <p className="text-white/55 text-[13.5px] leading-relaxed">{d}</p>
                <div className="mt-4 font-mono text-[10.5px] text-white/40 bg-[#07070c]/70 border border-white/5 rounded px-2 py-1.5 inline-block">{code}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============== PRICING ============== */
const Pricing = () => (
  <section id="pricing" className="relative py-24 md:py-32">
    <div className="max-w-5xl mx-auto px-6">
      <Reveal>
        <div className="relative rounded-2xl grad-border bg-[#131320]/70 p-8 md:p-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-fine opacity-50" />
          <div className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full bg-[#8b5cf6]/[.12] blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Pricing</div>
              <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">Per-engineer. Predictable.</h2>
              <p className="mt-4 text-white/55 text-[15px] leading-relaxed max-w-md">
                One number, scales with your team. Reports, AI, mobile, storage, audit — all in. No "Enterprise contact us" theatre below 500 engineers.
              </p>
              <ul className="mt-6 space-y-2 text-[14px]">
                {[
                  "Unlimited projects & equipment",
                  "Unlimited test runs and reports",
                  "Mobile app for every engineer",
                  "AI report generation included",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-white/70"><Check className="w-4 h-4 text-emerald-400" strokeWidth={2} />{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0a0a0f]/70 p-6">
              <div className="font-mono text-[10.5px] uppercase tracking-widest text-white/40">Standard</div>
              <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                <span className="text-5xl font-semibold tracking-tight">₹1,499</span>
                <span className="text-white/50 text-[13px] whitespace-nowrap">/ engineer / month</span>
              </div>
              <div className="font-mono text-[11px] text-white/45 mt-1">Billed annually · 20% off vs. monthly</div>

              <a href="#cta" className="mt-6 btn-primary inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg text-white font-medium whitespace-nowrap">
                Start free trial <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
              </a>
              <div className="mt-3 text-center font-mono text-[10.5px] text-white/40">No card · Unlimited users during trial</div>

              <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
                {([
                  ["5–25", "Team"],
                  ["25–100", "Growth"],
                  ["100+", "Enterprise"],
                ] as const).map(([r, l]) => (
                  <div key={l}>
                    <div className="font-mono text-[10px] text-white/40">{r}</div>
                    <div className="text-[12.5px] font-medium">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ============== FAQ ============== */
const FAQ = () => {
  const faqs: [string, string][] = [
    ["How long does onboarding take?",
      "Most teams are running a live project inside 48 hours. Scope a fresh project from the GM dashboard — equipment instances generate themselves from your counts."],
    ["Can I export my data if I leave?",
      "Yes. Every project supports full export to Excel (per-equipment sheets) and PDF reports. No lock-in by design."],
    ["Does the mobile app really work offline?",
      "Yes — engineers can draft tests for days without signal. Drafts live on-device and sync as soon as the network returns."],
    ["How is tenant data isolated?",
      "Postgres Row-Level Security is enforced on every table. Each query is bound to a tenant context via my_company_id(). App-level bugs can't leak data across tenants."],
    ["Can we add custom equipment types or tests?",
      "Yes. Superadmins can define new equipment classes, test templates, and required fields. Templates are versioned per project."],
    ["What's the support SLA?",
      "Standard: business-hours email, 1-business-day response. Growth: 4-hour business-hours response + shared Slack channel. Enterprise: 24×7 phone, named CSM, 1-hour P1."],
  ];
  return (
    <section id="faq" className="relative py-24 md:py-32">
      <div className="max-w-4xl mx-auto px-6">
        <Reveal>
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/40 text-center">FAQ</div>
          <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight text-center">Things commissioning managers ask first.</h2>
        </Reveal>

        <div className="mt-12 space-y-2">
          {faqs.map(([q, a], i) => (
            <Reveal key={i} delay={i * 40}>
              <details className="group rounded-xl border border-white/[.08] bg-[#131320]/50 hover:bg-[#131320]/70 open:bg-[#131320]/80 transition">
                <summary className="list-none cursor-pointer flex items-center gap-4 px-5 py-4">
                  <span className="font-mono text-[11px] text-white/35 w-8">0{i + 1}</span>
                  <span className="text-[15.5px] font-medium tracking-tight flex-1">{q}</span>
                  <span className="acc-icon text-white/60 text-xl leading-none">+</span>
                </summary>
                <div className="px-5 pb-5 pl-[60px] text-white/60 text-[14.5px] leading-relaxed">{a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============== FOOTER CTA ============== */
const FooterCTA = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <section id="cta" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative rounded-3xl overflow-hidden p-10 md:p-16">
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1a1d4e 0%, #1c0f3a 60%, #0a0a0f 100%)" }} />
          <div className="absolute inset-0 bg-grid opacity-60" />
          <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-[#3b82f6]/30 blur-[140px]" />
          <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full bg-[#8b5cf6]/30 blur-[140px]" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none">
            <path d="M0,300 L300,300 L340,260 L860,260 L900,300 L1200,300" stroke="rgba(167,139,250,.4)" strokeWidth="1" fill="none" className="dashflow" />
            <circle cx="340" cy="260" r="4" fill="#60a5fa" className="pulse-dot" />
            <circle cx="900" cy="300" r="4" fill="#a78bfa" className="pulse-dot" />
          </svg>

          <div className="relative max-w-3xl">
            <div className="font-mono text-[11px] uppercase tracking-widest text-white/50">Final word</div>
            <h2 className="mt-3 text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.05]">
              Stop chasing test sheets.<br />
              <span className="grad-text">Start shipping commissioning reports.</span>
            </h2>
            <p className="mt-5 text-white/65 text-[16px] max-w-xl">Drop your work email. We'll spin up a tenant at <span className="font-mono text-white/85">yourcompany.testflow.io</span> in under 60 seconds.</p>

            <form
              onSubmit={(e) => { e.preventDefault(); if (email) setSubmitted(true); }}
              className="mt-7 flex flex-col sm:flex-row gap-3 max-w-xl">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" strokeWidth={1.6} />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourcompany.com"
                  className="w-full bg-white/5 backdrop-blur border border-white/15 rounded-lg pl-10 pr-3 py-3.5 text-[15px] placeholder-white/35 focus:outline-none focus:border-[#60a5fa] focus:bg-white/[.08]"
                />
              </div>
              <button type="submit" className="btn-primary px-5 py-3.5 rounded-lg text-white font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap">
                {submitted ? (<><Check className="w-4 h-4" strokeWidth={2} /> Check your inbox</>) : (<>Start free trial <ArrowRight className="w-4 h-4" strokeWidth={1.8} /></>)}
              </button>
            </form>
            <div className="mt-4 font-mono text-[11px] text-white/45">14-day trial · no card · unlimited users during trial</div>
          </div>
        </div>

        <footer className="mt-16 grid md:grid-cols-5 gap-8 text-[13.5px] text-white/55">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 rounded-md bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] grid place-items-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white"><path fill="currentColor" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>
              </span>
              <span className="font-semibold text-white">TestFlow</span>
            </div>
            <p className="text-white/45 max-w-sm">The commissioning operating system. Built by engineers who got tired of chasing Excel files in WhatsApp groups.</p>
          </div>
          {([
            ["Product", ["Features", "Mobile app", "Pricing", "Security"]],
            ["Company", ["About", "Contact"]],
            ["Resources", ["Docs", "Equipment library", "Status"]],
          ] as const).map(([h, ls]) => (
            <div key={h}>
              <div className="font-mono text-[10.5px] uppercase tracking-widest text-white/35 mb-3">{h}</div>
              <ul className="space-y-1.5">{ls.map((l) => <li key={l}><a href="#" className="hover:text-white">{l}</a></li>)}</ul>
            </div>
          ))}
        </footer>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 font-mono text-[10.5px] text-white/35 pt-6 border-t border-white/5">
          <span>© 2026 Optimus Testing · Bengaluru, IN</span>
          <span>SOC2 controls in place · DPDP compliant</span>
        </div>
      </div>
    </section>
  );
};

/* ============== STYLES (scoped to marketing page) ============== */
const MarketingStyles = () => (
  <style>{`
    .marketing-root { background: #07070c; color: #e8e9ee; font-family: 'Inter Tight', Inter, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    .marketing-root .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

    .marketing-root .bg-grid {
      background-image:
        linear-gradient(rgba(139, 92, 246, .045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59,130,246,.045) 1px, transparent 1px);
      background-size: 64px 64px;
      background-position: -1px -1px;
    }
    .marketing-root .bg-grid-fine {
      background-image:
        linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
      background-size: 32px 32px;
    }
    .marketing-root .spotlight {
      background:
        radial-gradient(60% 50% at 20% 0%, rgba(59,130,246,.18), transparent 60%),
        radial-gradient(50% 50% at 85% 15%, rgba(139,92,246,.20), transparent 60%),
        radial-gradient(80% 60% at 50% 100%, rgba(59,130,246,.07), transparent 70%);
    }
    .marketing-root .glow-blue { box-shadow: 0 0 0 1px rgba(59,130,246,.25), 0 20px 60px -20px rgba(59,130,246,.45); }
    .marketing-root .glow-vio  { box-shadow: 0 0 0 1px rgba(139,92,246,.30), 0 20px 60px -20px rgba(139,92,246,.45); }
    .marketing-root .grad-text {
      background: linear-gradient(90deg, #60a5fa 0%, #a78bfa 60%, #c4b5fd 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .marketing-root .grad-border { position: relative; }
    .marketing-root .grad-border::before {
      content: ""; position: absolute; inset: 0; padding: 1px; border-radius: inherit;
      background: linear-gradient(135deg, rgba(96,165,250,.7), rgba(167,139,250,.6) 40%, rgba(255,255,255,.05) 80%);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude;
      pointer-events: none;
    }
    .marketing-root .reveal { opacity: 0; transform: translateY(14px); transition: opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
    .marketing-root .reveal.in { opacity: 1; transform: none; }
    @keyframes mk-dashflow { to { stroke-dashoffset: -200; } }
    .marketing-root .dashflow { stroke-dasharray: 6 10; animation: mk-dashflow 8s linear infinite; }
    @keyframes mk-pulseDot { 0%,100% { opacity: .4; transform: scale(1);} 50% { opacity: 1; transform: scale(1.3);} }
    .marketing-root .pulse-dot { animation: mk-pulseDot 2.4s ease-in-out infinite; }
    @keyframes mk-floaty { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-8px);} }
    .marketing-root .floaty { animation: mk-floaty 6s ease-in-out infinite; }
    .marketing-root .nb::-webkit-scrollbar { display: none; }
    .marketing-root .btn-primary {
      background: linear-gradient(180deg, #3b82f6 0%, #2f6fdb 100%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 8px 30px -8px rgba(59,130,246,.55);
    }
    .marketing-root .btn-primary:hover { filter: brightness(1.08); }
    .marketing-root .chip { border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); }
    .marketing-root details[open] .acc-icon { transform: rotate(45deg); }
    .marketing-root .acc-icon { transition: transform .25s ease; }
    .marketing-root .b-admin { background: rgba(244,114,182,.12); color: #f9a8d4; border-color: rgba(244,114,182,.25); }
    .marketing-root .b-gm    { background: rgba(139,92,246,.12); color: #c4b5fd; border-color: rgba(139,92,246,.25); }
    .marketing-root .b-sup   { background: rgba(59,130,246,.12); color: #93c5fd; border-color: rgba(59,130,246,.25); }
    .marketing-root .b-eng   { background: rgba(45,212,191,.12); color: #5eead4; border-color: rgba(45,212,191,.25); }
    .marketing-root .track-x { background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent); height: 1px; }
    .marketing-root .navblur { backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); background: rgba(7,7,12,.6); border-bottom: 1px solid rgba(255,255,255,.06); }
  `}</style>
);

const Marketing = () => (
  <div className="marketing-root min-h-screen relative">
    <MarketingStyles />
    <Nav />
    <Hero />
    <Problem />
    <Features />
    <WorkflowSection />
    <Equipment />
    <MobileSection />
    <Security />
    <Pricing />
    <FAQ />
    <FooterCTA />
  </div>
);

export default Marketing;
