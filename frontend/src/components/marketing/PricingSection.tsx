import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";

interface PlanRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_price_inr: number | null;
  annual_price_inr: number | null;
  max_users: number | null;
  max_active_projects: number | null;
  is_custom: boolean;
}

interface FeatureRow {
  plan_id: string;
  feature_key: string;
  enabled: boolean;
}

const CTA_LABEL: Record<string, string> = {
  starter: "Get started",
  professional: "Request access",
  business: "Talk to sales",
  enterprise: "Contact sales",
};

const FEATURE_LABELS: Record<string, string> = {
  offline_mobile: "Offline mobile app",
  audit_trail: "Full audit trail",
  api_access: "API access",
  sso: "SSO",
  multiple_sites: "Multiple sites",
  custom_workflows: "Custom workflows",
  advanced_reports: "Advanced reports",
  advanced_approvals: "Advanced approvals",
};

function formatPrice(monthlyInr: number | null, isCustom: boolean): string {
  if (isCustom || monthlyInr === null) return "Custom";
  return `₹${monthlyInr.toLocaleString("en-IN")}`;
}

export function PricingSection() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [plansRes, featuresRes] = await Promise.all([
        supabase
          .from("plans")
          .select("id, slug, name, description, monthly_price_inr, annual_price_inr, max_users, max_active_projects, is_custom")
          .order("monthly_price_inr", { ascending: true, nullsFirst: false }),
        supabase.from("plan_features").select("plan_id, feature_key, enabled"),
      ]);

      if (cancelled) return;
      if (plansRes.error) {
        console.error("[PricingSection] failed to load plans:", plansRes.error);
      } else {
        setPlans(plansRes.data ?? []);
      }
      if (!featuresRes.error) {
        setFeatures(featuresRes.data ?? []);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || plans.length === 0) return null;

  const featureKeys = Array.from(new Set(features.map((f) => f.feature_key)));
  const isEnabled = (planId: string, key: string) =>
    features.find((f) => f.plan_id === planId && f.feature_key === key)?.enabled ?? false;

  return (
    <section id="pricing" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/45 mb-3">Pricing</div>
          <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Plans built around your commissioning operation
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const isPopular = plan.slug === "professional";
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col ${
                  isPopular
                    ? "border-[#3b82f6]/50 bg-[#3b82f6]/[.06] relative"
                    : "border-white/12 bg-white/[.03]"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-widest bg-[#3b82f6] text-white px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div className="text-white font-semibold text-lg">{plan.name}</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {formatPrice(plan.monthly_price_inr, plan.is_custom)}
                  {!plan.is_custom && <span className="text-sm font-normal text-white/45">/mo</span>}
                </div>
                <p className="mt-2 text-[13px] text-white/55 flex-1">{plan.description}</p>
                <div className="mt-4 text-[13px] text-white/70 space-y-1">
                  <div>{plan.max_users ?? "Unlimited"} users</div>
                  <div>{plan.max_active_projects ?? "Unlimited"} active projects</div>
                </div>
                <a
                  href="#cta"
                  className={`mt-5 text-center text-[13.5px] font-medium px-4 py-2.5 rounded-lg transition ${
                    isPopular
                      ? "btn-primary text-white"
                      : "border border-white/15 text-white/85 hover:border-white/30"
                  }`}
                >
                  {CTA_LABEL[plan.slug] ?? "Contact sales"}
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setCompareOpen((v) => !v)}
            className="text-[13px] font-mono uppercase tracking-widest text-white/55 hover:text-white underline underline-offset-4"
          >
            {compareOpen ? "Hide feature comparison" : "Compare all features"}
          </button>
        </div>

        {compareOpen && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-white/12">
                  <th className="text-left py-3 text-white/55 font-normal">Feature</th>
                  {plans.map((p) => (
                    <th key={p.id} className="text-center py-3 text-white/85 font-medium">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureKeys.map((key) => (
                  <tr key={key} className="border-b border-white/[.06]">
                    <td className="py-3 text-white/70">{FEATURE_LABELS[key] ?? key}</td>
                    {plans.map((p) => (
                      <td key={p.id} className="text-center py-3">
                        {isEnabled(p.id, key) ? (
                          <CheckCircle2 className="w-4 h-4 text-[#3b82f6] inline" />
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
