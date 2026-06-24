/**
 * Expense Categorization AI for Finance Department
 * Automatically categorizes expenses and provides insights
 */

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  vendor: string;
  category?: string;
  subcategory?: string;
  accountCode?: string;
  department?: string;
  project?: string;
  receipt?: {
    url: string;
    extractedText?: string;
    confidence?: number;
  };
  metadata: {
    paymentMethod: string;
    currency: string;
    reference?: string;
    notes?: string;
  };
  status: "uncategorized" | "categorized" | "verified" | "flagged";
}

export interface CategoryPrediction {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
  keywords: string[];
  patterns: string[];
}

export interface CategoryDefinition {
  id: string;
  name: string;
  description: string;
  accountCode: string;
  keywords: string[];
  patterns: RegExp[];
  rules: CategoryRule[];
  parentCategory?: string;
  subcategories: CategoryDefinition[];
  budgetLimits?: {
    monthly: number;
    quarterly: number;
    annual: number;
  };
}

export interface CategoryRule {
  type: "vendor" | "amount" | "description" | "date" | "department";
  operator: "equals" | "contains" | "greater_than" | "less_than" | "between" | "regex";
  value: string | number | [number, number];
  action: "include" | "exclude" | "require_review";
  weight: number;
}

export interface CategorizationResult {
  expenseId: string;
  predictions: CategoryPrediction[];
  selectedCategory?: CategoryPrediction;
  confidence: number;
  requiresReview: boolean;
  reasoning: string;
  processedAt: string;
  alternativeCategories: CategoryPrediction[];
}

export interface ExpenseInsight {
  type: "overspending" | "unusual_pattern" | "duplicate" | "policy_violation" | "budget_alert";
  severity: "info" | "warning" | "critical";
  description: string;
  expenseIds: string[];
  amount?: number;
  threshold?: number;
  recommendation: string;
}

/**
 * Categorize expense using AI
 */
export async function categorizeExpense(
  expense: ExpenseItem,
  categoryDefinitions: CategoryDefinition[],
  historicalData?: {
    similarExpenses: ExpenseItem[];
    vendorPatterns: Record<string, string>;
    userPreferences: Record<string, string>;
  }
): Promise<CategorizationResult> {
  // Step 1: Extract features from expense
  const features = extractExpenseFeatures(expense);
  
  // Step 2: Match against category keywords and patterns
  const keywordMatches = matchKeywords(features, categoryDefinitions);
  
  // Step 3: Apply category rules
  const ruleMatches = applyCategoryRules(features, categoryDefinitions);
  
  // Step 4: Use historical patterns
  const historicalMatches = analyzeHistoricalPatterns(features, historicalData);
  
  // Step 5: Calculate category scores
  const categoryScores = calculateCategoryScores(
    keywordMatches,
    ruleMatches,
    historicalMatches,
    categoryDefinitions
  );
  
  // Step 6: Generate predictions
  const predictions = generateCategoryPredictions(categoryScores, categoryDefinitions);
  
  // Step 7: Select best prediction
  const selectedCategory = predictions.length > 0 ? predictions[0] : undefined;
  
  // Step 8: Determine if review is required
  const requiresReview = determineReviewRequirement(selectedCategory, expense, predictions);
  
  // Step 9: Generate reasoning
  const reasoning = generateCategorizationReasoning(selectedCategory, predictions, features);

  return {
    expenseId: expense.id,
    predictions,
    selectedCategory,
    confidence: selectedCategory?.confidence || 0,
    requiresReview,
    reasoning,
    processedAt: new Date().toISOString(),
    alternativeCategories: predictions.slice(1, 4),
  };
}

/**
 * Extract features from expense for analysis
 */
