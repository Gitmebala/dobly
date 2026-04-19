"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
  Package,
  BarChart3,
  Mail,
  Check,
  ArrowRight,
  Star,
  AlertCircle,
} from "lucide-react";

export default function EcommercePage() {
  const features = [
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: "Order Automation",
      description: "Auto-fulfill orders, update inventory, and sync shipping across all channels in real-time.",
      color: "from-blue-600/20 to-blue-600/5",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Customer Journeys",
      description:
        "Automate post-purchase follow-ups, upsells, reviews, and retention campaigns triggered by customer actions.",
      color: "from-purple-600/20 to-purple-600/5",
    },
    {
      icon: <Package className="w-8 h-8" />,
      title: "Inventory Management",
      description: "Sync inventory across Shopify, WooCommerce, and Amazon. Prevent overselling and auto-reorder stock.",
      color: "from-orange-600/20 to-orange-600/5",
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: "Customer Notifications",
      description: "Send order confirmations, shipping updates, and delivery confirmations automatically to customers.",
      color: "from-green-600/20 to-green-600/5",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Analytics & Reporting",
      description: "Track sales trends, customer lifetime value, and generate daily/weekly performance reports.",
      color: "from-pink-600/20 to-pink-600/5",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Revenue Growth",
      description: "Increase average order value with automated product recommendations and bundling strategies.",
      color: "from-emerald-600/20 to-emerald-600/5",
    },
  ];

  const templates = [
    { name: "Order Processing", description: "Receive → Validate → Fulfill → Notify" },
    { name: "Abandoned Cart Recovery", description: "Trigger → Email → Remind → Follow-up" },
    { name: "Post-Purchase Upsell", description: "Order Placed → Recommend → Send Offer → Track" },
    { name: "Inventory Sync", description: "Stock Change → Update All Channels → Alert" },
  ];

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)]">
      {/* Hero */}
      <div className="relative px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-medium mb-6">
              <ShoppingCart className="w-4 h-4" />
              Built for Ecommerce
            </div>

            <h1 className="text-5xl font-bold text-white mb-6">
              Automate your entire ecommerce operation
            </h1>
            <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto">
              From order processing to customer retention, Dobly handles the repetitive tasks that slow down growth. Focus on strategy and marketing while automations handle the routine work.
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
              <p className="text-4xl font-bold text-emerald-400 mb-2">45%</p>
              <p className="text-white/70">Faster order fulfillment on average</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-blue-400 mb-2">$50k+</p>
              <p className="text-white/70">Average annual time savings</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-purple-400 mb-2">3.2x</p>
              <p className="text-white/70">Average ROI within first year</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Everything you need to scale your store
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
                <div className="text-blue-400 mb-4">{feature.icon}</div>
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
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Common automations that make a difference</h2>

          <div className="space-y-4">
            {templates.map((template, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-white/60">{template.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-400/50 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 py-20 border-b border-white/[0.1]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Built by ecommerce operators, for ecommerce operators
          </h2>

          <div className="space-y-4">
            {[
              "Pre-built templates for Shopify, WooCommerce, BigCommerce, and more",
              "Native integrations with Stripe, PayPal, Square, and shipping providers",
              "Handle peak seasons with unlimited workflow executions",
              "Compliance-ready: SOC2, GDPR, and PCI DSS compliant",
              "Dedicated support from product experts who understand ecommerce",
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-lg border border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.05] transition-colors"
              >
                <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/80">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to scale your operations?</h2>
          <p className="text-white/70 mb-8 text-lg">
            Join ecommerce teams automating thousands of workflows every day.
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
