"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Command, Sparkles, FileText, User, Settings, Activity, Zap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SpotlightSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const quickActions = [
    { label: "New Automation", path: "/dashboard/creative/automations", icon: Zap, color: "bg-cyan-500/10 text-cyan-400", shortcut: "Ctrl+N" },
    { label: "View Analytics", path: "/dashboard/creative/analytics", icon: BarChart3, color: "bg-violet-500/10 text-violet-400", shortcut: "Ctrl+A" },
    { label: "Team Settings", path: "/dashboard/creative/team", icon: User, color: "bg-emerald-500/10 text-emerald-400", shortcut: "Ctrl+T" },
    { label: "Activity Log", path: "/dashboard/creative/activity", icon: Activity, color: "bg-fuchsia-500/10 text-fuchsia-400", shortcut: "Ctrl+L" },
    { label: "Create Workflow", path: "/dashboard/create", icon: Sparkles, color: "bg-gold/10 text-gold", shortcut: "Ctrl+W" },
    { label: "Settings", path: "/dashboard/settings", icon: Settings, color: "bg-orange-500/10 text-orange-400", shortcut: "Ctrl+S" },
  ];

  const filteredActions = quickActions.filter(action =>
    action.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }

      // Handle quick action shortcuts
      if (e.ctrlKey || e.metaKey) {
        const shortcuts: { [key: string]: string } = {
          'n': '/dashboard/creative/automations',
          'a': '/dashboard/creative/analytics',
          't': '/dashboard/creative/team',
          'l': '/dashboard/creative/activity',
          'w': '/dashboard/create',
          's': '/dashboard/settings'
        };

        const path = shortcuts[e.key.toLowerCase()];
        if (path) {
          e.preventDefault();
          router.push(path);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <>
      {/* Search Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed top-6 right-6 lg:right-10 z-40",
          "flex items-center gap-3 px-4 py-3",
          "bg-[#0f0f14]/80 backdrop-blur-xl",
          "border border-white/[0.08] rounded-2xl",
          "group hover:border-white/20 transition-all duration-300"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Search className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
        <span className="text-sm text-white/60 group-hover:text-white hidden sm:block">Search...</span>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.08] border border-white/[0.06]">
          <Command className="w-3 h-3 text-white/40" />
          <span className="text-xs text-white/40">K</span>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl mx-4"
            >
              <div className="bg-[#0f0f14]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden">
                {/* Glow Effect */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 bg-violet-500/30 rounded-full blur-3xl pointer-events-none" />

                {/* Search Input */}
                <div className="relative flex items-center gap-4 p-6 border-b border-white/[0.06]">
                  <Search className="w-6 h-6 text-white/60" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What would you like to do?"
                    className="flex-1 bg-transparent text-lg text-white placeholder:text-white/30 outline-none"
                    autoFocus
                  />
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-xs text-white/60 hover:text-white transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ESC
                  </motion.button>
                </div>

                {/* Quick Actions */}
                <div className="p-4">
                  <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4 px-2">
                    Quick Actions {query && `(${filteredActions.length})`}
                  </div>
                  {filteredActions.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {filteredActions.map((action, index) => (
                        <motion.button
                          key={action.label}
                          onClick={() => {
                            router.push(action.path);
                            setIsOpen(false);
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl",
                            "bg-white/[0.03] border border-white/[0.04]",
                            "hover:bg-white/[0.08] hover:border-white/[0.1]",
                            "cursor-pointer transition-all duration-200 group text-left"
                          )}
                        >
                          <div className={cn("p-2 rounded-lg bg-white/[0.05]", action.color)}>
                            <action.icon className="w-4 h-4" />
                          </div>
                          <span className="flex-1 text-sm text-white/80 group-hover:text-white">
                            {action.label}
                          </span>
                          <span className="text-xs text-white/30 font-mono">{action.shortcut}</span>
                        </motion.button>
                      ))}
                    </div>
                  ) : query ? (
                    <div className="text-center py-8 text-white/40">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No actions found for "{query}"</p>
                    </div>
                  ) : null}
                </div>

                {/* AI Assistant Hint */}
                <div className="px-6 py-4 border-t border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-3 text-sm text-white/40">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-violet-300">AI Assistant</span>
                    </div>
                    <span>Try "Analyze last week's performance"</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
