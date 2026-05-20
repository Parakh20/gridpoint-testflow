import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ClipboardCheck,
  Smartphone,
  Bot,
  ShieldCheck,
  Workflow,
  ArrowRight,
  CheckCircle2,
  Building2,
  Wrench,
  Mail,
  PhoneCall,
} from "lucide-react";

/**
 * Public marketing site at optimustesting.com (apex).
 * The admin portal moved to admin.optimustesting.com; tenant workspaces stay
 * at <slug>.optimustesting.com. Hostname routing is in App.tsx.
 */
export default function Marketing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <NavBar />
      <Hero />
      <TrustStrip />
      <Features />
      <WorkflowSection />
      <ForWhom />
      <Pricing />
      <Contact />
      <Footer />
    </div>
  );
}

/* ── Nav ───────────────────────────────────────────────────────────────── */

function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/40">
            <Zap className="h-4 w-4 text-sky-400" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight">Optimus Testing</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              TestFlow Platform
            </div>
          </div>
        </a>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <a href="#features" className="text-slate-300 hover:text-white">Features</a>
          <a href="#workflow" className="text-slate-300 hover:text-white">How it works</a>
          <a href="#for-whom" className="text-slate-300 hover:text-white">Who it's for</a>
          <a href="#pricing" className="text-slate-300 hover:text-white">Pricing</a>
          <a href="#contact" className="text-slate-300 hover:text-white">Contact</a>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="https://admin.optimustesting.com"
            className="hidden text-sm text-slate-300 hover:text-white md:inline"
          >
            Admin
          </a>
          <Button asChild className="bg-sky-500 text-slate-950 hover:bg-sky-400">
            <Link to="/#contact">Request demo</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ──────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-slate-800/60">
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="absolute left-1/3 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-sky-500/20 blur-[120px]" />
        <div className="absolute right-0 top-32 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/5 px-3 py-1 text-xs font-medium text-sky-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
            </span>
            Now serving commissioning contractors across India
          </div>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Digital commissioning for{" "}
            <span className="bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent">
              electrical substations.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-slate-300">
            Replace paper test sheets, scattered Excel workbooks, and WhatsApp coordination
            with one platform field engineers actually use. From 11 kV switchyards to 765 kV
            grid stations.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-sky-500 text-slate-950 hover:bg-sky-400"
            >
              <a href="#contact">
                Book a 20-min demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-900"
            >
              <a href="#features">See features</a>
            </Button>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-3 text-sm text-slate-300">
            {[
              "46+ ready test templates",
              "Multi-tenant isolation (RLS)",
              "Engineer mobile app (iOS + Android)",
              "AI-drafted handover reports",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mock terminal / dashboard preview */}
        <div className="relative">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1 shadow-2xl shadow-sky-500/10">
            <div className="flex items-center gap-1.5 border-b border-slate-800 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-3 font-mono text-[10px] text-slate-500">
                acme.optimustesting.com / projects
              </span>
            </div>
            <div className="space-y-2 p-4 font-mono text-xs">
              {[
                ["PRJ-2026-0042", "ACTIVE", "138/220 kV Borivali — 4 transformers, 22 tests"],
                ["PRJ-2026-0041", "ACTIVE", "33 kV Andheri — 6 VCBs, 14 tests"],
                ["PRJ-2026-0036", "CLOSED", "765 kV Vapi — handover report ready"],
                ["PRJ-2026-0024", "DRAFT", "11 kV Pune — scope under review"],
              ].map(([id, status, label]) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <span className="text-slate-300">{id}</span>
                  <span className={statusClass(status)}>{status}</span>
                  <span className="ml-auto truncate text-right text-[11px] text-slate-500">
                    {label}
                  </span>
                </div>
              ))}
              <div className="rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-[11px] text-sky-200">
                ✨ AI report for PRJ-2026-0036 generated · 4.2s · 6.1 KB Markdown
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400";
  if (status === "CLOSED") return "rounded bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-400";
  if (status === "DRAFT") return "rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400";
  return "rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400";
}

/* ── Trust / stats strip ───────────────────────────────────────────────── */