function extractExpenseFeatures(expense: ExpenseItem): {
  description: string[];
  vendor: string;
  amount: number;
  keywords: string[];
  patterns: string[];
} {
  // Clean and tokenize description
  const descriptionWords = expense.description
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);

  // Extract keywords from vendor name
  const vendorWords = expense.vendor
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);

  // Identify common patterns
  const patterns: string[] = [];
  
  // Amount patterns
  if (expense.amount < 10) patterns.push("small_amount");
  if (expense.amount > 1000) patterns.push("large_amount");
  if (expense.amount % 1 === 0) patterns.push("round_amount");
  
  // Date patterns
  const expenseDate = new Date(expense.date);
  if (expenseDate.getDay() === 0 || expenseDate.getDay() === 6) {
    patterns.push("weekend");
  }
  
  // Description patterns
  if (/\d{4}/.test(expense.description)) patterns.push("contains_numbers");
  if (expense.description.includes("Invoice") || expense.description.includes("Bill")) {
    patterns.push("invoice_like");
  }

  return {
    description: descriptionWords,
    vendor: expense.vendor.toLowerCase(),
    amount: expense.amount,
    keywords: [...descriptionWords, ...vendorWords],
    patterns,
  };
}

/**
 * Match keywords against category definitions
 */
function matchKeywords(
  features: ReturnType<typeof extractExpenseFeatures>,
  categories: CategoryDefinition[]
): Record<string, number> {
  const matches: Record<string, number> = {};

  categories.forEach(category => {
    let score = 0;

    // Match description keywords
    features.keywords.forEach(keyword => {
      if (category.keywords.some(catKeyword => 
        catKeyword.toLowerCase() === keyword || 
        catKeyword.toLowerCase().includes(keyword) ||
        keyword.includes(catKeyword.toLowerCase())
      )) {
        score += 1;
      }
    });

    // Match patterns
    category.patterns.forEach(pattern => {
      if (pattern.test(features.description.join(' ')) ||
          pattern.test(features.vendor)) {
        score += 2;
      }
    });

    if (score > 0) {
      matches[category.id] = score;
    }
  });

  return matches;
}

/**
 * Apply category rules
 */
function applyCategoryRules(
  features: ReturnType<typeof extractExpenseFeatures>,
  categories: CategoryDefinition[]
): Record<string, number> {
  const matches: Record<string, number> = {};

  categories.forEach(category => {
    let score = 0;

    category.rules.forEach(rule => {
      let match = false;

      switch (rule.type) {
        case "vendor":
          match = evaluateStringRule(features.vendor, rule.operator, rule.value);
          break;
        case "description":
          match = evaluateStringRule(features.description.join(' '), rule.operator, rule.value);
          break;
        case "amount":
          match = evaluateNumberRule(features.amount, rule.operator, rule.value);
          break;
        case "department":
          // Would need department info from expense
          break;
        case "date":
          // Would need date evaluation
          break;
      }

      if (match) {
        score += rule.weight;
      }
    });

    if (score > 0) {
      matches[category.id] = score;
    }
  });

  return matches;
}

/**
 * Analyze historical patterns
 */
function analyzeHistoricalPatterns(
  features: ReturnType<typeof extractExpenseFeatures>,
  historicalData?: {
    similarExpenses: ExpenseItem[];
    vendorPatterns: Record<string, string>;
    userPreferences: Record<string, string>;
  }
): Record<string, number> {
  const matches: Record<string, number> = {};

  if (!historicalData) return matches;

  // Vendor-based patterns
  const vendorCategory = historicalData.vendorPatterns[features.vendor];
  if (vendorCategory) {
    matches[vendorCategory] = 3; // Strong weight for vendor patterns
  }

  // Similar expenses
  historicalData.similarExpenses.forEach(expense => {
    if (expense.category && expense.status === "verified") {
      // Calculate similarity
      const similarity = calculateExpenseSimilarity(features, expense);
      if (similarity > 0.7) {
        matches[expense.category] = (matches[expense.category] || 0) + similarity * 2;
      }
    }
  });

  // User preferences
  Object.entries(historicalData.userPreferences).forEach(([category, preference]) => {
    if (features.keywords.some(keyword => 
      preference.toLowerCase().includes(keyword) ||
      keyword.includes(preference.toLowerCase())
    )) {
      matches[category] = (matches[category] || 0) + 1;
    }
  });

  return matches;
}

