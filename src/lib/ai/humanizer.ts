/**
 * AI Text Humanizer
 * Removes AI-generated patterns and makes text sound more natural
 * Based on Wikipedia's "Signs of AI writing" patterns
 */

export interface HumanizationOptions {
  formality: "casual" | "professional" | "neutral";
  personality: "direct" | "friendly" | "analytical";
  avoidAIVocabulary: boolean;
  reduceComplexity: boolean;
}

export interface AIWritingPattern {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  description: string;
}

/**
 * List of AI vocabulary words to avoid (from Wikipedia research)
 */
const AI_VOCABULARY = new Set([
  // 2023-mid 2024 (GPT-4)
  "additionally", "boasts", "bolstered", "crucial", "delve", "delving", "delved",
  "emphasizing", "enduring", "garner", "intricate", "intricacies", "interplay",
  "key", "landscape", "meticulous", "meticulously", "pivotal", "underscore",
  "tapestry", "testament", "valuable", "vibrant",
  
  // Mid-2024-mid 2025 (GPT-4o)
  "align with", "enhance", "fostering", "highlighting", "showcasing",
  
  // Mid-2025+ (GPT-5)
  // (Words from "Undue emphasis" category)
  "notably", "remarkably", "significantly", "substantially", "noteworthy",
  
  // Overused regardless of era
  "concrete", "furthermore", "moreover", "consequently", "nevertheless",
  "nonetheless", "therefore", "thus", "hence", "whereas", "whilst",
]);

/**
 * AI writing patterns to detect and fix
 */
const AI_PATTERNS: AIWritingPattern[] = [
  // Negative parallelisms
  {
    pattern: /not only\s+(.+?),\s+but\s+also\s+(.+?)/gi,
    replacement: "$1 and $2",
    description: "Not only... but also construction"
  },
  {
    pattern: /it\s+is\s+not\s+just\s+(.+?),\s+it's\s+(.+?)/gi,
    replacement: "$1 is $2",
    description: "Not just... it's construction"
  },
  {
    pattern: /not\s+(.+?),\s+but\s+rather\s+(.+?)/gi,
    replacement: "$1 is actually $2",
    description: "Not... but rather construction"
  },
  {
    pattern: /no\s+(.+?),\s+no\s+(.+?),\s+just\s+(.+?)/gi,
    replacement: "$1 and $2 are simply $3",
    description: "No... no... just construction"
  },
  
  // Avoidance of basic copulas
  {
    pattern: /\b(\w+)\s+serves\s+as\s+a\s+/gi,
    replacement: "$1 is a ",
    description: "Serves as a -> is a"
  },
  {
    pattern: /\b(\w+)\s+marks\s+a\s+/gi,
    replacement: "$1 is a ",
    description: "Marks a -> is a"
  },
  {
    pattern: /\b(\w+)\s+represents\s+a\s+/gi,
    replacement: "$1 represents ",
    description: "Represents a -> represents"
  },
  {
    pattern: /\b(\w+)\s+constitutes\s+a\s+/gi,
    replacement: "$1 is a ",
    description: "Constitutes a -> is a"
  },
  
  // Rule of three (overused)
  {
    pattern: /(.+?),\s+(.+?),\s+and\s+(.+?)(?=\s*[.,;])/g,
    replacement: (match, p1, p2, p3) => {
      // Randomly vary the structure
      const structures = [
        `${p1}, ${p2}, and ${p3}`,
        `${p1} and ${p2}. ${p3}`,
        `${p1}. ${p2} and ${p3}`,
      ];
      return structures[Math.floor(Math.random() * structures.length)];
    },
    description: "Vary list structures"
  },
  
  // Overuse of "enhance", "showcase", etc.
  {
    pattern: /\benhance(s|d)?\s+/gi,
    replacement: (match) => {
      const alternatives = ["improve", "boost", "strengthen", "upgrade", "better"];
      return alternatives[Math.floor(Math.random() * alternatives.length)] + " ";
    },
    description: "Enhance -> improve/boost/strengthen"
  },
  {
    pattern: /\bshowcase(s|d)?\s+/gi,
    replacement: (match) => {
      const alternatives = ["display", "demonstrate", "reveal", "present", "show"];
      return alternatives[Math.floor(Math.random() * alternatives.length)] + " ";
    },
    description: "Showcase -> display/demonstrate/reveal"
  },
];

/**
 * Main humanization function
 */
export function humanizeText(text: string, options: HumanizationOptions = {
  formality: "neutral",
  personality: "direct",
  avoidAIVocabulary: true,
  reduceComplexity: true,
}): string {
  let result = text;

  // Step 1: Replace AI vocabulary
  if (options.avoidAIVocabulary) {
    result = replaceAIVocabulary(result, options);
  }

  // Step 2: Fix AI writing patterns
  result = fixAIPatterns(result);

  // Step 3: Adjust complexity
  if (options.reduceComplexity) {
    result = reduceComplexity(result, options);
  }

  // Step 4: Add personality
  result = addPersonality(result, options);

  // Step 5: Clean up
  result = cleanupText(result);

  return result;
}

/**
 * Replace AI vocabulary words with alternatives
 */
