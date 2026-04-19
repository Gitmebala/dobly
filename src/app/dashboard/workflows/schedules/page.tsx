"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FrequencyType = "once" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

interface Schedule {
  id: string;
  name: string;
  frequency: FrequencyType;
  time: string; // HH:MM format
  daysOfWeek?: DayOfWeek[];
  dayOfMonth?: number;
  month?: number;
  cronExpression?: string;
  description: string;
  enabled: boolean;
  nextRuns: string[];
}

const DAYS_OF_WEEK: { value: DayOfWeek; label: string; short: string }[] = [
  { value: "monday", label: "Monday", short: "Mon" },
  { value: "tuesday", label: "Tuesday", short: "Tue" },
  { value: "wednesday", label: "Wednesday", short: "Wed" },
  { value: "thursday", label: "Thursday", short: "Thu" },
  { value: "friday", label: "Friday", short: "Fri" },
  { value: "saturday", label: "Saturday", short: "Sat" },
  { value: "sunday", label: "Sunday", short: "Sun" },
];

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function generateNextRuns(frequency: FrequencyType, time: string): string[] {
  const nextRuns: string[] = [];
  const now = new Date();

  // Simple mock - generate 5 future dates based on frequency
  for (let i = 1; i <= 5; i++) {
    const nextRun = new Date(now);

    switch (frequency) {
      case "hourly":
        nextRun.setHours(nextRun.getHours() + i);
        break;
      case "daily":
        nextRun.setDate(nextRun.getDate() + i);
        break;
      case "weekly":
        nextRun.setDate(nextRun.getDate() + i * 7);
        break;
      case "monthly":
        nextRun.setMonth(nextRun.getMonth() + i);
        break;
      case "yearly":
        nextRun.setFullYear(nextRun.getFullYear() + i);
        break;
    }

    nextRuns.push(nextRun.toLocaleString());
  }

  return nextRuns;
}

function getScheduleDescription(schedule: Schedule): string {
  switch (schedule.frequency) {
    case "once":
      return `One-time at ${schedule.time}`;
    case "hourly":
      return "Every hour";
    case "daily":
      return `Daily at ${schedule.time}`;
    case "weekly": {
      const days = schedule.daysOfWeek?.map((d) => DAYS_OF_WEEK.find((x) => x.value === d)?.short).join(", ");
      return `Every week on ${days} at ${schedule.time}`;
    }
    case "monthly": {
      const monthNames = MONTHS.map((m) => m.label).join(", ");
      return `Every month on day ${schedule.dayOfMonth} at ${schedule.time}`;
    }
    case "yearly": {
      const month = MONTHS.find((m) => m.value === schedule.month)?.label;
      return `Every year on ${month} ${schedule.dayOfMonth} at ${schedule.time}`;
    }
    case "custom":
      return `Custom: ${schedule.cronExpression}`;
    default:
      return "Not set";
  }
}

