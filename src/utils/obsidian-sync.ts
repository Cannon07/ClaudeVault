import * as fs from "fs";
import * as path from "path";
import { Note } from "../types/note.js";

// Load environment variables manually
function loadEnvVariables() {
  const envPath = path.join(process.cwd(), "env");

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const lines = envContent.split("\n");

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

loadEnvVariables();

const OBSIDIAN_VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;
const CLAUDEVAULT_FOLDER = process.env.OBSIDIAN_SUBFOLDER || "ClaudeVault";

export interface ObsidianSyncResult {
  success: boolean;
  message: string;
  details?: string;
}

/**
 * Check if Obsidian vault is accessible
 */
export function checkObsidianConnection(): ObsidianSyncResult {
  if (!OBSIDIAN_VAULT_PATH) {
    return {
      success: false,
      message: "Obsidian vault path not configured",
      details: "Please set OBSIDIAN_VAULT_PATH in your .env file",
    };
  }

  if (!fs.existsSync(OBSIDIAN_VAULT_PATH)) {
    return {
      success: false,
      message: "Obsidian vault not found",
      details: `Path does not exist: ${OBSIDIAN_VAULT_PATH}`,
    };
  }

  const vaultFolder = path.join(OBSIDIAN_VAULT_PATH, CLAUDEVAULT_FOLDER);

  // Create ClaudeVault folder if it doesn't exist
  if (!fs.existsSync(vaultFolder)) {
    try {
      fs.mkdirSync(vaultFolder, { recursive: true });
    } catch (error: any) {
      return {
        success: false,
        message: "Cannot create ClaudeVault folder",
        details: error.message,
      };
    }
  }

  return {
    success: true,
    message: "Obsidian vault connection successful",
    details: `Vault: ${OBSIDIAN_VAULT_PATH}\nClaudeVault folder: ${vaultFolder}`,
  };
}

/**
 * Format note as Obsidian-compatible markdown
 */
function formatNoteAsObsidianMarkdown(note: Note): string {
  const frontmatter = `---
id: ${note.id}
created: ${note.timestamp}
project: "${note.project || ""}"
category: "${note.category || ""}"
tags: [${note.tags.map((tag) => `"${tag}"`).join(", ")}]
source: "ClaudeVault"
---

`;

  const tagString =
    note.tags.length > 0
      ? note.tags.map((tag) => `#${tag.replace(/[\s\-]/g, "_")}`).join(" ")
      : "";

  const content = `# ${note.title}

${note.content}

---

**Metadata:**
- 📁 **Project:** ${note.project || "None"}
- 🏷️ **Category:** ${note.category || "None"}  
- 📅 **Created:** ${new Date(note.timestamp).toLocaleDateString()}
- 🔗 **ClaudeVault ID:** \`${note.id}\`

${tagString}
`;

  return frontmatter + content;
}

/**
 * Generate safe filename for Obsidian
 */
function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .toLowerCase()
    .substring(0, 100); // Limit length
}

/**
 * Sync a single note to Obsidian
 */
export function syncNoteToObsidian(note: Note): ObsidianSyncResult {
  const connectionCheck = checkObsidianConnection();
  if (!connectionCheck.success) {
    return connectionCheck;
  }

  try {
    const vaultFolder = path.join(OBSIDIAN_VAULT_PATH!, CLAUDEVAULT_FOLDER);
    const markdown = formatNoteAsObsidianMarkdown(note);
    const filename = `${sanitizeFilename(note.title)}.md`;
    const filePath = path.join(vaultFolder, filename);

    fs.writeFileSync(filePath, markdown, "utf8");

    return {
      success: true,
      message: `Note synced to Obsidian`,
      details: `File: ${filename}\nLocation: ${vaultFolder}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to sync note to Obsidian",
      details: error.message,
    };
  }
}

/**
 * Sync all notes to Obsidian
 */
export function syncAllNotesToObsidian(notes: Note[]): ObsidianSyncResult {
  const connectionCheck = checkObsidianConnection();
  if (!connectionCheck.success) {
    return connectionCheck;
  }

  let synced = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const note of notes) {
    const result = syncNoteToObsidian(note);
    if (result.success) {
      synced++;
    } else {
      errors++;
      errorDetails.push(`${note.title}: ${result.message}`);
    }
  }

  const summary = `Synced ${synced} notes successfully`;
  const errorSummary = errors > 0 ? `\nErrors: ${errors}` : "";

  return {
    success: errors === 0,
    message: `${summary}${errorSummary}`,
    details: `Total notes: ${notes.length}\nSuccessful: ${synced}\nFailed: ${errors}${errorDetails.length > 0 ? "\n\nErrors:\n" + errorDetails.join("\n") : ""}`,
  };
}

/**
 * Get statistics about synced notes
 */
export function getObsidianSyncStats(): ObsidianSyncResult {
  const connectionCheck = checkObsidianConnection();
  if (!connectionCheck.success) {
    return connectionCheck;
  }

  try {
    const vaultFolder = path.join(OBSIDIAN_VAULT_PATH!, CLAUDEVAULT_FOLDER);
    const files = fs
      .readdirSync(vaultFolder)
      .filter((file) => file.endsWith(".md"));

    return {
      success: true,
      message: `Found ${files.length} ClaudeVault notes in Obsidian`,
      details: `Vault: ${OBSIDIAN_VAULT_PATH}\nClaudeVault folder: ${vaultFolder}\nMarkdown files: ${files.length}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to get sync statistics",
      details: error.message,
    };
  }
}

/**
 * Find related notes based on content similarity and shared tags
 */
