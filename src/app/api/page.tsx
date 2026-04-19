"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Code2,
  Copy,
  Check,
  ChevronDown,
  Lock,
  BookOpen,
  Zap,
  Server,
  AlertCircle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  title: string;
  description: string;
  auth: boolean;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  body?: string;
  response: string;
  example: string;
}

const ENDPOINTS: APIEndpoint[] = [
  {
    method: "POST",
    path: "/api/workflows",
    title: "Create Workflow",
    description: "Create a new workflow with triggers, actions, and conditions.",
    auth: true,
    body: `{
  "name": "Daily Report",
  "description": "Generate and send daily reports",
  "status": "draft",
  "triggers": [{"type": "schedule", "cron": "0 9 * * *"}],
  "actions": [{"type": "email", "to": "team@example.com"}]
}`,
    response: `{
  "id": "wf-001",
  "name": "Daily Report",
  "status": "draft",
  "createdAt": "2025-01-15T10:30:00Z"
}`,
    example: `curl -X POST https://api.dobly.app/api/workflows \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Daily Report",
    "triggers": [{"type": "schedule", "cron": "0 9 * * *"}]
  }'`,
  },
  {
    method: "GET",
    path: "/api/workflows/{id}",
    title: "Get Workflow",
    description: "Retrieve details for a specific workflow.",
    auth: true,
    parameters: [
      { name: "id", type: "string", required: true, description: "Workflow ID" },
    ],
    response: `{
  "id": "wf-001",
  "name": "Daily Report",
  "status": "active",
  "triggers": [...],
  "actions": [...],
  "conditions": [...],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T14:22:00Z"
}`,
    example: `curl https://api.dobly.app/api/workflows/wf-001 \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: "PUT",
    path: "/api/workflows/{id}",
    title: "Update Workflow",
    description: "Update an existing workflow configuration.",
    auth: true,
    body: `{
  "name": "Updated Name",
  "status": "active",
  "actions": [...]
}`,
    response: `{
  "id": "wf-001",
  "name": "Updated Name",
  "status": "active",
  "updatedAt": "2025-01-20T14:25:00Z"
}`,
    example: `curl -X PUT https://api.dobly.app/api/workflows/wf-001 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "active"}'`,
  },
  {
    method: "POST",
    path: "/api/workflows/{id}/execute",
    title: "Execute Workflow",
    description: "Manually trigger a workflow execution with optional input data.",
    auth: true,
    body: `{
  "input": {
    "email": "user@example.com",
    "amount": 1500
  }
}`,
    response: `{
  "executionId": "exec-123",
  "workflowId": "wf-001",
  "status": "running",
  "startedAt": "2025-01-20T14:30:00Z"
}`,
    example: `curl -X POST https://api.dobly.app/api/workflows/wf-001/execute \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"email": "user@example.com"}}'`,
  },
  {
    method: "GET",
    path: "/api/executions/{id}",
    title: "Get Execution Details",
    description: "Retrieve detailed logs for a workflow execution.",
    auth: true,
    parameters: [{ name: "id", type: "string", required: true, description: "Execution ID" }],
    response: `{
  "executionId": "exec-123",
  "workflowId": "wf-001",
  "status": "success",
  "startedAt": "2025-01-20T14:30:00Z",
  "completedAt": "2025-01-20T14:30:45Z",
  "duration": 45000,
  "steps": [
    {"name": "Check Email", "status": "success", "duration": 100},
    {"name": "Send Email", "status": "success", "duration": 500}
  ]
}`,
    example: `curl https://api.dobly.app/api/executions/exec-123 \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: "GET",
    path: "/api/integrations",
    title: "List Available Integrations",
    description: "Get all available integration options.",
    auth: true,
    response: `{
  "integrations": [
    {
      "id": "slack",
      "name": "Slack",
      "category": "communication",
      "authenticated": true
    },
    {
      "id": "stripe",
      "name": "Stripe",
      "category": "payments",
      "authenticated": false
    }
  ]
}`,
    example: `curl https://api.dobly.app/api/integrations \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
];

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <pre className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.1] text-white/80 text-xs overflow-x-auto font-mono">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-lg bg-white/[0.1] hover:bg-white/[0.2] transition-colors"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Copy className="w-4 h-4 text-white/60" />
        )}
      </button>
    </div>
  );
}

