"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Send,
  Heart,
  Reply,
  MoreVertical,
  Eye,
  ThumbsUp,
  X,
  History,
  Users,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  replies: Comment[];
  isResolved: boolean;
}

interface Approval {
  id: string;
  workflow: string;
  requestedBy: {
    name: string;
    avatar: string;
  };
  reviewers: Array<{
    name: string;
    avatar: string;
    status: "pending" | "approved" | "rejected";
    timestamp?: string;
    comment?: string;
  }>;
  description: string;
  createdAt: string;
  requiredApprovals: number;
}

interface VersionHistory {
  id: string;
  version: number;
  timestamp: string;
  author: {
    name: string;
    avatar: string;
  };
  changes: string;
  description: string;
  isCurrent: boolean;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: "cmt-001",
    author: { name: "Sarah Johnson", avatar: "SJ", role: "Workflow Admin" },
    content: "This workflow looks good! I've tested it on our staging environment and it works perfectly.",
    timestamp: "2 hours ago",
    likes: 3,
    replies: [
      {
        id: "cmt-002",
        author: { name: "Mike Chen", avatar: "MC", role: "Developer" },
        content: "Thanks for testing! Did you encounter any performance issues?",
        timestamp: "1 hour ago",
        likes: 1,
        replies: [],
        isResolved: false,
      },
    ],
    isResolved: false,
  },
  {
    id: "cmt-003",
    author: { name: "Alex Rivera", avatar: "AR", role: "Operations" },
    content: "Can we adjust the email template to match our brand guidelines? Current version doesn't include our logo.",
    timestamp: "30 minutes ago",
    likes: 2,
    replies: [],
    isResolved: true,
  },
];

const MOCK_APPROVALS: Approval[] = [
  {
    id: "apr-001",
    workflow: "Daily Email Report",
    requestedBy: { name: "Sarah Johnson", avatar: "SJ" },
    reviewers: [
      {
        name: "Mike Chen",
        avatar: "MC",
        status: "approved",
        timestamp: "1 hour ago",
        comment: "Looks good to deploy",
      },
      { name: "Lisa Park", avatar: "LP", status: "pending" },
      {
        name: "James Wilson",
        avatar: "JW",
        status: "rejected",
        timestamp: "30 minutes ago",
        comment: "Need to add error handling before approval",
      },
    ],
    description: "Ready for production deployment",
    createdAt: "3 hours ago",
    requiredApprovals: 2,
  },
];

const MOCK_VERSIONS: VersionHistory[] = [
  {
    id: "v-004",
    version: 4,
    timestamp: "Just now",
    author: { name: "Sarah Johnson", avatar: "SJ" },
    changes: "Modified email body condition",
    description: "Fixed conditional logic for email recipients",
    isCurrent: true,
  },
  {
    id: "v-003",
    version: 3,
    timestamp: "2 hours ago",
    author: { name: "Mike Chen", avatar: "MC" },
    changes: "Added error handling in API call",
    description: "Added retry logic for failed API requests",
    isCurrent: false,
  },
  {
    id: "v-002",
    version: 2,
    timestamp: "Yesterday at 3:45 PM",
    author: { name: "Alex Rivera", avatar: "AR" },
    changes: "Updated schedule from daily to weekly",
    description: "Changed execution frequency based on team feedback",
    isCurrent: false,
  },
  {
    id: "v-001",
    version: 1,
    timestamp: "2 days ago",
    author: { name: "Sarah Johnson", avatar: "SJ" },
    changes: "Initial workflow creation",
    description: "Created workflow from template",
    isCurrent: false,
  },
];

function CommentThread({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  const [isLiked, setIsLiked] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-4", depth > 0 && "ml-12 pt-4 border-l border-white/[0.1] pl-4")}
    >
      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-blue-400 flex items-center justify-center text-xs font-bold text-white">
              {comment.author.avatar}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{comment.author.name}</p>
              <p className="text-xs text-white/50">{comment.author.role} • {comment.timestamp}</p>
            </div>
          </div>

          {comment.isResolved && (
            <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Resolved
            </span>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-white/80 mb-3">{comment.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors",
              isLiked ? "text-red-400" : "text-white/50 hover:text-white/70"
            )}
          >
            <Heart className={cn("w-3 h-3", isLiked && "fill-current")} />
            {comment.likes + (isLiked ? 1 : 0)}
          </button>

          <button
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>

          <button className="text-white/50 hover:text-white/70 transition-colors">
            <MoreVertical className="w-3 h-3" />
          </button>
        </div>

        {/* Reply Input */}
        <AnimatePresence>
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/[0.1] flex gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                You
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/[0.2]"
                />
                <div className="flex gap-2 mt-2">
                  <button className="px-3 py-1 rounded bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors flex items-center gap-1">
                    <Send className="w-3 h-3" />
                    Reply
                  </button>
                  <button
                    onClick={() => setIsReplying(false)}
                    className="px-3 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Replies */}
      {comment.replies.map((reply) => (
        <CommentThread key={reply.id} comment={reply} depth={(depth || 0) + 1} />
      ))}
    </motion.div>
  );
}

