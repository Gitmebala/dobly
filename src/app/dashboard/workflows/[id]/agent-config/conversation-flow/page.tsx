"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import type { ConversationNode } from "@/types";

const DEFAULT_FLOW: ConversationNode[] = [
  {
    id: "greeting",
    type: "greeting",
    text: "Hello! Thank you for calling. How can I help you today?",
  },
  {
    id: "main-question",
    type: "question",
    text: "Could you tell me more about what you need?",
    nextNode: "end",
  },
  {
    id: "end",
    type: "end",
    text: "Thank you for calling. Goodbye!",
  },
];

export default function ConversationFlowPage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [nodes, setNodes] = useState<ConversationNode[]>(DEFAULT_FLOW);
  const [selectedNode, setSelectedNode] = useState<string>("greeting");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/agent-config`);
        if (response.ok) {
          const { agentConfig } = await response.json();
          if (agentConfig?.conversationFlow?.length > 0) {
            setNodes(agentConfig.conversationFlow);
            setSelectedNode(agentConfig.conversationFlow[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [workflowId]);

  const currentNode = nodes.find((n) => n.id === selectedNode);

  function updateCurrentNode(updates: Partial<ConversationNode>) {
    setNodes((current) =>
      current.map((n) => (n.id === selectedNode ? { ...n, ...updates } : n))
    );
  }

  function addNode(type: ConversationNode["type"]) {
    const newId = `node-${Date.now()}`;
    const newNode: ConversationNode = {
      id: newId,
      type,
      text: `New ${type} node`,
    };
    setNodes((current) => [...current, newNode]);
    setSelectedNode(newId);
  }

  function deleteNode() {
    if (nodes.length > 1) {
      const remainingNodes = nodes.filter((n) => n.id !== selectedNode);
      setNodes(remainingNodes);
      setSelectedNode(remainingNodes[0]?.id ?? "greeting");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/agent-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: {
            definition: {
              operator: {
                agentConfig: {
                  conversationFlow: nodes,
                },
              },
            },
          },
        }),
      });
      if (!response.ok) throw new Error("Failed to save");
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-text-muted">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text">Conversation Flow</h2>
        <p className="mt-2 text-text-muted">Design the conversation tree with branching logic</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Node List */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="font-medium text-text mb-3">Conversation Nodes</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedNode(node.id)}
                className={`w-full text-left rounded-lg border p-2 transition-all ${
                  selectedNode === node.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:bg-[rgba(255,255,255,0.02)]"
                }`}
              >
                <div className="text-xs font-medium uppercase tracking-wider text-text-dim">
                  {node.type}
                </div>
                <div className="text-sm text-text truncate">{node.text}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => addNode("question")}
              className="btn-secondary w-full text-sm"
            >
              <Plus className="h-3 w-3" />
              Add Question
            </button>
            <button
              onClick={() => addNode("decision")}
              className="btn-secondary w-full text-sm"
            >
              <Plus className="h-3 w-3" />
              Add Branch
            </button>
            <button onClick={() => addNode("action")} className="btn-secondary w-full text-sm">
              <Plus className="h-3 w-3" />
              Add Action
            </button>
            {nodes.length > 1 && (
              <button onClick={deleteNode} className="btn-ghost w-full text-sm text-red-400">
                <Trash2 className="h-3 w-3" />
                Delete Node
              </button>
            )}
          </div>
        </div>

        {/* Node Editor */}
        {currentNode && (
          <div className="rounded-lg border border-border p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text">Node Type</label>
                <p className="mt-2 text-sm text-text-muted capitalize">{currentNode.type}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text">Message Text</label>
                <textarea
                  value={currentNode.text}
                  onChange={(e) => updateCurrentNode({ text: e.target.value })}
                  className="input mt-2 min-h-[100px]"
                />
              </div>

              {currentNode.type !== "end" && (
                <div>
                  <label className="block text-sm font-medium text-text">Next Node</label>
                  <select
                    value={currentNode.nextNode || ""}
                    onChange={(e) => updateCurrentNode({ nextNode: e.target.value || undefined })}
                    className="input mt-2"
                  >
                    <option value="">Select next node...</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.type}: {n.text.substring(0, 40)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentNode.type === "decision" && (
                <div>
                  <label className="block text-sm font-medium text-text">Branching Conditions</label>
                  <p className="text-xs text-text-muted mt-1">
                    Add conditions for this branch (e.g., if customer says "cancel")
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 border-t border-border pt-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
