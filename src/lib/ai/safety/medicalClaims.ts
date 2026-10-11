/**
 * Medical Claim Filter - Stage 10
 * Detects and blocks unsafe medical language in AI output
 */

// Patterns that indicate medical diagnosis/claims
const MEDICAL_CLAIM_PATTERNS = [
  // Direct diagnosis claims
  /\byou (have|has|had)\b.*\b(cancer|diabetes|hypertension|heart disease|stroke|alzheimer|parkinson|ms|multiple sclerosis|lupus|arthritis|asthma|copd|depression|anxiety|bipolar|schizophrenia|autism|adhd|add|ptsd|ocd)\b/i,
  /\byou (likely|probably|definitely|certainly) (have|has)\b/i,
  /\bthis (is|indicates|proves|confirms|suggests|means) (you have|a diagnosis of)\b/i,
  /\b(diagnosis|condition|disease|disorder|illness)\b.*\b(confirmed|detected|identified|found)\b/i,

  // Risk/probability claims
  /\b(you are|you're) (at risk|high risk|low risk|increased risk|at high risk)\b.*\b(of|for)\b/i,
  /\b(risk|probability|chance|likelihood)\b.*\b(\d+%|percent)\b/i,
  /\b(high|low|moderate|elevated) risk\b/i,

  // Treatment/medication recommendations
  /\byou (should|must|need to|have to) (take|start|stop|continue|increase|decrease)\b.*\b(medication|medicine|drug|pill|treatment|therapy|dose|dosage)\b/i,
  /\b(recommend|suggest|advise|prescribe)\b.*\b(taking|starting|stopping)\b.*\b(medication|medicine|treatment)\b/i,
  /\b(start|begin)\b.*\b(treatment|therapy|medication)\b/i,

  // Causality claims
  /\b(caused by|due to|result of|because of)\b.*\b(your|the)\b/i,
  /\bthis (means|indicates|shows|proves)\b.*\b(cause|caused)\b/i,

  // Symptom interpretation as diagnosis
  /\byour (symptoms|signs)\b.*\b(are|indicate|mean|show)\b.*\b(you have|that you have|a)\b/i,
  /\bthese symptoms\b.*\b(are characteristic of|are typical of|indicate|suggest)\b/i,

  // Lab value interpretation
  /\b(your|the) (lab|test|blood|result)\b.*\b(shows|proves|confirms|indicates)\b.*\b(you have|diagnosis)\b/i,
  /\b(elevated|high|low|abnormal|normal)\b.*\b(levels?|values?)\b.*\b(mean|indicate|prove|confirm)\b/i,
];

// Safe alternative language patterns
const SAFE_ALTERNATIVES = [
  { unsafe: "you have", safe: "you recorded" },
  { unsafe: "you likely have", safe: "you reported" },
  { unsafe: "this proves", safe: "your records show" },
  { unsafe: "you are at risk", safe: "you may want to discuss" },
  { unsafe: "you should take", safe: "you may want to discuss with your clinician" },
  { unsafe: "caused by", safe: "you noted occurring around the same time as" },
  { unsafe: "this means you have", safe: "you recorded" },
];

export interface ValidationResult {
  safe: boolean;
  flaggedPhrases: string[];
  rewritten?: string;
}

/**
 * Validates text for unsafe medical claims
 */
export function validateMedicalClaims(text: string): ValidationResult {
  const flagged: string[] = [];

  for (const pattern of MEDICAL_CLAIM_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      flagged.push(...matches);
    }
  }

  if (flagged.length === 0) {
    return { safe: true, flaggedPhrases: [] };
  }

  // Attempt safe rewrite
  let rewritten = text;
  for (const { unsafe, safe } of SAFE_ALTERNATIVES) {
    const regex = new RegExp(unsafe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    rewritten = rewritten.replace(regex, safe);
  }

  return {
    safe: false,
    flaggedPhrases: [...new Set(flagged)],
    rewritten: rewritten !== text ? rewritten : undefined,
  };
}

/**
 * Validates that AI output preserves uncertainty
 */
export function validateUncertaintyPreservation(text: string): ValidationResult {
  const flagged: string[] = [];

  // Check for sharpened uncertainty
  const uncertaintyPatterns = [
    { pattern: /\b(approximately|around|about|roughly)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i, issue: "Approximate date sharpened" },
    { pattern: /\b(maybe|perhaps|might|could be)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i, issue: "Uncertain date presented as certain" },
    { pattern: /\b(exactly|precisely|definitely)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i, issue: "False precision" },
  ];

  for (const { pattern, issue } of uncertaintyPatterns) {
    if (pattern.test(text)) {
      flagged.push(issue);
    }
  }

  return {
    safe: flagged.length === 0,
    flaggedPhrases: flagged,
  };
}

/**
 * Validates source grounding - ensures claims reference sources
 */
export function validateSourceGrounding(text: string, hasSources: boolean): ValidationResult {
  if (!hasSources) {
    // Claims that reference the user's own records ("you recorded",
    // "your entries mention") or uploaded documents ("the document states",
    // "the report says") are grounded in sources and are left alone.
    // Only unattributed external claims are flagged:
    const unsafeClaimPatterns = [
      /\b(research shows|studies indicate|evidence suggests|clinical trials)\b/i, // External claims without citation
      /\b(it is known that|medically speaking|from a medical perspective)\b/i, // Authority claims
    ];

    const flagged: string[] = [];
    for (const pattern of unsafeClaimPatterns) {
      if (pattern.test(text)) {
        flagged.push("Unattributed medical claim");
      }
    }

    return { safe: flagged.length === 0, flaggedPhrases: flagged };
  }

  return { safe: true, flaggedPhrases: [] };
}

/**
 * Main safety validation pipeline
 */
export function validateAIOutput(text: string, options: { hasSources?: boolean } = {}): ValidationResult {
  const results = [
    validateMedicalClaims(text),
    validateUncertaintyPreservation(text),
    validateSourceGrounding(text, options.hasSources ?? false),
  ];

  const allFlagged = results.flatMap((r) => r.flaggedPhrases);
  const allSafe = results.every((r) => r.safe);

  // Try to rewrite using the first rewriter that has one
  let rewritten: string | undefined;
  for (const r of results) {
    if (r.rewritten) {
      rewritten = r.rewritten;
      break;
    }
  }

  return {
    safe: allSafe,
    flaggedPhrases: [...new Set(allFlagged)],
    rewritten,
  };
}