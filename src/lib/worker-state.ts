// Persistent State Management for Dobly AI Workers
// Enables workers to maintain context, learn from experience, and build business memory

import type { 
  Workflow, 
  WorkflowRun, 
  WorkflowActionStep
} from '@/types/index';

// Interface for worker state persistence
export interface WorkerState {
  id: string;
  workerId: string;
  workflowId: string;
  key: string;
  value: unknown;
  type: 'context' | 'memory' | 'learning' | 'cache';
  confidence: number; // 0-1, how confident we are in this state
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // Optional TTL
  metadata?: Record<string, unknown>;
}

// State persistence layer (would connect to actual database in production)
class StatePersistence {
  private states: Map<string, WorkerState> = new Map();
  
  // Save state with TTL support
  async save(state: Omit<WorkerState, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const fullState: WorkerState = {
      ...state,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.states.set(id, fullState);
    return id;
  }
  
  // Retrieve state by ID
  async get(id: string): Promise<WorkerState | null> {
    return this.states.get(id) || null;
  }

  async listAll(): Promise<WorkerState[]> {
    return Array.from(this.states.values());
  }
  
  // Find states by workerId, workflowId, and key pattern
  async findByQuery(
    workerId: string, 
    workflowId: string, 
    keyPattern: string,
    type?: WorkerState['type']
  ): Promise<WorkerState[]> {
    const matches: WorkerState[] = [];
    
    for (const state of this.states.values()) {
      if (
        state.workerId === workerId &&
        state.workflowId === workflowId &&
        state.key.includes(keyPattern) &&
        (!type || state.type === type)
      ) {
        matches.push(state);
      }
    }
    
    // Sort by confidence and recency
    return matches.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }
  
  // Update state value
  async update(id: string, updates: Partial<Omit<WorkerState, 'id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    const state = this.states.get(id);
    if (!state) return false;
    
    const updated: WorkerState = {
      ...state,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.states.set(id, updated);
    return true;
  }
  
  // Delete state
  async delete(id: string): Promise<boolean> {
    return this.states.delete(id);
  }
  
  // Clean expired states
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    let removed = 0;
    
    for (const [id, state] of this.states.entries()) {
      if (state.expiresAt && new Date(state.expiresAt) < now) {
        this.states.delete(id);
        removed++;
      }
    }
    
    return removed;
  }
}

// Worker State Manager - maintains context across executions
export class WorkerStateManager {
  private persistence: StatePersistence;
  private workflowStates: Map<string, Map<string, unknown>> = new Map(); // workflowId -> stateKey -> value
  
  constructor() {
    this.persistence = new StatePersistence();
    // In production, would load existing state from database on init
  }
  
  // Save context for a worker execution
  async saveContext(
    workerId: string,
    workflowId: string,
    context: Record<string, any>,
    confidence: number = 0.8
  ): Promise<void> {
    const statePromises = Object.entries(context).map(async ([key, value]) => {
      await this.persistence.save({
        workerId,
        workflowId,
        key,
        value,
        type: 'context',
        confidence
      });
    });
    
    await Promise.all(statePromises);
    
    // Also keep in-memory for fast access during execution
    if (!this.workflowStates.has(workflowId)) {
      this.workflowStates.set(workflowId, new Map());
    }
    const workflowState = this.workflowStates.get(workflowId)!;
    Object.entries(context).forEach(([key, value]) => {
      workflowState.set(key, value);
    });
  }
  
  // Load context for a worker
  async loadContext(
    workerId: string,
    workflowId: string,
    keys: string[] = [] // Empty array means load all
  ): Promise<Record<string, any>> {
    const context: Record<string, any> = {};
    
    // Try in-memory cache first
    const cachedState = this.workflowStates.get(workflowId);
    if (cachedState && keys.length === 0) {
      // Return all cached state
      cachedState.forEach((value, key) => {
        context[key] = value;
      });
      return context;
    }
    
    // Load from persistence
    let states: WorkerState[];
    if (keys.length === 0) {
      // Get all context states for this workflow
      states = await this.persistence.findByQuery(
        workerId,
        workflowId,
        '', // Empty pattern matches all
        'context'
      );
    } else {
      // Get specific keys
      states = [];
      for (const key of keys) {
        const keyStates = await this.persistence.findByQuery(
          workerId,
          workflowId,
          key,
          'context'
        );
        states.push(...keyStates);
      }
    }
    
    // Take highest confidence value for each key
    states.forEach(state => {
      if (!context[state.key] || state.confidence > (context[`__conf_${state.key}`] || 0)) {
        context[state.key] = state.value;
        context[`__conf_${state.key}`] = state.confidence;
      }
    });
    
    // Remove confidence markers from final output
    const cleanContext: Record<string, any> = {};
    Object.keys(context).forEach(key => {
      if (!key.startsWith('__conf_')) {
        cleanContext[key] = context[key];
      }
    });
    
    // Update cache
    if (!this.workflowStates.has(workflowId)) {
      this.workflowStates.set(workflowId, new Map());
    }
    const workflowState = this.workflowStates.get(workflowId)!;
    Object.keys(cleanContext).forEach(key => {
      workflowState.set(key, cleanContext[key]);
    });
    
    return cleanContext;
  }
  
