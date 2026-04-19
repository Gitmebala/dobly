"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Briefcase,
  Users,
  BarChart3,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  Target,
  TrendingUp,
} from "lucide-react";

export default function AgenciesPage() {
  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Client Management at Scale",
      description:
        "Handle dozens of clients without drowning in manual tasks. Automate onboarding, reporting, and offboarding workflows.",
      color: "from-purple-600/20 to-purple-600/5",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Automated Client Reporting",
      description:
        "Generate weekly/monthly reports automatically, pulling data from analytics, ads, and CRM systems. Save 10+ hours per client.",
      color: "from-blue-600/20 to-blue-600/5",
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Campaign Orchestration",
      description: "Coordinate campaigns across Google Ads, Meta, WordPress, email, and more. Sync changes across all platforms instantly.",
      color: "from-orange-600/20 to-orange-600/5",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Lead Distribution",
      description: "Automatically qualify and route leads to the right team members, notify clients, and track follow-ups.",
      color: "from-green-600/20 to-green-600/5",
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Resource Optimization",
      description:
        "Reduce manual work on clients, freeing up team time to focus on strategy and creative work that clients actually pay for.",
      color: "from-pink-600/20 to-pink-600/5",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Profitability Tracking",
      description:
        "Track time spent per client, measure ROI on different project types, and identify your most profitable services.",
      color: "from-emerald-600/20 to-emerald-600/5",
    },
  ];

  const useCases = [
    { name: "New Client Onboarding", description: "Automations → Playbooks → Docs → Team Setup → Welcome" },
    { name: "Weekly Performance Reports", description: "Collect Data → Analyze → Format → Send → Log" },
    { name: "Lead Scoring & Distribution", description: "Form → Qualify → Score → Route → Notify" },
    { name: "Invoice & Payment Reminders", description: "Invoice Due → Reminder → Escalation → Follow-up" },
  ];

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)]">
      {/* Hero */}
      <div className="relative px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium mb-6">
              <Briefcase className="w-4 h-4" />
              Built for Agencies
            </div>

            <h1 className="text-5xl font-bold text-white mb-6">
              Scale your agency without scaling your team
            </h1>
            <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto">
              Let automated workflows handle reporting, client management, and campaign coordination. Your team spends less time on busy-work and more time on strategy that clients value.
            </p>

            <div className="flex gap-3 justify-center">
              <Link
                href="/auth/signup"
                className="px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-colors flex items-center gap-2"
              >
                Start Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/workflows/templates"
                className="px-8 py-4 rounded-xl border border-white/[0.2] hover:border-white/[0.3] bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold transition-colors"
              >
                See Templates
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-12 border-b border-white/[0.1]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <p className="text-4xl font-bold text-purple-400 mb-2">15 hrs/week</p>
              <p className="text-white/70">Time saved per account manager on average</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-blue-400 mb-2">2-3 clients</p>
              <p className="text-white/70">Each team member can handle extra without growth</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-emerald-400 mb-2">8.5x</p>
              <p className="text-white/70">ROI when replacing manual team member tasks</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Tools built for agency operations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br ${feature.color}`}
              >
                <div className="text-purple-400 mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/70 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Workflows that save your team time
          </h2>

          <div className="space-y-4">
            {useCases.map((useCase, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">
                      {useCase.name}
                    </h3>
                    <p className="text-white/60">{useCase.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-purple-400/50 group-hover:text-purple-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Agencies */}
      <div className="px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Trusted by growth agencies everywhere
          </h2>

          <div className="space-y-4">
            {[
              "Multi-client dashboards with client-specific workflows",
              "Team permissions and approval workflows for client handoff",
              "Integrations with HubSpot, Salesforce, and all major ad platforms",
              "White-label ready for reselling services",
              "24/7 support and dedicated success team",
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-lg border border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.05] transition-colors"
              >
                <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/80">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Stop losing money to manual client work
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            Join hundreds of agencies automating client operations and scaling without growing headcount.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