/**
 * Calculate category scores
 */
function calculateCategoryScores(
  keywordMatches: Record<string, number>,
  ruleMatches: Record<string, number>,
  historicalMatches: Record<string, number>,
  categories: CategoryDefinition[]
): Record<string, { score: number; confidence: number }> {
  const scores: Record<string, { score: number; confidence: number }> = {};

  const allCategoryIds = new Set([
    ...Object.keys(keywordMatches),
    ...Object.keys(ruleMatches),
    ...Object.keys(historicalMatches)
  ]);

  allCategoryIds.forEach(categoryId => {
    const keywordScore = keywordMatches[categoryId] || 0;
    const ruleScore = ruleMatches[categoryId] || 0;
    const historicalScore = historicalMatches[categoryId] || 0;

    // Weighted scoring
    const totalScore = (keywordScore * 0.4) + (ruleScore * 0.3) + (historicalScore * 0.3);

    // Calculate confidence based on consistency
    const scores = [keywordScore, ruleScore, historicalScore].filter(s => s > 0);
    const confidence = scores.length > 0 ? 
      1 - (Math.max(...scores) - Math.min(...scores)) / Math.max(...scores) : 0;

    scores[categoryId] = {
      score: totalScore,
      confidence: Math.max(0.3, confidence), // Minimum confidence
    };
  });

  return scores;
}

/**
 * Generate category predictions
 */
function generateCategoryPredictions(
  scores: Record<string, { score: number; confidence: number }>,
  categories: CategoryDefinition[]
): CategoryPrediction[] {
  const predictions: CategoryPrediction[] = [];

  Object.entries(scores)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 5) // Top 5 predictions
    .forEach(([categoryId, { score, confidence }]) => {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        predictions.push({
          categoryId,
          categoryName: category.name,
          confidence,
          reasoning: generatePredictionReasoning(score, category),
          keywords: category.keywords,
          patterns: category.patterns.map(p => p.toString()),
        });
      }
    });

  return predictions;
}

/**
 * Generate prediction reasoning
 */
function generatePredictionReasoning(score: number, category: CategoryDefinition): string {
  const reasons: string[] = [];

  if (score > 5) {
    reasons.push("Strong match with category keywords and patterns");
  } else if (score > 3) {
    reasons.push("Good match with category characteristics");
  } else {
    reasons.push("Partial match with category");
  }

  if (category.keywords.length > 0) {
    reasons.push(`Matches keywords: ${category.keywords.slice(0, 3).join(", ")}`);
  }

  return reasons.join(". ");
}

/**
 * Determine if review is required
 */
function determineReviewRequirement(
  selectedCategory: CategoryPrediction | undefined,
  expense: ExpenseItem,
  predictions: CategoryPrediction[]
): boolean {
  // Low confidence requires review
  if (!selectedCategory || selectedCategory.confidence < 0.6) {
    return true;
  }

  // Large amounts require review
  if (expense.amount > 5000) {
    return true;
  }

  // Close predictions require review
  if (predictions.length > 1 && predictions[1].confidence > 0.5) {
    return true;
  }

  // Unclear descriptions require review
  if (expense.description.length < 10) {
    return true;
  }

  return false;
}

/**
 * Generate categorization reasoning
 */
