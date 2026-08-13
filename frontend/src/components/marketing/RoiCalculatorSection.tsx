import { useState } from "react";

const DEFAULT_ENGINEERS = 20;
const DEFAULT_PROJECTS_PER_YEAR = 8;
const DEFAULT_HOURS_PER_PROJECT = 120;
const DEFAULT_HOURLY_COST_INR = 1000;
const DEFAULT_REDUCTION_PERCENT = 60;

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

function NumberField({ label, value, onChange, min = 0, max, suffix }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="text-[13px] text-white/55">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-white/12 bg-white/[.03] px-3.5 py-2.5 focus-within:border-[#3b82f6]/50">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange(Number.isFinite(next) ? next : 0);
          }}
          className="w-full bg-transparent text-[15px] text-white font-medium outline-none"
        />
        {suffix && <span className="text-[13px] text-white/45">{suffix}</span>}
      </div>
    </label>
  );
}

export function RoiCalculatorSection() {
  const [engineers, setEngineers] = useState(DEFAULT_ENGINEERS);
  const [projectsPerYear, setProjectsPerYear] = useState(DEFAULT_PROJECTS_PER_YEAR);
  const [hoursPerProject, setHoursPerProject] = useState(DEFAULT_HOURS_PER_PROJECT);
  const [hourlyCostInr, setHourlyCostInr] = useState(DEFAULT_HOURLY_COST_INR);
  const [reductionPercent, setReductionPercent] = useState(DEFAULT_REDUCTION_PERCENT);

  const manualCostPerYear = projectsPerYear * hoursPerProject * hourlyCostInr;
  const reductionFraction = reductionPercent / 100;
  const annualSavings = manualCostPerYear * reductionFraction;
  const costWithTestFlow = manualCostPerYear - annualSavings;

  return (
    <section id="roi" className="relative py-24 md:py-32 border-t border-white/[.06]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/45 mb-3">ROI Calculator</div>
          <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
            See what manual reporting is actually costing you
          </h2>
          <p className="mt-3 text-[15px] text-white/55 max-w-xl mx-auto">
            Adjust the numbers to match your team. Everything below updates live.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-white/12 bg-white/[.03] p-6 md:p-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <NumberField label="Engineers" value={engineers} onChange={setEngineers} min={1} />
              <NumberField label="Projects per year" value={projectsPerYear} onChange={setProjectsPerYear} min={1} />
              <NumberField
                label="Hours manually preparing reports / project"
                value={hoursPerProject}
                onChange={setHoursPerProject}
                min={0}
              />
              <NumberField
                label="Avg. loaded labor cost / hour"
                value={hourlyCostInr}
                onChange={setHourlyCostInr}
                min={0}
                suffix="INR"
              />
              <div className="sm:col-span-2">
                <NumberField
                  label="TestFlow reduction in manual reporting time"
                  value={reductionPercent}
                  onChange={setReductionPercent}
                  min={0}
                  max={100}
                  suffix="%"
                />
              </div>
            </div>
            <p className="mt-5 text-[12px] text-white/35">
              {engineers} engineer{engineers === 1 ? "" : "s"} — cost is driven by project volume and reporting hours, not headcount.
            </p>
          </div>

          <div className="rounded-2xl border border-[#3b82f6]/50 bg-[#3b82f6]/[.06] p-6 md:p-7 flex flex-col">
            <div className="space-y-5 flex-1">
              <div className="flex items-center justify-between border-b border-white/[.08] pb-4">
                <span className="text-[13.5px] text-white/65">Manual reporting cost / year</span>
                <span className="text-xl font-semibold text-white">{formatInr(manualCostPerYear)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/[.08] pb-4">
                <span className="text-[13.5px] text-white/65">With TestFlow</span>
                <span className="text-xl font-semibold text-white">{formatInr(costWithTestFlow)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] text-white/85 font-medium">Annual savings</span>
                <span className="text-2xl font-semibold text-[#3b82f6]">{formatInr(annualSavings)}</span>
              </div>
            </div>
            <a
              href="#cta"
              className="btn-primary mt-6 text-center text-[13.5px] font-medium px-4 py-2.5 rounded-lg text-white"
            >
              See how TestFlow gets you there
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