function TrustStrip() {
  const stats = [
    { value: "46+", label: "Test templates" },
    { value: "8", label: "Equipment classes" },
    { value: "30 s", label: "Live data sync" },
    { value: "100%", label: "Tenant isolation (RLS)" },
  ];
  return (
    <section className="border-b border-slate-800/60 bg-slate-950">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-12 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-bold text-white">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-widest text-slate-400">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Features ──────────────────────────────────────────────────────────── */

function Features() {
  const items = [
    {
      icon: ClipboardCheck,
      title: "46+ ready test templates",
      body: "Voltage ratio, tan delta, winding resistance, SF6 timing, CT analyzer, lightning arrester surge counter — all field-validated and editable.",
    },
    {
      icon: Smartphone,
      title: "Field engineer mobile app",
      body: "Auto-saving forms, offline-friendly status indicators, dark UI tuned for sunlight readability. iOS + Android via Expo.",
    },
    {
      icon: Workflow,
      title: "Lifecycle workflow",
      body: "DRAFT → APPROVED → ACTIVE → CLOSED with explicit GM / Supervisor / Engineer / SUPERADMIN roles and rework loops.",
    },
    {
      icon: Bot,
      title: "AI handover reports",
      body: "Claude Haiku drafts a Markdown report once a project closes — anomalies flagged, instruments listed, executive summary at the top.",
    },
    {
      icon: ShieldCheck,
      title: "Multi-tenant by design",
      body: "Each commissioning company gets its own subdomain. Row-level security enforces isolation at the database — not in app code.",
    },
    {
      icon: Building2,
      title: "Audit log + soft delete",
      body: "Every status change, every value edit logged in-DB by Postgres triggers. SUPERADMIN can restore deleted projects.",
    },
  ];
  return (
    <section id="features" className="border-b border-slate-800/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Features"
          title="Built for the way field testing actually happens."
          subtitle="Not a generic project tool — every screen, schema and role exists because a commissioning engineer asked for it."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-sky-500/40 hover:bg-slate-900"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/30">
                <item.icon className="h-5 w-5 text-sky-400" />
              </div>
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Workflow ──────────────────────────────────────────────────────────── */

function WorkflowSection() {
  const steps = [
    {
      n: "01",
      title: "Define scope",
      body: "GM picks equipment quantities and enabled test templates. The platform generates equipment instances (PTR-001, CT-007 …) with one click.",
    },
    {
      n: "02",
      title: "Execute in field",
      body: "Engineers see only the tests assigned to them. Submit from the mobile app; supervisor reviews and approves or sends back for rework with a reason.",
    },
    {
      n: "03",
      title: "Generate report",
      body: "Once the project closes, the AI report button drafts a handover document. PDF and Excel exports use the same template — no double entry.",
    },
  ];
  return (
    <section id="workflow" className="border-b border-slate-800/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="How it works"
          title="From scope definition to client handover in one platform."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 p-8"
            >
              <div className="text-5xl font-bold text-sky-500/30">{s.n}</div>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── For Whom ──────────────────────────────────────────────────────────── */

function ForWhom() {
  const audiences = [
    {
      icon: Wrench,
      title: "Commissioning contractors",
      bullets: [
        "Run dozens of substations concurrently without losing track",
        "Standardise testing across geographically distributed teams",
        "Hand over reports clients can audit, not photograph",
      ],
    },
    {
      icon: Building2,
      title: "Utility & EPC in-house teams",
      bullets: [
        "Single workspace for the inspection division",
        "Trace every instrument calibration back to a measurement",
        "Replace personal Excel templates with company-wide standards",
      ],
    },
  ];
  return (
    <section id="for-whom" className="border-b border-slate-800/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader eyebrow="Who it's for" title="Made for the people who actually do the work." />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {audiences.map((a) => (
            <div key={a.title} className="rounded-xl border border-slate-800 bg-slate-900/50 p-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/30">
                <a.icon className="h-5 w-5 text-sky-400" />
              </div>
              <h3 className="text-lg font-semibold">{a.title}</h3>
              <ul className="mt-4 space-y-2">
                {a.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ───────────────────────────────────────────────────────────── */

function Pricing() {
  const tiers = [
    {
      name: "Starter",
      price: "Free",
      unit: "14-day trial",
      tagline: "Run one substation end-to-end before committing.",
      features: [
        "Up to 5 users",
        "1 active project",
        "All 46 test templates",
        "Email support",
      ],
      cta: "Start trial",
      highlight: false,
    },
    {
      name: "Team",
      price: "Contact us",
      unit: "per workspace / month",
      tagline: "The default for small commissioning firms.",
      features: [
        "Unlimited users",
        "Unlimited projects",
        "AI handover reports",
        "Mobile app",
        "Priority support",
      ],
      cta: "Book demo",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      unit: "on contract",
      tagline: "For utilities and EPC majors.",
      features: [
        "Everything in Team",
        "SSO & custom RBAC",
        "On-prem / private cloud options",
        "SLA & dedicated CSM",
        "Custom templates",
      ],
      cta: "Talk to us",
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="border-b border-slate-800/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Pricing"
          title="Pay for the workspace, not per signature."
          subtitle="Three tiers. No per-test surcharge. No surprise add-ons."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-xl border p-6 ${
                t.highlight
                  ? "border-sky-400/60 bg-gradient-to-b from-sky-500/10 to-slate-900 ring-2 ring-sky-500/30"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-sky-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-950">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{t.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold">{t.price}</span>
                <span className="text-xs text-slate-400">{t.unit}</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{t.tagline}</p>
              <ul className="mt-6 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`mt-6 w-full ${
                  t.highlight
                    ? "bg-sky-500 text-slate-950 hover:bg-sky-400"
                    : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                }`}
              >
                <a href="#contact">{t.cta}</a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Contact ───────────────────────────────────────────────────────────── */

function Contact() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Demo request — ${company || name || "Optimus Testing"}`;
    const body =
      `Name: ${name}\n` +
      `Company: ${company}\n` +
      `Email: ${email}\n` +
      `Phone: ${phone}\n\n` +
      `Message:\n${message}`;
    window.location.href = `mailto:hello@optimustesting.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section id="contact" className="border-b border-slate-800/60 py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
        <div>
          <SectionHeader
            eyebrow="Contact"
            title="See it on your own substation."
            subtitle="Tell us a bit about your team. We'll set up a workspace with your scope pre-loaded and walk through the first project together."
            align="left"
          />
          <div className="mt-8 space-y-4 text-sm">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/30">
                <Mail className="h-4 w-4 text-sky-400" />
              </div>
              <a href="mailto:hello@optimustesting.com" className="hover:text-white">
                hello@optimustesting.com
              </a>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/30">
                <PhoneCall className="h-4 w-4 text-sky-400" />
              </div>
              <span>+91 — by request</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Your name" value={name} onChange={setName} required />
            <Field label="Company" value={company} onChange={setCompany} />
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field label="Phone" value={phone} onChange={setPhone} />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Tell us about your projects
            </label>
            <textarea
              className="min-h-[110px] w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. We commission 11–220 kV substations across 4 states; ~20 active projects at any time."
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full bg-sky-500 text-slate-950 hover:bg-sky-400"
          >
            Send via email
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="mt-3 text-center text-[11px] text-slate-500">
            We'll reply within one business day. No spam, no sales blasts.
          </p>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30"
      />
    </div>
  );
}

/* ── Footer ────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-slate-950 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/40">
              <Zap className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">Optimus Testing</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                TestFlow Platform · {new Date().getFullYear()}
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#workflow" className="hover:text-white">How it works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="mailto:hello@optimustesting.com" className="hover:text-white">Contact</a>
            <a href="https://admin.optimustesting.com" className="hover:text-white">
              Admin
            </a>
          </nav>
        </div>
        <div className="mt-8 border-t border-slate-800 pt-6 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} Optimus Testing. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-2xl ${alignClass}`}>
      <div className="mb-3 inline-block rounded-full border border-sky-400/30 bg-sky-400/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-300">
        {eyebrow}
      </div>
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-base text-slate-400">{subtitle}</p>}
    </div>
  );
}