function generateCategorizationReasoning(
  selectedCategory: CategoryPrediction | undefined,
  predictions: CategoryPrediction[],
  features: ReturnType<typeof extractExpenseFeatures>
): string {
  if (!selectedCategory) {
    return "Unable to confidently categorize expense - requires manual review";
  }

  let reasoning = `Categorized as "${selectedCategory.categoryName}" with ${Math.round(selectedCategory.confidence * 100)}% confidence.`;

  if (selectedCategory.keywords.length > 0) {
    reasoning += ` Matched keywords: ${selectedCategory.keywords.slice(0, 3).join(", ")}.`;
  }

  if (predictions.length > 1) {
    reasoning += ` Alternative categories considered: ${predictions.slice(1, 3).map(p => p.categoryName).join(", ")}.`;
  }

  return reasoning;
}

/**
 * Batch categorize multiple expenses
 */
export async function batchCategorizeExpenses(
  expenses: ExpenseItem[],
  categoryDefinitions: CategoryDefinition[],
  historicalData?: any
): Promise<CategorizationResult[]> {
  const results: CategorizationResult[] = [];

  for (const expense of expenses) {
    const result = await categorizeExpense(expense, categoryDefinitions, historicalData);
    results.push(result);
  }

  return results;
}

/**
 * Generate expense insights
 */
export async function generateExpenseInsights(
  categorizedExpenses: ExpenseItem[],
  categoryDefinitions: CategoryDefinition[],
  timePeriod: "monthly" | "quarterly" = "monthly"
): Promise<ExpenseInsight[]> {
  const insights: ExpenseInsight[] = [];

  // Check for overspending
  categoryDefinitions.forEach(category => {
    if (category.budgetLimits) {
      const categoryExpenses = categorizedExpenses.filter(e => e.category === category.id);
      const totalSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      const budgetLimit = category.budgetLimits[timePeriod === "monthly" ? "monthly" : "quarterly"];
      if (totalSpent > budgetLimit) {
        insights.push({
          type: "overspending",
          severity: totalSpent > budgetLimit * 1.2 ? "critical" : "warning",
          description: `Overspending in ${category.name}: $${totalSpent.toFixed(2)} vs budget $${budgetLimit.toFixed(2)}`,
          expenseIds: categoryExpenses.map(e => e.id),
          amount: totalSpent,
          threshold: budgetLimit,
          recommendation: "Review spending in this category and consider cost-saving measures",
        });
      }
    }
  });

  // Check for unusual patterns
  const insightsByVendor = analyzeSpendingByVendor(categorizedExpenses);
  insights.push(...insightsByVendor);

  // Check for potential duplicates
  const duplicateInsights = findPotentialDuplicates(categorizedExpenses);
  insights.push(...duplicateInsights);

  return insights;
}

/**
 * Analyze spending patterns by vendor
 */
function analyzeSpendingByVendor(expenses: ExpenseItem[]): ExpenseInsight[] {
  const insights: ExpenseInsight[] = [];
  const vendorSpending: Record<string, ExpenseItem[]> = {};

  expenses.forEach(expense => {
    if (!vendorSpending[expense.vendor]) {
      vendorSpending[expense.vendor] = [];
    }
    vendorSpending[expense.vendor].push(expense);
  });

  Object.entries(vendorSpending).forEach(([vendor, vendorExpenses]) => {
    // Check for unusually frequent purchases
    if (vendorExpenses.length > 10) {
      insights.push({
        type: "unusual_pattern",
        severity: "warning",
        description: `High frequency purchases from ${vendor}: ${vendorExpenses.length} transactions`,
        expenseIds: vendorExpenses.map(e => e.id),
        recommendation: "Review if bulk purchasing or subscription would be more cost-effective",
      });
    }

    // Check for increasing amounts
    const amounts = vendorExpenses.map(e => e.amount).sort((a, b) => a - b);
    if (amounts.length > 3 && amounts[amounts.length - 1] > amounts[0] * 2) {
      insights.push({
        type: "unusual_pattern",
        severity: "info",
        description: `Increasing purchase amounts from ${vendor}`,
        expenseIds: vendorExpenses.map(e => e.id),
        recommendation: "Monitor for price increases or changing requirements",
      });
    }
  });

  return insights;
}