  // Save learning from workflow execution (for improvement)
  async saveLearning(
    workerId: string,
    workflowId: string,
    lesson: string,
    outcome: 'success' | 'failure' | 'partial',
    confidence: number = 0.7
  ): Promise<void> {
    await this.persistence.save({
      workerId,
      workflowId,
      key: `lesson-${Date.now()}`,
      value: {
        lesson,
        outcome,
        timestamp: new Date().toISOString()
      },
      type: 'learning',
      confidence
    });
  }
  
  // Get relevant learnings for a workflow
  async getLearnings(
    workflowId: string,
    limit: number = 10
  ): Promise<Array<{ lesson: string; outcome: string; confidence: number }>> {
    // In production, would query by workflowId only (workerId can be wildcard)
    // For now, simplified implementation
    const allStates = await this.persistence.listAll();
    const learnings = allStates
      .filter(state => 
        state.workflowId === workflowId && 
        state.type === 'learning'
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
      .map(state => ({
        lesson: String((state.value as { lesson?: unknown }).lesson ?? ""),
        outcome: String((state.value as { outcome?: unknown }).outcome ?? "partial"),
        confidence: state.confidence
      }));
    
    return learnings;
  }
  
  // Save business memory (patterns that work well for this business)
  async saveBusinessMemory(
    workflowId: string,
    pattern: string,
    effectiveness: number, // 0-1 scale
    context: Record<string, any> = {}
  ): Promise<void> {
    // This would be associated with the business/workspace, not just worker
    // For now, using workflowId as proxy
    await this.persistence.save({
      workerId: 'business-memory', // Special worker ID for business-level memory
      workflowId,
      key: `pattern-${Date.now()}`,
      value: {
        pattern,
        effectiveness,
        context,
        timestamp: new Date().toISOString()
      },
      type: 'memory',
      confidence: effectiveness
    });
  }
  
  // Get business memories that might apply to current situation
  async getBusinessMemory(
    workflowId: string,
    contextKeys: string[] = []
  ): Promise<Array<{ pattern: string; effectiveness: number; context: Record<string, any> }>> {
    const allStates = await this.persistence.listAll();
    const memories = allStates
      .filter(state => 
        state.workerId === 'business-memory' && 
        state.workflowId === workflowId &&
        state.type === 'memory'
      )
      .sort((a, b) => b.confidence - a.confidence)
      .map(state => ({
        pattern: String((state.value as { pattern?: unknown }).pattern ?? ""),
        effectiveness: Number((state.value as { effectiveness?: unknown }).effectiveness ?? 0),
        context: ((state.value as { context?: Record<string, any> }).context || {}) as Record<string, any>
      }));
    
    return memories;
  }
  
  // Clear state for a workflow (e.g., when resetting)
  async clearWorkflowState(workflowId: string): Promise<number> {
    const allStates = await this.persistence.listAll();
    const toDelete = allStates.filter(state => state.workflowId === workflowId);
    
    for (const state of toDelete) {
      this.persistence.delete(state.id);
    }
    
    // Clear cache
    this.workflowStates.delete(workflowId);
    
    return toDelete.length;
  }
}

// Global state manager instance
export const workerStateManager = new WorkerStateManager();

// Hooks for integrating state management into workflow execution
export class StatefulWorkerExecution {
  private static buildStepOutput(step: WorkflowActionStep, context: Record<string, unknown>) {
    const output: Record<string, unknown> = {
      app: step.app,
      actionType: step.actionType,
      acknowledgedAt: new Date().toISOString(),
    };

    if (step.config?.loadState) {
      output.loadedStateKeys = Object.keys(context);
    }

    if (step.config?.saveContext) {
      output.savedContextKeys = Object.keys(context);
    }

    if (step.config?.saveLearnings) {
      output.learningSignal = "Execution trace persisted for future runs.";
    }

    return output;
  }

  private static deriveLearnings(stepResults: WorkflowRun["step_results"]) {
    const completedSteps = stepResults.filter((step) => step.status === "success");
    const failedSteps = stepResults.filter((step) => step.status === "failed");
    const learnings: Array<{ lesson: string; outcome: "success" | "failure" | "partial"; confidence: number }> = [];

    if (completedSteps.length > 0) {
      learnings.push({
        lesson: `The workflow completed ${completedSteps.length} step${completedSteps.length === 1 ? "" : "s"} successfully when starting context was present.`,
        outcome: failedSteps.length === 0 ? "success" : "partial",
        confidence: failedSteps.length === 0 ? 0.82 : 0.68,
      });
    }

    if (failedSteps.length > 0) {
      learnings.push({
        lesson: `The workflow needs attention on: ${failedSteps.map((step) => step.name).join(", ")}.`,
        outcome: "failure",
        confidence: 0.72,
      });
    }

    if (learnings.length === 0) {
      learnings.push({
        lesson: "The workflow executed without concrete steps, so state was preserved but no execution learning was produced.",
        outcome: "partial",
        confidence: 0.55,
      });
    }

    return learnings;
  }

