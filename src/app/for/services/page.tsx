"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wrench,
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  Zap,
  ArrowRight,
  Calendar,
  MessageCircle,
  TrendingUp,
} from "lucide-react";

export default function ServicesPage() {
  const features = [
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Appointment Scheduling",
      description:
        "Auto-confirm bookings, send reminders 24 hours before, reschedule no-shows, and track cancellations automatically.",
      color: "from-amber-600/20 to-amber-600/5",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Customer Follow-up",
      description:
        "Send post-service surveys, request reviews, schedule follow-ups, and track customer satisfaction trends over time.",
      color: "from-green-600/20 to-green-600/5",
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Communication Hub",
      description:
        "Send appointment notifications via SMS, email, and WhatsApp. Centralize customer conversations in one place.",
      color: "from-purple-600/20 to-purple-600/5",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Revenue Growth",
      description:
        "Automated upsell workflows offer additional services, packages, and seasonal promotions to existing customers.",
      color: "from-orange-600/20 to-orange-600/5",
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Staff Scheduling",
      description:
        "Sync staff availability, auto-assign based on skills, send shift reminders, and manage coverage automatically.",
      color: "from-pink-600/20 to-pink-600/5",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Performance Tracking",
      description:
        "Monitor revenue, customer retention, no-show rates, and staff productivity with automated daily/weekly reports.",
      color: "from-emerald-600/20 to-emerald-600/5",
    },
  ];

  const useCases = [
    { name: "Appointment Reminder", description: "Booking → 24hr Reminder → 1hr Reminder → Follow-up" },
    { name: "No-Show Recovery", description: "Missed → Alert → Follow-up → Reschedule" },
    { name: "Review Request Sequence", description: "Service Complete → Email → Text → Follow-up" },
    { name: "Upsell Campaign", description: "Purchase → Wait 7 days → Offer Upgrade → Track" },
  ];

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)]">
      {/* Hero */}
      <div className="relative px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 text-green-300 text-sm font-medium mb-6">
              <Wrench className="w-4 h-4" />
              Built for Service Businesses
            </div>

            <h1 className="text-5xl font-bold text-white mb-6">
              Automate your service business operations
            </h1>
            <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto">
              Stop managing spreadsheets. Automate scheduling, reminders, follow-ups, and customer communication. Keep more customers, reduce no-shows, and grow revenue.
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
              <p className="text-4xl font-bold text-[var(--dobly-accent)] mb-2">35%</p>
              <p className="text-white/70">Reduction in no-shows with automated reminders</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-emerald-400 mb-2">12 hrs/week</p>
              <p className="text-white/70">Time saved on scheduling and follow-ups</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-purple-400 mb-2">22% more</p>
              <p className="text-white/70">Revenue from automated upsells</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Everything you need to run a service business
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
                <div className="text-green-400 mb-4">{feature.icon}</div>
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
            Ready to deploy workflows
          </h2>

          <div className="space-y-4">
            {useCases.map((useCase, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-xl border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-green-300 transition-colors">
                      {useCase.name}
                    </h3>
                    <p className="text-white/60">{useCase.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-green-400/50 group-hover:text-green-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Industries */}
      <div className="px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Perfect for all service industries</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Salons & Spas",
              "Plumbing & Repairs",
              "Personal Training & Fitness",
              "Consulting & Coaching",
              "Legal Services",
              "Medical & Dental Practices",
              "Cleaning Services",
              "Automotive Services",
              "Photography",
            ].map((industry, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 rounded-lg border border-white/[0.1] bg-white/[0.02] text-center"
              >
                <p className="text-white font-medium">{industry}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Why service businesses choose Dobly
          </h2>

          <div className="space-y-4">
            {[
              "Simple workflows that don't require coding - no developer needed",
              "Integrations with Calendly, Google Calendar, Square, Stripe, and more",
              "SMS and email automation at no extra cost",
              "Built-in review request workflows to grow your reputation",
              "Real-time customer communication without manual effort",
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-lg border border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.05] transition-colors"
              >
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
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
            Stop wasting time on manual tasks
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            Automate your service business and focus on delivering great service to your customers.
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
