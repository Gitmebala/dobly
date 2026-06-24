// Execution Engine for Dobly AI Workers
// Transforms Dobly from a workflow designer to an AI Worker Operating System

import type { 
  Workflow, 
  WorkflowDefinition, 
  WorkflowRun, 
  WorkflowOperator,
  WorkflowRuntimeConfig,
  Connection,
  WorkflowActionStep,
  WorkflowRunStatus
} from '@/types/index';
import { getConnectorExecutor } from '@/lib/connectors/registry';

// Sandboxed execution environment for AI workers
export class WorkerSandbox {
  private context: Map<string, any> = new Map();
  private activeExecutions: Set<string> = new Set();
  
  constructor() {
    // Initialize sandbox with safe globals
    this.initializeSafeEnvironment();
  }
  
  private initializeSafeEnvironment() {
    // Only allow safe, whitelisted operations
    this.context.set('Math', Math);
    this.context.set('Date', Date);
    this.context.set('JSON', { 
      parse: JSON.parse, 
      stringify: JSON.stringify 
    });
    // Add safe string/array methods
    this.context.set('String', String);
    this.context.set('Array', Array);
    // Add logging capability
    this.context.set('log', (msg: string) => 
      console.log(`[WORKER] ${new Date().toISOString()}: ${msg}`)
    );
  }
  
  // Execute a single workflow step in sandbox
  async executeStep(
    step: WorkflowActionStep, 
    workflow: Workflow,
    runId: string,
    stepInputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const executionId = `${runId}-step-${step.id}-${Date.now()}`;
    
    try {
      this.activeExecutions.add(executionId);
      
      // Get connector executor for this step
      const executor = getConnectorExecutor(`${step.app}:${step.connectorActionId}`);
      if (!executor) {
        throw new Error(`No executor found for ${step.app}:${step.connectorActionId}`);
      }
      
      // Build execution context
      const context = {
        workflow,
        runId,
        definition: workflow.blueprint.definition,
        trigger: { type: 'manual' }, // Simplified for now
        triggerPayload: {},
        step,
        config: step.config,
        stepOutputs: stepInputs
      } as any;
      
      // Execute with timeout and safety checks
      const result = await Promise.race([
        executor.execute(context),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Step execution timeout')), 30000)
        )
      ]);
      
      // Store outputs for next steps
      if (step.saveOutputAs) {
        this.context.set(step.saveOutputAs, result);
      }
      if (step.saveToMemory) {
        step.saveToMemory.forEach(key => {
          this.context.set(key, result);
        });
      }
      
      return result as Record<string, any>;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }
  
  // Get value from sandbox context
  get(key: string): any {
    return this.context.get(key);
  }
  
  // Set value in sandbox context
  set(key: string, value: any): void {
    this.context.set(key, value);
  }
  
  // Check if execution is active
  isActive(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }
}

// Worker Lifecycle Manager
export class WorkerLifecycleManager {
  private workers: Map<string, WorkerInstance> = new Map();
  private sandbox: WorkerSandbox;
  
  constructor() {
    this.sandbox = new WorkerSandbox();
  }
  
  // Spawn a new worker from workflow definition
  async spawnWorker(
    workflow: Workflow,
    initialContext: Record<string, any> = {}
  ): Promise<string> {
    const workerId = `worker-${workflow.id}-${Date.now()}`;
    
    // Initialize worker context
    Object.entries(initialContext).forEach(([key, value]) => {
      this.sandbox.set(key, value);
    });
    
    const workerInstance = new WorkerInstance(
      workerId,
      workflow,
      this.sandbox
    );
    
    this.workers.set(workerId, workerInstance);
    
    // Start worker execution
    workerInstance.start().catch(error => {
      console.error(`Worker ${workerId} failed to start:`, error);
      this.handleWorkerFailure(workerId, error);
    });
    
    return workerId;
  }
  
  // Halt a running worker
  async haltWorker(workerId: string): Promise<boolean> {
    const worker = this.workers.get(workerId);
    if (!worker) return false;
    
    await worker.halt();
    this.workers.delete(workerId);
    return true;
  }
  
  // Get worker status
  getWorkerStatus(workerId: string): { 
    status: 'running' | 'halted' | 'completed' | 'failed'; 
    progress?: any 
  } | null {
    const worker = this.workers.get(workerId);
    if (!worker) return null;
    return worker.getStatus();
  }
  
  private async handleWorkerFailure(workerId: string, error: Error): Promise<void> {
    console.error(`Worker ${workerId} failed:`, error);
    // Move to failed state, notify user, etc.
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.markFailed(error);
    }
  }
}

// Individual Worker Instance
class WorkerInstance {
  private id: string;
  private workflow: Workflow;
  private sandbox: WorkerSandbox;
  private status: 'running' | 'halted' | 'completed' | 'failed' = 'running';
  private currentStep: number = 0;
  private loopInterval: NodeJS.Timeout | null = null;
  private error: Error | null = null;
  
