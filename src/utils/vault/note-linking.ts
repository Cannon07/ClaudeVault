import { Note } from "../../types/note.js";

export interface RelatedNote {
  note: Note;
  relevanceScore: number;
  connectionType: "tags" | "project" | "category" | "content";
  sharedElements: string[];
}

/**
 * Find related notes for auto-linking
 */
export function findRelatedNotes(currentNote: Note, allNotes: Note[]): Note[] {
  const related: Note[] = [];

  // Find notes with shared tags
  const sharedTagNotes = allNotes.filter(
    (note) =>
      note.id !== currentNote.id &&
      note.tags.some((tag) => currentNote.tags.includes(tag)),
  );

  // Find notes with shared project
  const sharedProjectNotes = allNotes.filter(
    (note) =>
      note.id !== currentNote.id &&
      note.project &&
      currentNote.project &&
      note.project === currentNote.project,
  );

  // Combine and deduplicate
  const allRelated = [...sharedTagNotes, ...sharedProjectNotes];
  const uniqueRelated = allRelated.filter(
    (note, index, self) => self.findIndex((n) => n.id === note.id) === index,
  );

  // Sort by relevance and return top 5
  return uniqueRelated
    .sort((a, b) => {
      const aSharedTags = a.tags.filter((tag) =>
        currentNote.tags.includes(tag),
      ).length;
      const bSharedTags = b.tags.filter((tag) =>
        currentNote.tags.includes(tag),
      ).length;
      return bSharedTags - aSharedTags;
    })
    .slice(0, 5);
}

/**
 * Find related notes with detailed relevance scoring
 */
export function findRelatedNotesWithScoring(
  currentNote: Note,
  allNotes: Note[],
): RelatedNote[] {
  const relatedNotes: RelatedNote[] = [];

  for (const note of allNotes) {
    if (note.id === currentNote.id) continue;

    const connections = analyzeNoteConnections(currentNote, note);
    if (connections.relevanceScore > 0) {
      relatedNotes.push(connections);
    }
  }

  // Sort by relevance score (descending) and return top 10
  return relatedNotes
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}

/**
 * Analyze connections between two notes
 */
function analyzeNoteConnections(noteA: Note, noteB: Note): RelatedNote {
  let score = 0;
  let connectionType: RelatedNote["connectionType"] = "content";
  let sharedElements: string[] = [];

  // Check shared tags (highest weight)
  const sharedTags = noteA.tags.filter((tag) => noteB.tags.includes(tag));
  if (sharedTags.length > 0) {
    score += sharedTags.length * 10;
    connectionType = "tags";
    sharedElements.push(...sharedTags);
  }

  // Check shared project (high weight)
  if (noteA.project && noteB.project && noteA.project === noteB.project) {
    score += 15;
    connectionType = "project";
    sharedElements.push(noteA.project);
  }

  // Check shared category (medium weight)
  if (noteA.category && noteB.category && noteA.category === noteB.category) {
    score += 8;
    connectionType = "category";
    sharedElements.push(noteA.category);
  }

  // Check content similarity (lower weight, basic keyword matching)
  const contentSimilarity = calculateContentSimilarity(
    noteA.content,
    noteB.content,
  );
  if (contentSimilarity > 0.3) {
    score += Math.floor(contentSimilarity * 5);
    if (score === Math.floor(contentSimilarity * 5)) {
      connectionType = "content";
    }
  }

  return {
    note: noteB,
    relevanceScore: score,
    connectionType,
    sharedElements,
  };
}

/**
 * Calculate basic content similarity between two notes
 */
function calculateContentSimilarity(
  contentA: string,
  contentB: string,
): number {
  // Simple keyword-based similarity
  const wordsA = extractKeywords(contentA);
  const wordsB = extractKeywords(contentB);

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const intersection = wordsA.filter((word) => wordsB.includes(word));
  const union = [...new Set([...wordsA, ...wordsB])];

  return intersection.length / union.length;
}

/**
 * Extract keywords from content (simple implementation)
 */
function extractKeywords(content: string): string[] {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "can",
    "this",
    "that",
    "these",
    "those",
  ]);

  return content
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 20); // Limit to most relevant keywords
}

/**
 * Generate connection summary for display
 */