  // Enhance a workflow definition with state awareness
  static enhanceWorkflowWithState(
    workflow: Workflow
  ): Workflow {
    // Add state-related steps to workflow definition
    const existingDefinition = workflow.blueprint.definition;
    const existingSteps = existingDefinition?.steps ?? [];
    const firstStep = existingSteps[0];
    const enhancedSteps: WorkflowActionStep[] = [
      ...(firstStep
        ? [
            {
              ...firstStep,
              // Add state loading at the beginning.
              config: {
                ...firstStep.config,
                loadState: true,
              },
            },
          ]
        : []),
      ...existingSteps.slice(1),
      {
        // Add state saving at the end
        id: `state-save-${Date.now()}`,
        name: 'Save Worker State',
        description: 'Persist context and learnings from this execution',
        app: 'dobly',
        actionType: 'skill', // Would be a special skill for state saving
        config: {
          saveContext: true,
          saveLearnings: true
        },
        enabled: true
      }
    ];
    
    // Return enhanced workflow blueprint
    return {
      ...workflow,
      blueprint: {
        ...workflow.blueprint,
        definition: {
          version: existingDefinition?.version ?? 1,
          trigger: existingDefinition?.trigger ?? { type: "manual", label: "Manual run" },
          operator: existingDefinition?.operator,
          runtime: existingDefinition?.runtime,
          steps: enhancedSteps,
        }
      }
    };
  }
  
  // Execute workflow with state management
  static async executeWithState(
    workflow: Workflow,
    initialContext: Record<string, any> = {},
    workerId?: string
  ): Promise<{
    run: WorkflowRun;
    finalContext: Record<string, any>;
    learnings: Array<{ lesson: string; outcome: string; confidence: number }>;
  }> {
    const actualWorkerId = workerId || `worker-${workflow.id}-${Date.now()}`;
    
    // Load existing context
    const existingContext = await workerStateManager.loadContext(
      actualWorkerId,
      workflow.id
    );
    
    // Merge with initial context (initial takes precedence)
    const mergedContext = { ...existingContext, ...initialContext };
    
    // Save merged context as starting point
    await workerStateManager.saveContext(
      actualWorkerId,
      workflow.id,
      mergedContext,
      0.9 // High confidence for initial context
    );
    
    const enhanced = this.enhanceWorkflowWithState(workflow);
    const now = Date.now();
    const stepResults: WorkflowRun["step_results"] = [];
    const executionContext: Record<string, unknown> = { ...mergedContext };

    for (const step of enhanced.blueprint.definition?.steps ?? []) {
      const startedAt = new Date().toISOString();
      const output = this.buildStepOutput(step, executionContext);

      if (step.config?.saveContext) {
        executionContext.lastSavedAt = startedAt;
        executionContext.lastSavedByStep = step.name;
      }

      if (step.config?.saveLearnings) {
        executionContext.lastLearningCheckpoint = step.name;
      }

      stepResults.push({
        id: step.id,
        name: step.name,
        status: "success",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        input: step.config ?? null,
        output,
        error: null,
      });
    }

    const run: WorkflowRun = {
      id: `run-${Date.now()}`,
      workflow_id: workflow.id,
      user_id: workflow.user_id,
      status: 'success',
      trigger_type: 'manual',
      trigger_payload: initialContext,
      started_at: new Date(now).toISOString(),
      finished_at: new Date().toISOString(),
      error_message: null,
      step_results: stepResults
    };

    const derivedLearnings = this.deriveLearnings(stepResults);
    
    // Save learnings
    for (const learning of derivedLearnings) {
      await workerStateManager.saveLearning(
        actualWorkerId,
        workflow.id,
        learning.lesson,
        learning.outcome,
        learning.confidence
      );
    }

    if (stepResults.length > 0) {
      await workerStateManager.saveBusinessMemory(
        workflow.id,
        `Workflow ${workflow.title} succeeds when ${stepResults.length} execution step${stepResults.length === 1 ? "" : "s"} complete without ambiguity.`,
        stepResults.every((step) => step.status === "success") ? 0.78 : 0.58,
        {
          workflowTitle: workflow.title,
          successfulSteps: stepResults.filter((step) => step.status === "success").map((step) => step.name),
        }
      );
    }

    await workerStateManager.saveContext(
      actualWorkerId,
      workflow.id,
      executionContext as Record<string, any>,
      0.88
    );
    
    // Get final context (would be actual state after execution)
    const finalContext = await workerStateManager.loadContext(
      actualWorkerId,
      workflow.id
    );
    
    return {
      run,
      finalContext,
      learnings: derivedLearnings
    };
  }
}
