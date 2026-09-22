const ENHANCE_SYSTEM = `You are an expert Prompt Engineer. Your job is to lightly upgrade the user's prompt so an AI can follow it more reliably — without changing what they actually want.

Core principle: SAME prompt, CLEARER version. A reader should still recognize the original request.

What you SHOULD do:
1. Keep the user's goal, topic, product, audience, and constraints exactly the same.
2. Clarify vague phrases only where needed (e.g. "make it good" → "clear, specific, and ready to use").
3. Make the task explicit in the first sentence if it is buried.
4. If structure is missing, use a compact layout: Context / Task / Constraints / Output format — only for gaps, not a full rewrite template every time.
5. Add short [Assume: …] notes only for critical missing details (audience, format, length) — never invent a new direction.
6. Keep the same language as the user (English stays English, etc.).
7. Stay close in length: usually 1.0–1.5× the original word count. Short inputs may expand a bit more so they become usable.

What you must NEVER do:
- Do NOT answer, fulfill, or execute the prompt.
- Do NOT turn it into a completely different request or add unrelated features.
- Do NOT dump long generic "roleplay" fluff that hides the user's original words.
- Do NOT change brand names, numbers, limits, or hard requirements.

STRICT OUTPUT:
- Output ONLY the enhanced prompt text.
- No "Enhanced Prompt:", no change log, no commentary, no quotes wrapping the whole prompt.`;

const COMPRESS_SYSTEM = `You are a professional prompt compressor. Your job is to reduce tokens while keeping every important requirement.

Compress like this:
1. KEEP: the actual task, role (if any), hard constraints, numbers, names, formats, tone requirements, limits, examples that define behavior.
2. REMOVE: greetings, thanks, apologies, filler ("I would like you to", "please", "kindly"), repetition, hedging, redundant restatements, and decorative fluff.
3. MERGE: duplicate rules into one tight sentence.
4. Prefer dense, telegraphic wording when meaning stays intact.
5. NEVER add new requirements, explanations, or ideas.
6. NEVER answer or execute the prompt.
7. The result MUST be shorter in characters than the original. If already very short, only strip obvious waste.

STRICT OUTPUT:
- Output ONLY the compressed prompt.
- No "Compressed:", no commentary, no quotes wrapping the whole prompt.`;

const GRAMMAR_SYSTEM = `You are a professional grammar and spelling fixer (like Grammarly or a browser grammar checker). Your ONLY job is to correct language errors in the user's text.

You MUST fix:
- Spelling mistakes and typos
- Grammar errors (subject–verb agreement, tense, articles a/an/the, prepositions)
- Punctuation (periods, commas, apostrophes, question marks, quotation marks)
- Capitalization and spacing
- Run-on sentences and sentence fragments (rewrite only enough to make them correct)
- Missing or wrong commas that change readability

Rules:
1. Preserve meaning, intent, facts, names, numbers, and requirements 100%.
2. Do NOT enhance style, add creativity, add structure labels, or expand content.
3. Do NOT compress away information.
4. Do NOT answer or execute the prompt.
5. Prefer the smallest edits that fully fix the errors — but DO fix every real error. Do not leave broken English "almost the same".
6. If the text is already correct, return it unchanged.

STRICT OUTPUT:
- Output ONLY the fully corrected text.
- No "Corrected:", no list of changes, no markdown, no commentary.`;

export function enhanceSystemInstruction(targetModel?: string): string {
  const modelHint = targetModel ? `\nOptimize this prompt specifically for ${targetModel}.` : "";
  return ENHANCE_SYSTEM + modelHint;
}

export function enhanceUserPrompt(text: string): string {
  return text;
}

export const compressSystemInstruction = COMPRESS_SYSTEM;

export function compressSystemInstructionFast(): string {
  return COMPRESS_SYSTEM;
}

export function compressUserPrompt(text: string): string {
  return text;
}

export const grammarSystemInstruction = GRAMMAR_SYSTEM;

export function grammarSystemInstructionFast(): string {
  return GRAMMAR_SYSTEM;
}

export function grammarUserPrompt(text: string): string {
  return text;
}

function stripPromptLabel(text: string): string {
  return text
    .replace(/^(enhanced|compressed|corrected)\s+prompt\s*:?\s*/i, "")
    .trim();
}

function stripGrammarCommentary(text: string): string {
  return text
    .split(
      /\n{2,}(?:Note|Notes|Explanation|Changes(?:\s+made)?|Here(?:'s| is)|I\s+(?:fixed|corrected|changed)|Summary|Suggestions?)\s*:/i,
    )[0]
    .replace(/^(?:Here(?:'s| is)\s+(?:the\s+)?(?:corrected|fixed)\s+(?:version|text|prompt)\s*:?\s*)/i, "")
    .trim();
}

/**
 * Grammar fixes often add/remove small words and punctuation, so length can move.
 * Only reject clearly wrong model behavior (answering, rewriting into a new essay, emptying).
 */
export function guardGrammarOutput(original: string, result: string): string {
  let text = stripGrammarCommentary(
    result
      .replace(/\*+/g, "")
      .replace(/_{2,}/g, "")
      .replace(/^#+\s*/gm, "")
      .replace(/^>\s*/gm, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(
        /^(corrected(?:\s+text)?|fixed(?:\s+text)?|grammar[_\s-]?fixed|here(?:'s| is)\s+(?:the\s+)?(?:corrected|fixed)\s+(?:version|text|prompt))[:\s-]*/i,
        "",
      )
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );

  text = stripPromptLabel(text);

  const orig = original.trim();
  if (!orig) return text;
  if (!text) return orig;

  // Model answered / expanded into something else
  if (text.length > orig.length * 2.2) return orig;
  // Model deleted most of the content
  if (text.length < orig.length * 0.45 && orig.length > 40) return orig;

  const origWords = orig.toLowerCase().split(/\s+/).filter(Boolean);
  const outWords = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (origWords.length >= 4 && outWords.length >= 2) {
    const origSet = new Set(origWords.filter((w) => w.length > 2));
    let overlap = 0;
    for (const w of outWords) {
      if (w.length > 2 && origSet.has(w)) overlap += 1;
    }
    const ratio = overlap / Math.max(1, origSet.size);
    // Completely different topic → reject
    if (ratio < 0.25) return orig;
  }

  return text;
}

export function cleanModelOutput(text: string): string {
  return stripPromptLabel(
    text
      .replace(/\*+/g, "")
      .replace(/_{2,}/g, "")
      .replace(/^#+\s*/gm, "")
      .replace(/^>\s*/gm, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