/**
 * Find potential duplicate expenses
 */
function findPotentialDuplicates(expenses: ExpenseItem[]): ExpenseInsight[] {
  const insights: ExpenseInsight[] = [];
  const duplicates: Record<string, ExpenseItem[]> = {};

  expenses.forEach(expense => {
    // Create a key based on amount, vendor, and date proximity
    const key = `${expense.vendor}_${Math.round(expense.amount)}_${new Date(expense.date).getMonth()}`;
    
    if (!duplicates[key]) {
      duplicates[key] = [];
    }
    duplicates[key].push(expense);
  });

  Object.values(duplicates).forEach(duplicateGroup => {
    if (duplicateGroup.length > 1) {
      insights.push({
        type: "duplicate",
        severity: "warning",
        description: `Potential duplicate expenses: ${duplicateGroup.length} similar transactions`,
        expenseIds: duplicateGroup.map(e => e.id),
        recommendation: "Review for potential duplicate submissions",
      });
    }
  });

  return insights;
}

/**
 * Helper functions for rule evaluation
 */
function evaluateStringRule(value: string, operator: string, ruleValue: any): boolean {
  switch (operator) {
    case "equals":
      return value === ruleValue;
    case "contains":
      return value.includes(ruleValue);
    case "regex":
      return new RegExp(ruleValue).test(value);
    default:
      return false;
  }
}

function evaluateNumberRule(value: number, operator: string, ruleValue: any): boolean {
  switch (operator) {
    case "equals":
      return value === ruleValue;
    case "greater_than":
      return value > ruleValue;
    case "less_than":
      return value < ruleValue;
    case "between":
      return Array.isArray(ruleValue) && value >= ruleValue[0] && value <= ruleValue[1];
    default:
      return false;
  }
}

/**
 * Calculate expense similarity
 */
function calculateExpenseSimilarity(
  features: ReturnType<typeof extractExpenseFeatures>,
  expense: ExpenseItem
): number {
  let similarity = 0;

  // Vendor similarity
  if (features.vendor === expense.vendor.toLowerCase()) {
    similarity += 0.4;
  }

  // Amount similarity (within 10%)
  const amountDiff = Math.abs(features.amount - expense.amount) / expense.amount;
  if (amountDiff < 0.1) {
    similarity += 0.3;
  }

  // Description similarity
  const expenseWords = expense.description.toLowerCase().split(/\s+/);
  const commonWords = features.keywords.filter(word => 
    expenseWords.some(eWord => eWord.includes(word) || word.includes(eWord))
  );
  if (commonWords.length > 0) {
    similarity += 0.3 * (commonWords.length / Math.max(features.keywords.length, expenseWords.length));
  }

  return similarity;
}

/**
 * Update category definitions based on feedback
 */
export function updateCategoryDefinitions(
  categories: CategoryDefinition[],
  feedback: Array<{
    expenseId: string;
    correctCategory: string;
    incorrectCategory: string;
    features: any;
  }>
): CategoryDefinition[] {
  const updatedCategories = [...categories];

  feedback.forEach(({ correctCategory, incorrectCategory, features }) => {
    // Reinforce correct category
    const correctCat = updatedCategories.find(c => c.id === correctCategory);
    if (correctCat && features.keywords) {
      features.keywords.forEach((keyword: string) => {
        if (!correctCat.keywords.includes(keyword)) {
          correctCat.keywords.push(keyword);
        }
      });
    }

    // Weaken incorrect category
    const incorrectCat = updatedCategories.find(c => c.id === incorrectCategory);
    if (incorrectCat && features.keywords) {
      features.keywords.forEach((keyword: string) => {
        const index = incorrectCat.keywords.indexOf(keyword);
        if (index > -1) {
          incorrectCat.keywords.splice(index, 1);
        }
      });
    }
  });

  return updatedCategories;
}