function ApprovalCard({ approval }: { approval: Approval }) {
  const approvedCount = approval.reviewers.filter((r) => r.status === "approved").length;
  const isApproved = approvedCount >= approval.requiredApprovals;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-white">{approval.workflow}</h4>
          <p className="text-sm text-white/60 mt-1">{approval.description}</p>
          <p className="text-xs text-white/50 mt-2">Requested {approval.createdAt}</p>
        </div>

        <div className={cn(
          "px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2",
          isApproved
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-yellow-500/10 text-yellow-400"
        )}>
          {isApproved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Approved
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              {approvedCount}/{approval.requiredApprovals} approvals
            </>
          )}
        </div>
      </div>

      {/* Reviewers */}
      <div className="space-y-3">
        {approval.reviewers.map((reviewer) => (
          <div key={reviewer.name} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-blue-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {reviewer.avatar}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{reviewer.name}</p>
              {reviewer.comment && <p className="text-xs text-white/60 mt-1">{reviewer.comment}</p>}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {reviewer.status === "approved" && (
                <>
                  <span className="text-xs text-white/50">{reviewer.timestamp}</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </>
              )}
              {reviewer.status === "pending" && <Clock className="w-5 h-5 text-yellow-400" />}
              {reviewer.status === "rejected" && <AlertCircle className="w-5 h-5 text-red-400" />}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function VersionCard({ version }: { version: VersionHistory }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "p-4 rounded-lg border transition-colors",
        version.isCurrent
          ? "border-violet-500/50 bg-violet-500/10"
          : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white">
            {version.author.avatar}
          </div>
          <div>
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              v{version.version}
              {version.isCurrent && (
                <span className="px-2 py-0.5 rounded text-xs bg-violet-600 text-white">Current</span>
              )}
            </p>
            <p className="text-xs text-white/50">{version.author.name} • {version.timestamp}</p>
          </div>
        </div>

        <button className="p-1 rounded hover:bg-white/[0.1] text-white/50 hover:text-white transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-2">
        <p className="text-sm font-medium text-white">{version.changes}</p>
        <p className="text-xs text-white/60 mt-1">{version.description}</p>
      </div>

      {!version.isCurrent && (
        <button className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
          View & Restore
        </button>
      )}
    </motion.div>
  );
}

export default function TeamCollaborationPage() {
  const [activeTab, setActiveTab] = useState<"comments" | "approvals" | "history">("comments");
  const [newComment, setNewComment] = useState("");

  const tabs = [
    { id: "comments", label: "Comments", icon: MessageCircle, count: MOCK_COMMENTS.length },
    { id: "approvals", label: "Approvals", icon: Shield, count: MOCK_APPROVALS.length },
    { id: "history", label: "Version History", icon: History, count: MOCK_VERSIONS.length },
  ] as const;

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">Team Collaboration</h1>
          <p className="text-white/50">
            Collaborate on workflows with your team. Comment, approve changes, and track version history.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/[0.1]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-violet-500 text-white"
                    : "border-transparent text-white/50 hover:text-white/70"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/[0.1] text-xs">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Comments Tab */}
        {activeTab === "comments" && (
          <div className="space-y-6">
            {/* New Comment Input */}
            <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <div className="flex gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  You
                </div>
                <textarea
                  placeholder="Add a comment to discuss this workflow..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:border-white/[0.2] resize-none min-h-20"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white font-medium text-sm transition-colors">
                  Cancel
                </button>
                <button className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Comment
                </button>
              </div>
            </div>

            {/* Comments Thread */}
            <div className="space-y-4">
              {MOCK_COMMENTS.map((comment) => (
                <CommentThread key={comment.id} comment={comment} />
              ))}
            </div>
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === "approvals" && (
          <div className="space-y-4">
            {MOCK_APPROVALS.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} />
            ))}

            {/* Request Approval CTA */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <h3 className="text-lg font-semibold text-white mb-2">Request Approval</h3>
              <p className="text-white/60 text-sm mb-4">
                Get approval from team members before deploying workflows to production.
              </p>
              <button className="px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors flex items-center gap-2">
                <Users className="w-4 h-4" />
                New Approval Request
              </button>
            </div>
          </div>
        )}

        {/* Version History Tab */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {MOCK_VERSIONS.map((version) => (
              <VersionCard key={version.id} version={version} />
            ))}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-8 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Team collaboration is enabled</p>
              <p className="text-sm text-white/60">
                All changes are tracked and timestamped. Team members can leave comments and request approvals before deploying workflows.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