function EndpointCard({ endpoint, index }: { endpoint: APIEndpoint; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const methodColors = {
    GET: "bg-blue-500/20 text-blue-400",
    POST: "bg-emerald-500/20 text-emerald-400",
    PUT: "bg-yellow-500/20 text-yellow-400",
    DELETE: "bg-red-500/20 text-red-400",
    PATCH: "bg-purple-500/20 text-purple-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors group mb-2"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <span className={cn("px-3 py-1 rounded font-mono text-xs font-bold", methodColors[endpoint.method])}>
              {endpoint.method}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{endpoint.title}</p>
              <p className="text-xs text-white/50 font-mono truncate">{endpoint.path}</p>
            </div>
          </div>
          {endpoint.auth && <Lock className="w-4 h-4 text-white/50 flex-shrink-0" />}
          <ChevronDown
            className={cn("w-4 h-4 text-white/50 transition-transform flex-shrink-0", expanded && "rotate-180")}
          />
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 rounded-lg border border-white/[0.08] bg-white/[0.02] space-y-4 mb-4"
        >
          {/* Description */}
          <div>
            <p className="text-xs text-white/50 font-semibold mb-2">DESCRIPTION</p>
            <p className="text-sm text-white/80">{endpoint.description}</p>
          </div>

          {/* Parameters */}
          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div>
              <p className="text-xs text-white/50 font-semibold mb-2">PARAMETERS</p>
              <div className="space-y-2">
                {endpoint.parameters.map((param) => (
                  <div key={param.name} className="text-xs text-white/70">
                    <span className="font-mono text-white">{param.name}</span>
                    <span className="text-white/50"> ({param.type})</span>
                    {param.required && <span className="text-red-400 ml-2">*required</span>}
                    <p className="text-white/60 mt-1">{param.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Body */}
          {endpoint.body && (
            <div>
              <p className="text-xs text-white/50 font-semibold mb-2">REQUEST BODY</p>
              <CodeBlock code={endpoint.body} language="json" />
            </div>
          )}

          {/* Response */}
          <div>
            <p className="text-xs text-white/50 font-semibold mb-2">RESPONSE</p>
            <CodeBlock code={endpoint.response} language="json" />
          </div>

          {/* cURL Example */}
          <div>
            <p className="text-xs text-white/50 font-semibold mb-2">EXAMPLE</p>
            <CodeBlock code={endpoint.example} language="bash" />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function APIDocumentationPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEndpoints = ENDPOINTS.filter((endpoint) => {
    const search = searchQuery.toLowerCase();
    return (
      endpoint.title.toLowerCase().includes(search) ||
      endpoint.path.toLowerCase().includes(search) ||
      endpoint.description.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)]">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/[0.1] bg-[rgba(8,8,16,0.8)] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">API Reference</h1>
          <p className="text-white/50 text-sm mt-1">Build and deploy automations programmatically</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Getting Started */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Getting Started</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <Zap className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Authentication</h3>
              <p className="text-white/70 text-sm">
                All API requests require an API key. Get one from your account settings.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <Server className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Base URL</h3>
              <p className="text-white/70 text-sm font-mono text-xs">https://api.dobly.app</p>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <BookOpen className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Rate Limits</h3>
              <p className="text-white/70 text-sm">1000 requests/hour per API key</p>
            </div>
          </div>

          {/* Auth Example */}
          <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Authentication Example</h3>
            <CodeBlock
              code={`# Include your API key in the Authorization header
curl https://api.dobly.app/api/workflows \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
            />
          </div>

          {/* Error Handling */}
          <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-emerald-300 font-medium mb-2">Error Handling</p>
                <p className="text-sm text-emerald-200/80 mb-2">
                  All errors return appropriate HTTP status codes with JSON error details:
                </p>
                <CodeBlock
                  code={`{
  "error": "invalid_request",
  "message": "Missing required field: name",
  "code": 400
}`}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search endpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white placeholder-white/40 focus:outline-none focus:border-white/[0.2] transition-colors"
            />
          </div>
        </div>

        {/* Endpoints */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Endpoints</h2>

          <div className="space-y-2">
            {filteredEndpoints.length === 0 ? (
              <p className="text-white/50 text-center py-8">No endpoints found matching your search</p>
            ) : (
              filteredEndpoints.map((endpoint, idx) => (
                <EndpointCard key={endpoint.path} endpoint={endpoint} index={idx} />
              ))
            )}
          </div>
        </motion.div>

        {/* Webhooks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-6">Webhooks</h2>

          <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Subscribe to Events</h3>
            <p className="text-white/70 mb-4">
              Webhooks allow you to receive real-time notifications when workflow events occur. Configure webhook endpoints in your account settings.
            </p>

            <h4 className="text-sm font-semibold text-white mb-3">Available Events:</h4>
            <div className="space-y-2">
              {[
                { event: "workflow.executed", description: "Workflow execution completed" },
                { event: "workflow.failed", description: "Workflow execution failed" },
                { event: "workflow.deployed", description: "Workflow deployed to production" },
                { event: "execution.step_completed", description: "A workflow step completed" },
              ].map((item) => (
                <div key={item.event} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                  <span className="text-xs font-mono text-blue-400 flex-shrink-0">{item.event}</span>
                  <span className="text-xs text-white/60">{item.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <h3 className="text-sm font-semibold text-white mb-4">Webhook Payload Example</h3>
            <CodeBlock
              code={`{
  "event": "workflow.executed",
  "timestamp": "2025-01-20T14:30:45Z",
  "data": {
    "executionId": "exec-123",
    "workflowId": "wf-001",
    "status": "success",
    "duration": 2500
  }
}`}
            />
          </div>
        </motion.div>

        {/* SDK */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl border border-purple-500/30 bg-purple-500/5"
        >
          <div className="flex items-start gap-3">
            <Code2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-purple-300 font-medium mb-2">Official SDKs Available</p>
              <p className="text-sm text-purple-200/80 mb-4">
                We provide SDKs for Node.js, Python, Go, and Ruby. Install via package manager:
              </p>
              <div className="space-y-2">
                <CodeBlock code="npm install @dobly/sdk" />
                <CodeBlock code="pip install dobly-sdk" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