export function generateConnectionSummary(relatedNote: RelatedNote): string {
  const { connectionType, sharedElements, relevanceScore } = relatedNote;

  switch (connectionType) {
    case "tags":
      return `Shared tags: ${sharedElements.map((tag) => `#${tag}`).join(", ")}`;
    case "project":
      return `Same project: ${sharedElements[0]}`;
    case "category":
      return `Same category: ${sharedElements[0]}`;
    case "content":
      return `Similar content (${Math.round(relevanceScore)}% match)`;
    default:
      return "Related content";
  }
}

/**
 * Find notes that should link to a specific note (backlinks)
 */
export function findBacklinks(targetNote: Note, allNotes: Note[]): Note[] {
  return allNotes.filter((note) => {
    if (note.id === targetNote.id) return false;

    // Check if note mentions target note's title
    const titleMentioned = note.content
      .toLowerCase()
      .includes(targetNote.title.toLowerCase());

    // Check if note has shared high-relevance tags
    const hasStrongTagConnection = note.tags.some(
      (tag) => targetNote.tags.includes(tag) && tag.length > 4, // Longer tags are more specific
    );

    return titleMentioned || hasStrongTagConnection;
  });
}

/**
 * Suggest new connections based on content analysis
 */
export function suggestNewConnections(
  currentNote: Note,
  allNotes: Note[],
): { note: Note; reason: string }[] {
  const suggestions: { note: Note; reason: string }[] = [];

  for (const note of allNotes) {
    if (note.id === currentNote.id) continue;

    // Look for potential connections that aren't already established
    const titleInContent = currentNote.content
      .toLowerCase()
      .includes(note.title.toLowerCase());
    const conceptualSimilarity = hasConceptualSimilarity(currentNote, note);

    if (titleInContent) {
      suggestions.push({
        note,
        reason: `Mentions "${note.title}" in content`,
      });
    } else if (conceptualSimilarity.score > 0.6) {
      suggestions.push({
        note,
        reason: `Conceptually similar: ${conceptualSimilarity.reason}`,
      });
    }
  }

  return suggestions.slice(0, 5);
}

/**
 * Check for conceptual similarity between notes
 */
function hasConceptualSimilarity(
  noteA: Note,
  noteB: Note,
): { score: number; reason: string } {
  // Check for similar patterns in titles
  const titleWords = noteA.title.toLowerCase().split(/\s+/);
  const otherTitleWords = noteB.title.toLowerCase().split(/\s+/);
  const titleOverlap = titleWords.filter((word) =>
    otherTitleWords.includes(word),
  );

  if (titleOverlap.length > 0) {
    return {
      score:
        titleOverlap.length /
        Math.max(titleWords.length, otherTitleWords.length),
      reason: `Similar title keywords: ${titleOverlap.join(", ")}`,
    };
  }

  // Check for related concepts (basic implementation)
  const conceptMap: Record<string, string[]> = {
    development: ["coding", "programming", "software", "tech"],
    design: ["ui", "ux", "interface", "visual"],
    meeting: ["discussion", "call", "agenda", "notes"],
    project: ["task", "milestone", "deadline", "deliverable"],
  };

  for (const [concept, relatedTerms] of Object.entries(conceptMap)) {
    const noteAHasConcept =
      noteA.content.toLowerCase().includes(concept) ||
      noteA.tags.includes(concept);
    const noteBHasRelated = relatedTerms.some(
      (term) =>
        noteB.content.toLowerCase().includes(term) || noteB.tags.includes(term),
    );

    if (noteAHasConcept && noteBHasRelated) {
      return {
        score: 0.7,
        reason: `Related concepts: ${concept} ↔ ${relatedTerms.join("/")}`,
      };
    }
  }

  return { score: 0, reason: "" };
}

/**
 * Calculate network density for a note (how well connected it is)
 */
export function calculateNetworkDensity(note: Note, allNotes: Note[]): number {
  const connections = findRelatedNotesWithScoring(note, allNotes);
  const totalPossibleConnections = allNotes.length - 1; // Exclude self

  if (totalPossibleConnections === 0) return 0;

  const strongConnections = connections.filter(
    (conn) => conn.relevanceScore > 10,
  ).length;
  return strongConnections / totalPossibleConnections;
}
