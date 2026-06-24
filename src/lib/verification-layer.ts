// Verification Layer for Dobly AI Workers
// Validates AI outputs, detects hallucinations, and ensures safe execution

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  issues: VerificationIssue[];
  correctedOutput?: any;
  requiresApproval: boolean;
}

export interface VerificationIssue {
  type: 'hallucination' | 'safety' | 'accuracy' | 'compliance' | 'format';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  location?: string;
  suggestion?: string;
}

export interface SafetyPolicy {
  id: string;
  name: string;
  rules: SafetyRule[];
  enforce: boolean;
}

export interface SafetyRule {
  id: string;
  description: string;
  check: (action: WorkflowAction, context: ExecutionContext) => SafetyCheckResult;
  severity: 'critical' | 'warning' | 'info';
}

export interface SafetyCheckResult {
  passed: boolean;
  issue?: string;
  requiresApproval?: boolean;
}

export interface WorkflowAction {
  type: 'data_read' | 'data_write' | 'api_call' | 'file_operation' | 'external_action';
  target: string;
  parameters: Record<string, any>;
  app?: string;
  connectorActionId?: string;
}

export interface ExecutionContext {
  workflowId: string;
  workerId: string;
  stepId: string;
  previousOutputs?: Record<string, any>;
  userContext?: Record<string, any>;
}

export class VerificationLayer {
  private safetyPolicies: SafetyPolicy[] = [];
  private hallucinationDetector: HallucinationDetector;
  private factChecker: FactChecker;

  constructor() {
    this.hallucinationDetector = new HallucinationDetector();
    this.factChecker = new FactChecker();
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies() {
    this.safetyPolicies = [
      {
        id: 'data-access',
        name: 'Data Access Policy',
        enforce: true,
        rules: [
          {
            id: 'pii-detection',
            description: 'Detect PII in data processing',
            severity: 'warning',
            check: (action, context) => this.checkForPII(action, context)
          }
        ]
      },
      {
        id: 'action-safety',
        name: 'Action Safety Policy',
        enforce: true,
        rules: [
          {
            id: 'destructive-action',
            description: 'Block destructive actions without approval',
            severity: 'critical',
            check: (action, context) => this.checkDestructiveAction(action, context)
          },
          {
            id: 'external-communication',
            description: 'Require approval for external communications',
            severity: 'warning',
            check: (action, context) => this.checkExternalAction(action, context)
          }
        ]
      }
    ];
  }

  async verifyAction(
    action: WorkflowAction,
    context: ExecutionContext
  ): Promise<VerificationResult> {
    const issues: VerificationIssue[] = [];
    let requiresApproval = false;

    for (const policy of this.safetyPolicies) {
      if (!policy.enforce) continue;

      for (const rule of policy.rules) {
        const result = rule.check(action, context);
        if (!result.passed) {
          issues.push({
            type: 'safety',
            severity: rule.severity,
            description: result.issue || `Policy violation: ${rule.description}`
          });
          if (result.requiresApproval || rule.severity === 'critical') {
            requiresApproval = true;
          }
        }
      }
    }

    return {
      verified: issues.filter(i => i.severity === 'critical').length === 0,
      confidence: 1 - (issues.length * 0.1),
      issues,
      requiresApproval
    };
  }

  async verifyOutput(
    output: any,
    context: ExecutionContext,
    expectedFormat?: string
  ): Promise<VerificationResult> {
    const issues: VerificationIssue[] = [];

    const hallucinationCheck = await this.hallucinationDetector.check(output, context);
    if (hallucinationCheck.detected) {
      issues.push({
        type: 'hallucination',
        severity: 'critical',
        description: hallucinationCheck.description ?? "Output shows signs of possible hallucination.",
        suggestion: hallucinationCheck.suggestion
      });
    }

    const factCheck = await this.factChecker.verify(output, context);
    factCheck.falseStatements.forEach(stmt => {
      issues.push({
        type: 'accuracy',
        severity: 'warning',
        description: `Potential inaccuracy: ${stmt}`,
        suggestion: 'Verify this information independently'
      });
    });

    if (expectedFormat) {
      const formatCheck = this.checkFormat(output, expectedFormat);
      if (!formatCheck.valid) {
        issues.push({
          type: 'format',
          severity: 'info',
          description: formatCheck.issue ?? "Output did not match the expected format."
        });
      }
    }

    return {
      verified: issues.filter(i => i.severity === 'critical').length === 0,
      confidence: hallucinationCheck.confidence,
      issues,
      requiresApproval: issues.some(i => i.severity === 'critical')
    };
  }

  private checkForPII(action: WorkflowAction, context: ExecutionContext): SafetyCheckResult {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{16}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
    ];

    const paramString = JSON.stringify(action.parameters);
    for (const pattern of piiPatterns) {
      if (pattern.test(paramString)) {
        return {
          passed: false,
          issue: 'Parameters contain potential PII',
          requiresApproval: true
        };
      }
    }

    return { passed: true };
  }