function ScheduleForm({
  onSave,
  onCancel,
  initialSchedule,
}: {
  onSave: (schedule: Schedule) => void;
  onCancel: () => void;
  initialSchedule?: Schedule;
}) {
  const [name, setName] = useState(initialSchedule?.name || "");
  const [frequency, setFrequency] = useState<FrequencyType>(initialSchedule?.frequency || "daily");
  const [time, setTime] = useState(initialSchedule?.time || "09:00");
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(initialSchedule?.daysOfWeek || ["monday", "friday"]);
  const [dayOfMonth, setDayOfMonth] = useState(initialSchedule?.dayOfMonth || 1);
  const [month, setMonth] = useState(initialSchedule?.month || 1);
  const [cronExpression, setCronExpression] = useState(initialSchedule?.cronExpression || "0 9 * * *");

  const description = useMemo(() => {
    const mockSchedule: Schedule = {
      id: "",
      name,
      frequency,
      time,
      daysOfWeek,
      dayOfMonth,
      month,
      cronExpression,
      description: "",
      enabled: true,
      nextRuns: [],
    };
    return getScheduleDescription(mockSchedule);
  }, [frequency, time, daysOfWeek, dayOfMonth, month, cronExpression]);

  const nextRuns = useMemo(() => generateNextRuns(frequency, time), [frequency, time]);

  const handleSave = () => {
    const newSchedule: Schedule = {
      id: initialSchedule?.id || Math.random().toString(36).substr(2, 9),
      name: name || `Schedule ${new Date().toLocaleTimeString()}`,
      frequency,
      time,
      daysOfWeek: frequency === "weekly" ? daysOfWeek : undefined,
      dayOfMonth: ["monthly", "yearly"].includes(frequency) ? dayOfMonth : undefined,
      month: frequency === "yearly" ? month : undefined,
      cronExpression: frequency === "custom" ? cronExpression : undefined,
      description,
      enabled: true,
      nextRuns,
    };
    onSave(newSchedule);
  };

  return (
    <div className="space-y-6 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      {/* Name */}
      <div>
        <label className="text-sm font-medium text-white mb-2 block">Schedule Name</label>
        <input
          type="text"
          placeholder="e.g., Morning Report, Daily Sync"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white placeholder-white/40 focus:outline-none focus:border-white/[0.2] transition-colors"
        />
      </div>

      {/* Frequency */}
      <div>
        <label className="text-sm font-medium text-white mb-2 block">Frequency</label>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {(["once", "hourly", "daily", "weekly", "monthly", "yearly", "custom"] as const).map((freq) => (
            <button
              key={freq}
              onClick={() => setFrequency(freq)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                frequency === freq
                  ? "bg-violet-600 text-white"
                  : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white"
              )}
            >
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      <div>
        <label className="text-sm font-medium text-white mb-2 block">Time of Day</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white focus:outline-none focus:border-white/[0.2] transition-colors"
        />
      </div>

      {/* Weekly Settings */}
      {frequency === "weekly" && (
        <div>
          <label className="text-sm font-medium text-white mb-2 block">Days of Week</label>
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                onClick={() => {
                  if (daysOfWeek.includes(day.value)) {
                    setDaysOfWeek(daysOfWeek.filter((d) => d !== day.value));
                  } else {
                    setDaysOfWeek([...daysOfWeek, day.value]);
                  }
                }}
                className={cn(
                  "p-2 rounded-lg text-sm font-medium transition-all duration-200",
                  daysOfWeek.includes(day.value)
                    ? "bg-blue-600 text-white"
                    : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                )}
              >
                {day.short}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Settings */}
      {frequency === "monthly" && (
        <div>
          <label className="text-sm font-medium text-white mb-2 block">Day of Month</label>
          <select
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
            className="w-full px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white focus:outline-none focus:border-white/[0.2] transition-colors"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day} className="bg-slate-900">
                Day {day}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Yearly Settings */}
      {frequency === "yearly" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-white mb-2 block">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white focus:outline-none focus:border-white/[0.2] transition-colors"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value} className="bg-slate-900">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-white mb-2 block">Day</label>
            <select
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white focus:outline-none focus:border-white/[0.2] transition-colors"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day} className="bg-slate-900">
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Cron Expression */}
      {frequency === "custom" && (
        <div>
          <label className="text-sm font-medium text-white mb-2 block">Cron Expression</label>
          <input
            type="text"
            placeholder="0 9 * * * (every day at 9 AM)"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white placeholder-white/40 font-mono text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
          />
          <p className="text-xs text-white/50 mt-1">Format: minute hour day month day_of_week</p>
        </div>
      )}

      {/* Preview */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
        <p className="text-xs text-white/50 mb-2">Schedule Preview</p>
        <p className="text-sm font-medium text-white mb-3">{description}</p>

        <div className="space-y-1">
          <p className="text-xs text-white/50 mb-2">Next 5 Runs:</p>
          {nextRuns.slice(0, 3).map((run, idx) => (
            <p key={idx} className="text-xs text-white/60">
              • {run}
            </p>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors"
        >
          <Check className="w-4 h-4" />
          Save Schedule
        </button>
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ScheduleCard({ schedule, onEdit, onDelete }: { schedule: Schedule; onEdit: () => void; onDelete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-lg font-semibold text-white">{schedule.name}</h4>
          <p className="text-sm text-white/60 mt-1">{schedule.description}</p>
        </div>

        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          schedule.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
        )}>
          {schedule.enabled ? "Active" : "Inactive"}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs text-white/50 mb-2">Next 3 Runs</p>
        {schedule.nextRuns.slice(0, 3).map((run, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-white/60">
            <Calendar className="w-3 h-3 text-white/40" />
            {run}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-medium transition-colors opacity-0 group-hover:opacity-100"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: "sch-001",
      name: "Daily Report",
      frequency: "daily",
      time: "09:00",
      description: "Daily at 09:00",
      enabled: true,
      nextRuns: generateNextRuns("daily", "09:00"),
    },
    {
      id: "sch-002",
      name: "Weekly Team Sync",
      frequency: "weekly",
      time: "14:00",
      daysOfWeek: ["monday", "wednesday", "friday"],
      description: "Every week on Mon, Wed, Fri at 14:00",
      enabled: true,
      nextRuns: generateNextRuns("weekly", "14:00"),
    },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingSchedule = editingId ? schedules.find((s) => s.id === editingId) : undefined;

  const handleSave = (schedule: Schedule) => {
    if (editingId) {
      setSchedules(schedules.map((s) => (s.id === editingId ? schedule : s)));
      setEditingId(null);
    } else {
      setSchedules([...schedules, schedule]);
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setSchedules(schedules.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">Schedule Manager</h1>
          <p className="text-white/50">
            Create recurring schedules for your workflows. Build cron expressions with a simple, human-readable interface.
          </p>
        </div>

        {/* Add Button */}
        {!showForm && (
          <button
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors mb-8"
          >
            <Plus className="w-4 h-4" />
            Create Schedule
          </button>
        )}

        {/* Form */}
        {showForm && (
          <ScheduleForm
            initialSchedule={editingSchedule}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          />
        )}

        {/* Schedules List */}
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No schedules yet</p>
            </div>
          ) : (
            schedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onEdit={() => {
                  setEditingId(schedule.id);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(schedule.id)}
              />
            ))
          )}
        </div>

        {/* Help Section */}
        <div className="mt-12 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Cron Format
          </h3>
          <div className="space-y-2 text-sm text-white/70">
            <p>Format: <code className="font-mono text-white/80">minute hour day month day_of_week</code></p>
            <div className="grid grid-cols-5 gap-4 mt-3">
              <div>
                <p className="font-medium text-white mb-1">Minute</p>
                <p className="text-xs">0-59</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Hour</p>
                <p className="text-xs">0-23</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Day</p>
                <p className="text-xs">1-31</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Month</p>
                <p className="text-xs">1-12</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Day of Week</p>
                <p className="text-xs">0-6 (Sun-Sat)</p>
              </div>
            </div>
            <div className="mt-4 space-y-1 text-xs">
              <p><code className="font-mono bg-white/[0.05] px-2 py-1 rounded">0 9 * * *</code> = Every day at 9 AM</p>
              <p><code className="font-mono bg-white/[0.05] px-2 py-1 rounded">0 14 * * 1,3,5</code> = Mon, Wed, Fri at 2 PM</p>
              <p><code className="font-mono bg-white/[0.05] px-2 py-1 rounded">0 0 1 * *</code> = First day of each month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