function replaceAIVocabulary(text: string, options: HumanizationOptions): string {
  const words = text.split(/\s+/);
  
  return words.map(word => {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
    
    if (AI_VOCABULARY.has(cleanWord)) {
      return getAlternative(cleanWord, options);
    }
    
    return word;
  }).join(' ');
}

/**
 * Get alternative for AI vocabulary word
 */
function getAlternative(word: string, options: HumanizationOptions): string {
  const alternatives: Record<string, string[]> = {
    "crucial": ["important", "essential", "key", "vital"],
    "pivotal": ["key", "important", "central", "critical"],
    "intricate": ["complex", "detailed", "involved", "complicated"],
    "meticulous": ["careful", "detailed", "thorough", "precise"],
    "vibrant": ["lively", "energetic", "dynamic", "active"],
    "testament": ["proof", "evidence", "sign", "indicator"],
    "landscape": ["environment", "setting", "context", "situation"],
    "enhance": ["improve", "boost", "strengthen", "upgrade"],
    "showcase": ["display", "demonstrate", "reveal", "present"],
    "fostering": ["encouraging", "supporting", "promoting", "developing"],
    "bolster": ["strengthen", "reinforce", "support", "boost"],
    "garner": ["gather", "collect", "earn", "receive"],
    "delve": ["explore", "examine", "investigate", "look into"],
  };

  const wordAlternatives = alternatives[word];
  if (!wordAlternatives || wordAlternatives.length === 0) {
    return word;
  }

  // Choose alternative based on formality
  if (options.formality === "casual") {
    return wordAlternatives[0] || word;
  } else if (options.formality === "professional") {
    return wordAlternatives[wordAlternatives.length - 1] || word;
  }
  
  // Neutral - pick middle option
  return wordAlternatives[Math.floor(wordAlternatives.length / 2)] || word;
}

/**
 * Fix AI writing patterns
 */
function fixAIPatterns(text: string): string {
  let result = text;

  for (const pattern of AI_PATTERNS) {
    result = typeof pattern.replacement === "string"
      ? result.replace(pattern.pattern, pattern.replacement)
      : result.replace(pattern.pattern, pattern.replacement);
  }

  return result;
}

/**
 * Reduce text complexity
 */
function reduceComplexity(text: string, options: HumanizationOptions): string {
  let result = text;

  // Break up long sentences
  result = result.replace(/([.!?])\s+([A-Z])/g, "$1\n\n$2");
  
  // Simplify complex words
  const complexWords: Record<string, string> = {
    "utilize": "use",
    "facilitate": "help",
    "implement": "do",
    "subsequently": "then",
    "consequently": "so",
    "therefore": "so",
    "furthermore": "also",
    "moreover": "also",
  };

  for (const [complex, simple] of Object.entries(complexWords)) {
    const regex = new RegExp(`\\b${complex}\\b`, 'gi');
    result = result.replace(regex, simple);
  }

  return result;
}

/**
 * Add personality to text
 */
function addPersonality(text: string, options: HumanizationOptions): string {
  if (options.personality === "direct") {
    // Use active voice, be concise
    text = text.replace(/\b(is|are|was|were)\s+(\w+ed)\s+by\s+/g, (match) => {
      return match.replace(/is|are|was|were/, "").replace(/ed by/, "");
    });
  } else if (options.personality === "friendly") {
    // Add conversational elements
    text = text.replace(/\b(important|key|crucial)\b/gi, (match) => {
      const friendly = ["really important", "worth noting", "keep in mind"];
      return friendly[Math.floor(Math.random() * friendly.length)];
    });
  } else if (options.personality === "analytical") {
    // Add analytical markers
    text = text.replace(/(\.)/g, ". This suggests that");
  }

  return text;
}

/**
 * Clean up final text
 */
function cleanupText(text: string): string {
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ');
  
  // Fix capitalization
  text = text.replace(/(\.|\?|\!)\s+([a-z])/g, (match, punct, letter) => {
    return punct + ' ' + letter.toUpperCase();
  });
  
  // Remove double punctuation
  text = text.replace(/([.!?])\s*[.!?]/g, '$1');
  
  return text.trim();
}

/**
 * Detect if text sounds like AI
 */
export function detectAIWriting(text: string): {
  score: number;
  patterns: string[];
  suggestions: string[];
} {
  let score = 0;
  const patterns: string[] = [];
  const suggestions: string[] = [];

  // Check for AI vocabulary
  const words = text.toLowerCase().split(/\s+/);
  const aiWordCount = words.filter(word => AI_VOCABULARY.has(word)).length;
  if (aiWordCount > 0) {
    score += aiWordCount * 10;
    patterns.push(`Contains ${aiWordCount} AI vocabulary words`);
    suggestions.push("Replace AI vocabulary with simpler alternatives");
  }

  // Check for AI patterns
  for (const pattern of AI_PATTERNS) {
    if (pattern.pattern.test(text)) {
      score += 15;
      patterns.push(pattern.description);
      suggestions.push(`Avoid "${pattern.description}" pattern`);
    }
  }

  // Check sentence complexity
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = text.split(/\s+/).length / sentences.length;
  if (avgWordsPerSentence > 20) {
    score += 10;
    patterns.push("Sentences too complex");
    suggestions.push("Break up long sentences");
  }

  return {
    score: Math.min(100, score),
    patterns,
    suggestions,
  };
}