  private checkDestructiveAction(action: WorkflowAction, context: ExecutionContext): SafetyCheckResult {
    const destructiveKeywords = ['delete', 'drop', 'truncate', 'destroy', 'remove_all'];
    const targetStr = (action.target || '').toLowerCase();
    const paramStr = JSON.stringify(action.parameters).toLowerCase();

    for (const keyword of destructiveKeywords) {
      if (targetStr.includes(keyword) || paramStr.includes(keyword)) {
        return {
          passed: false,
          issue: `Destructive action detected: ${keyword}`,
          requiresApproval: true
        };
      }
    }

    return { passed: true };
  }

  private checkExternalAction(action: WorkflowAction, context: ExecutionContext): SafetyCheckResult {
    if (action.type === 'external_action' || action.type === 'api_call') {
      return {
        passed: false,
        issue: 'External action requires human approval',
        requiresApproval: true
      };
    }
    return { passed: true };
  }

  private checkFormat(output: any, expectedFormat: string): { valid: boolean; issue?: string } {
    if (expectedFormat === 'json') {
      if (typeof output !== 'object' || output === null) {
        return { valid: false, issue: 'Output should be a JSON object' };
      }
    } else if (expectedFormat === 'text') {
      if (typeof output !== 'string') {
        return { valid: false, issue: 'Output should be text' };
      }
    }
    return { valid: true };
  }

  addPolicy(policy: SafetyPolicy): void {
    const existingIndex = this.safetyPolicies.findIndex(p => p.id === policy.id);
    if (existingIndex >= 0) {
      this.safetyPolicies[existingIndex] = policy;
    } else {
      this.safetyPolicies.push(policy);
    }
  }
}

class HallucinationDetector {
  async check(
    output: any,
    context: ExecutionContext
  ): Promise<{ detected: boolean; description?: string; confidence: number; suggestion?: string }> {
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);

    const confidenceIndicators = [
      { pattern: /as of my knowledge cutoff/i, weight: -0.5 },
      { pattern: /i'm not sure/i, weight: 0.3 },
      { pattern: /might be/i, weight: 0.2 },
      { pattern: /could be/i, weight: 0.2 },
      { pattern: /\d{4}-\d{2}-\d{2}/, weight: -0.1 } // Dates without context
    ];

    let confidence = 0.9;
    for (const indicator of confidenceIndicators) {
      if (indicator.pattern.test(outputStr)) {
        confidence += indicator.weight;
      }
    }

    if (confidence < 0.7) {
      return {
        detected: true,
        description: 'Output shows signs of low confidence or potential hallucination',
        confidence,
        suggestion: 'Cross-verify factual claims with authoritative sources'
      };
    }

    return { detected: false, confidence };
  }
}

class FactChecker {
  async verify(
    output: any,
    context: ExecutionContext
  ): Promise<{ falseStatements: string[]; verifiedFacts: string[] }> {
    const falseStatements: string[] = [];
    const verifiedFacts: string[] = [];

    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);

    const questionablePatterns = [
      { pattern: /company.*generated.*revenue.*(?:in|of)\s+\$?\d+[kmb]?/i, claim: 'Revenue claims without source' },
      { pattern: /customer.*increased\s+(?:by\s+)?\d+%/i, claim: 'Percentage growth claims without data' }
    ];

    for (const pattern of questionablePatterns) {
      if (pattern.pattern.test(outputStr)) {
        falseStatements.push(pattern.claim);
      }
    }

    return { falseStatements, verifiedFacts };
  }
}

export const verificationLayer = new VerificationLayer();

export async function verifyWorkflowExecution(
  workflow: any,
  stepOutput: any,
  context: ExecutionContext
): Promise<VerificationResult> {
  return verificationLayer.verifyOutput(stepOutput, context);
}

export async function preFlightCheck(
  action: WorkflowAction,
  context: ExecutionContext
): Promise<VerificationResult> {
  return verificationLayer.verifyAction(action, context);
}