  constructor(
    id: string,
    workflow: Workflow,
    sandbox: WorkerSandbox
  ) {
    this.id = id;
    this.workflow = workflow;
    this.sandbox = sandbox;
  }
  
  // Start worker execution loop
  async start(): Promise<void> {
    // For continuously running workers (agents, automations)
    if (this.workflow.blueprint.definition?.runtime?.mode === 'agent' ||
        this.workflow.blueprint.definition?.runtime?.mode === 'hybrid') {
      this.loopInterval = setInterval(() => this.executeCycle(), 5000);
    } else {
      // For one-time workflows
      await this.executeCycle();
      this.status = 'completed';
    }
  }
  
  // Execute one cycle of the worker
  private async executeCycle(): Promise<void> {
    if (this.status !== 'running') return;
    
    try {
      const steps = this.workflow.blueprint?.definition?.steps ?? [];
      // Execute workflow steps in sequence
      for (let i = this.currentStep; i < steps.length; i++) {
        const step = steps[i];
        if (!step) continue;
        
        // Check step conditions
        if (!this.evaluateCondition(step.condition)) {
          continue;
        }
        
        // Execute step
        const result = await this.sandbox.executeStep(
          step,
          this.workflow,
          this.id,
          {} // Simplified - would pass actual step inputs
        );
        
        this.currentStep = i + 1;
        
        // Check if we should pause for approval
        if (this.requiresApproval(step, result)) {
          this.status = 'halted';
          break;
        }
      }
      
      // If we've completed all steps
      if (this.currentStep >= steps.length) {
        this.status = 'completed';
        if (this.loopInterval) {
          clearInterval(this.loopInterval);
          this.loopInterval = null;
        }
      }
    } catch (err) {
      this.error = err as Error;
      this.status = 'failed';
      if (this.loopInterval) {
        clearInterval(this.loopInterval);
        this.loopInterval = null;
      }
    }
  }
  
  // Halt worker execution
  async halt(): Promise<void> {
    this.status = 'halted';
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }
  
  // Get current worker status
  getStatus(): { 
    status: 'running' | 'halted' | 'completed' | 'failed'; 
    progress?: { 
      currentStep: number; 
      totalSteps: number;
      error?: string;
    } 
  } {
    return {
      status: this.status,
      progress: {
        currentStep: this.currentStep,
        totalSteps: this.workflow.blueprint?.definition?.steps?.length ?? 0,
        error: this.error?.message
      }
    };
  }
  
  // Mark worker as failed
  markFailed(error: Error): void {
    this.error = error;
    this.status = 'failed';
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }
  
  // Evaluate step condition (simplified)
  private evaluateCondition(condition: any): boolean {
    // In reality, this would evaluate against sandbox context
    return !condition || true; // Simplified
  }
  
  // Check if step requires human approval (simplified)
  private requiresApproval(step: WorkflowActionStep, result: any): boolean {
    // Check step configuration for approval requirements
    return step.onFailure === 'escalate' || 
           (step.config && step.config.requiresApproval === true);
  }
}

// Export main execution interface
export const executionEngine = {
  sandbox: new WorkerSandbox(),
  lifecycleManager: new WorkerLifecycleManager(),
  
  // Execute a workflow once
  async executeWorkflow(
    workflow: Workflow,
    context: Record<string, any> = {}
  ): Promise<WorkflowRun> {
    // Implementation would create actual workflow run record
    // This is simplified for now
    const workerId = await this.lifecycleManager.spawnWorker(workflow, context);
    
    // Wait for completion (in reality would use events/pubsub)
    let status: WorkflowRunStatus = 'running';
    const startTime = new Date().toISOString();
    let endTime: string | null = null;
    
    // Poll for completion (would be replaced with proper event handling)
    const maxWaitTime = 30000; // 30 seconds
    const startWait = Date.now();
    
    while (Date.now() - startWait < maxWaitTime) {
      const workerStatus = this.lifecycleManager.getWorkerStatus(workerId);
      if (workerStatus) {
        if (workerStatus.status === 'completed') {
          status = 'success';
          endTime = new Date().toISOString();
          break;
        } else if (workerStatus.status === 'failed') {
          status = 'failed';
          endTime = new Date().toISOString();
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Timeout handling
    if (!endTime) {
      await this.lifecycleManager.haltWorker(workerId);
      status = 'failed';
      endTime = new Date().toISOString();
    }
    
    // Return workflow run record
    return {
      id: `run-${Date.now()}`,
      workflow_id: workflow.id,
      user_id: workflow.user_id,
      status,
      trigger_type: 'manual',
      trigger_payload: {},
      started_at: startTime,
      finished_at: endTime,
      error_message: status === 'failed' ? 'Execution timed out or failed' : null,
      step_results: [] // Would populate with actual step results
    } as WorkflowRun;
  }
};