function findRelatedNotes(currentNote: Note, allNotes: Note[]): Note[] {
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

  // Find notes with keyword overlap in title/content
  const currentKeywords = extractKeywords(currentNote);
  const keywordNotes = allNotes.filter((note) => {
    if (note.id === currentNote.id) return false;
    const noteKeywords = extractKeywords(note);
    const overlap = currentKeywords.filter((keyword) =>
      noteKeywords.includes(keyword),
    );
    return overlap.length >= 2; // At least 2 shared keywords
  });

  // Combine and deduplicate
  const allRelated = [
    ...sharedTagNotes,
    ...sharedProjectNotes,
    ...keywordNotes,
  ];
  const uniqueRelated = allRelated.filter(
    (note, index, self) => self.findIndex((n) => n.id === note.id) === index,
  );

  // Sort by relevance (more shared tags = higher relevance)
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
    .slice(0, 5); // Top 5 most related
}

/**
 * Extract keywords from note title and content
 */
function extractKeywords(note: Note): string[] {
  const text = (note.title + " " + note.content).toLowerCase();

  // Simple keyword extraction (you could use more sophisticated NLP)
  const words = text
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .split(/\s+/) // Split on whitespace
    .filter(
      (word) =>
        word.length > 3 && // Longer than 3 characters
        !commonWords.includes(word), // Not a common word
    );

  // Count word frequency and return most common
  const wordCount: Record<string, number> = {};
  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  return Object.keys(wordCount)
    .sort((a, b) => wordCount[b] - wordCount[a])
    .slice(0, 10); // Top 10 keywords
}

const commonWords = [
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "had",
  "her",
  "was",
  "one",
  "our",
  "out",
  "day",
  "get",
  "has",
  "him",
  "his",
  "how",
  "its",
  "may",
  "new",
  "now",
  "old",
  "see",
  "two",
  "who",
  "boy",
  "did",
  "man",
  "men",
  "put",
  "say",
  "she",
  "too",
  "use",
  "way",
  "will",
  "with",
  "have",
  "this",
  "that",
  "from",
  "they",
  "know",
  "want",
  "been",
  "good",
  "much",
  "some",
  "time",
  "very",
  "when",
  "come",
  "here",
  "just",
  "like",
  "long",
  "make",
  "many",
  "over",
  "such",
  "take",
  "than",
  "them",
  "well",
  "were",
  "what",
];

/**
 * Enhanced format with automatic linking
 */
function formatNoteAsObsidianMarkdownWithLinks(
  note: Note,
  allNotes: Note[],
): string {
  const frontmatter = `---
id: ${note.id}
created: ${note.timestamp}
project: "${note.project || ""}"
category: "${note.category || ""}"
tags: [${note.tags.map((tag) => `"${tag}"`).join(", ")}]
source: "ClaudeVault"
---

`;

  // Find related notes for auto-linking
  const relatedNotes = findRelatedNotes(note, allNotes);

  const tagString =
    note.tags.length > 0
      ? note.tags.map((tag) => `#${tag.replace(/[\s\-]/g, "_")}`).join(" ")
      : "";

  // Build related notes section
  const relatedSection =
    relatedNotes.length > 0
      ? `

---

## Related Notes
${relatedNotes
        .map(
          (related) =>
            `- [[${sanitizeFilename(related.title)}|${related.title}]] - ${related.tags
              .filter((tag) => note.tags.includes(tag))
              .map((tag) => `#${tag}`)
              .join(" ")}`,
        )
        .join("\n")}

💡 *Auto-generated connections based on shared tags and content similarity*
`
      : "";

  const content = `# ${note.title}

${note.content}
${relatedSection}

---

**Metadata:**
- 📁 **Project:** ${note.project || "None"}
- 🏷️ **Category:** ${note.category || "None"}  
- 📅 **Created:** ${new Date(note.timestamp).toLocaleDateString()}
- 🔗 **ClaudeVault ID:** \`${note.id}\`

${tagString}
`;

  return frontmatter + content;
}

/**
 * Enhanced sync function with auto-linking
 */
export function syncAllNotesToObsidianWithLinks(
  notes: Note[],
): ObsidianSyncResult {
  const connectionCheck = checkObsidianConnection();
  if (!connectionCheck.success) {
    return connectionCheck;
  }

  let synced = 0;
  let errors = 0;
  let connections = 0;
  const errorDetails: string[] = [];

  for (const note of notes) {
    try {
      const vaultFolder = path.join(OBSIDIAN_VAULT_PATH!, CLAUDEVAULT_FOLDER);
      const markdown = formatNoteAsObsidianMarkdownWithLinks(note, notes);
      const filename = `${sanitizeFilename(note.title)}.md`;
      const filePath = path.join(vaultFolder, filename);

      fs.writeFileSync(filePath, markdown, "utf8");

      // Count connections added
      const relatedNotes = findRelatedNotes(note, notes);
      connections += relatedNotes.length;

      synced++;
    } catch (error: any) {
      errors++;
      errorDetails.push(`${note.title}: ${error.message}`);
    }
  }

  const summary = `Synced ${synced} notes with ${connections} auto-generated connections!`;
  const errorSummary = errors > 0 ? `\nErrors: ${errors}` : "";

  return {
    success: errors === 0,
    message: `${summary}${errorSummary}`,
    details: `Total notes: ${notes.length}\nSuccessful: ${synced}\nFailed: ${errors}\nConnections created: ${connections}${errorDetails.length > 0 ? "\n\nErrors:\n" + errorDetails.join("\n") : ""}`,
  };
}
