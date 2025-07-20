import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import { Note } from "../types/note.js";

const execAsync = promisify(exec);

// Load environment variables manually
function loadEnvVariables() {
  const envPath = path.join(process.cwd(), ".env");

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

// Configuration for unified sync
const OBSIDIAN_VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;
const NOTES_SUBFOLDER = process.env.OBSIDIAN_SUBFOLDER || "ClaudeVault";
const AUTO_SYNC_ON_SAVE = process.env.AUTO_SYNC_ON_SAVE === "true";
const DEFAULT_BRANCH = process.env.DEFAULT_BRANCH || "main";

export interface UnifiedSyncResult {
  success: boolean;
  message: string;
  details?: string;
  notesAffected?: number;
  connectionsCreated?: number;
}

/**
 * Execute git command in the obsidian vault directory
 */
async function execVaultGitCommand(
  command: string,
): Promise<{ stdout: string; stderr: string }> {
  if (!OBSIDIAN_VAULT_PATH) {
    throw new Error("OBSIDIAN_VAULT_PATH not configured");
  }

  try {
    const result = await execAsync(command, {
      cwd: OBSIDIAN_VAULT_PATH,
      timeout: 15000, // 15 second timeout
    });
    return result;
  } catch (error: any) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

/**
 * Check if obsidian vault is properly set up with Git
 */
export async function checkUnifiedSyncSetup(): Promise<UnifiedSyncResult> {
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
      message: "Obsidian vault directory not found",
      details: `Path does not exist: ${OBSIDIAN_VAULT_PATH}`,
    };
  }

  try {
    // Check if it's a Git repository
    await execVaultGitCommand("git status");

    // Check if remote is configured
    const remoteResult = await execVaultGitCommand("git remote -v");

    // Check current branch
    const branchResult = await execVaultGitCommand("git branch --show-current");

    return {
      success: true,
      message: "Unified sync setup is ready",
      details: `Vault: ${OBSIDIAN_VAULT_PATH}\nBranch: ${branchResult.stdout.trim()}\nRemote configured: ${remoteResult.stdout.length > 0 ? "Yes" : "No"}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Git repository not properly configured",
      details: error.message,
    };
  }
}

/**
 * Format note as Obsidian markdown with enhanced metadata
 */
function formatNoteForUnifiedSync(
  note: Note,
  relatedNotes: Note[] = [],
): string {
  const frontmatter = `---
id: ${note.id}
created: ${note.timestamp}
updated: ${new Date().toISOString()}
project: "${note.project || ""}"
category: "${note.category || ""}"
tags: [${note.tags.map((tag) => `"${tag}"`).join(", ")}]
source: "ClaudeVault"
version: "2.0"
---

`;

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

  const tagString =
    note.tags.length > 0
      ? note.tags.map((tag) => `#${tag.replace(/[\s\-]/g, "_")}`).join(" ")
      : "";

  const content = `# ${note.title}

${note.content}
${relatedSection}

---

## Metadata
- 📁 **Project:** ${note.project || "None"}
- 🏷️ **Category:** ${note.category || "None"}  
- 📅 **Created:** ${new Date(note.timestamp).toLocaleDateString()}
- 🔄 **Updated:** ${new Date().toLocaleDateString()}
- 🔗 **ClaudeVault ID:** \`${note.id}\`

${tagString}
`;

  return frontmatter + content;
}

/**
 * Helper function to sanitize filename
 */
function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .toLowerCase()
    .substring(0, 100); // Limit length
}

/**
 * Find related notes for auto-linking
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
 * Save a single note to obsidian vault and optionally sync to Git
 */
export async function saveNoteToVaultAndSync(
  note: Note,
  allNotes: Note[],
  autoSync = AUTO_SYNC_ON_SAVE,
): Promise<UnifiedSyncResult> {
  const setupCheck = await checkUnifiedSyncSetup();
  if (!setupCheck.success) {
    return setupCheck;
  }

  try {
    // Ensure ClaudeVault folder exists
    const notesFolder = path.join(OBSIDIAN_VAULT_PATH!, NOTES_SUBFOLDER);
    if (!fs.existsSync(notesFolder)) {
      fs.mkdirSync(notesFolder, { recursive: true });
    }

    // Find related notes for linking
    const relatedNotes = findRelatedNotes(note, allNotes);

    // Format note as enhanced markdown
    const markdown = formatNoteForUnifiedSync(note, relatedNotes);
    const filename = `${sanitizeFilename(note.title)}.md`;
    const filePath = path.join(notesFolder, filename);

    // Save to vault
    fs.writeFileSync(filePath, markdown, "utf8");

    let syncDetails = `Note saved to vault: ${filename}`;

    // Auto-sync to Git if enabled
    if (autoSync) {
      const gitResult = await commitAndPushChanges(`Add note: ${note.title}`);
      if (gitResult.success) {
        syncDetails += `\n${gitResult.message}`;
      } else {
        return {
          success: false,
          message: "Note saved locally but Git sync failed",
          details: gitResult.details,
        };
      }
    }

    return {
      success: true,
      message: "Note saved and synced successfully",
      details: syncDetails,
      notesAffected: 1,
      connectionsCreated: relatedNotes.length,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to save note to vault",
      details: error.message,
    };
  }
}

/**
 * Pull latest changes from remote repository
 */
export async function pullLatestChanges(): Promise<UnifiedSyncResult> {
  try {
    const result = await execVaultGitCommand(
      `git pull origin ${DEFAULT_BRANCH}`,
    );
    return {
      success: true,
      message: "Successfully pulled latest changes",
      details: result.stdout,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to pull changes",
      details: error.message,
    };
  }
}

/**
 * Commit and push changes to remote repository
 */
export async function commitAndPushChanges(
  message: string = "Update notes via ClaudeVault",
): Promise<UnifiedSyncResult> {
  try {
    // Add all changes
    await execVaultGitCommand("git add .");

    // Check if there are changes to commit
    const statusResult = await execVaultGitCommand("git status --porcelain");
    if (statusResult.stdout.trim().length === 0) {
      return {
        success: true,
        message: "No changes to commit",
        details: "Vault is up to date",
      };
    }

    // Commit changes
    const commitResult = await execVaultGitCommand(
      `git commit -m "${message}"`,
    );

    // Push changes
    const pushResult = await execVaultGitCommand(
      `git push origin ${DEFAULT_BRANCH}`,
    );

    return {
      success: true,
      message: "Successfully committed and pushed changes",
      details: `Commit: ${commitResult.stdout}\nPush: ${pushResult.stdout}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to commit and push changes",
      details: error.message,
    };
  }
}

/**
 * Full unified sync: pull, save all notes, and push
 */
export async function fullUnifiedSync(
  notes: Note[],
): Promise<UnifiedSyncResult> {
  try {
    let operations: string[] = [];
    let totalConnections = 0;

    // 1. Pull latest changes first
    const pullResult = await pullLatestChanges();
    if (!pullResult.success) {
      return pullResult;
    }
    operations.push("✓ Pulled latest changes");

    // 2. Save all notes to vault with smart linking
    const notesFolder = path.join(OBSIDIAN_VAULT_PATH!, NOTES_SUBFOLDER);
    if (!fs.existsSync(notesFolder)) {
      fs.mkdirSync(notesFolder, { recursive: true });
    }

    for (const note of notes) {
      const relatedNotes = findRelatedNotes(note, notes);
      const markdown = formatNoteForUnifiedSync(note, relatedNotes);
      const filename = `${sanitizeFilename(note.title)}.md`;
      const filePath = path.join(notesFolder, filename);

      fs.writeFileSync(filePath, markdown, "utf8");
      totalConnections += relatedNotes.length;
    }
    operations.push(`✓ Synced ${notes.length} notes with smart linking`);

    // 3. Commit and push all changes
    const pushResult = await commitAndPushChanges(
      "Full unified sync - update all notes with smart links",
    );
    if (!pushResult.success) {
      return pushResult;
    }
    operations.push("✓ Committed and pushed to remote");

    return {
      success: true,
      message: "Full unified sync completed successfully",
      details: operations.join("\n"),
      notesAffected: notes.length,
      connectionsCreated: totalConnections,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Unified sync failed",
      details: error.message,
    };
  }
}

/**
 * Get sync status for the unified system
 */
export async function getUnifiedSyncStatus(): Promise<UnifiedSyncResult> {
  try {
    // Check vault setup
    const setupCheck = await checkUnifiedSyncSetup();
    if (!setupCheck.success) {
      return setupCheck;
    }

    // Get Git status
    const statusResult = await execVaultGitCommand("git status --porcelain");
    const hasUncommittedChanges = statusResult.stdout.trim().length > 0;

    // Get branch info
    const branchResult = await execVaultGitCommand("git branch --show-current");
    const currentBranch = branchResult.stdout.trim();

    // Check for unpushed commits
    const unpushedResult = await execVaultGitCommand(
      `git log origin/${currentBranch}..HEAD --oneline`,
    );
    const hasUnpushedCommits = unpushedResult.stdout.trim().length > 0;

    // Count notes in vault
    const notesFolder = path.join(OBSIDIAN_VAULT_PATH!, NOTES_SUBFOLDER);
    let notesCount = 0;
    if (fs.existsSync(notesFolder)) {
      notesCount = fs
        .readdirSync(notesFolder)
        .filter((file) => file.endsWith(".md")).length;
    }

    const statusMessage = `📊 **Unified Sync Status**

🔮 **Vault Status:**
- Path: ${OBSIDIAN_VAULT_PATH}
- Branch: ${currentBranch}
- Notes: ${notesCount} in ClaudeVault folder

📝 **Changes:**
- Uncommitted changes: ${hasUncommittedChanges ? "Yes" : "No"}
- Unpushed commits: ${hasUnpushedCommits ? "Yes" : "No"}

🚀 **Auto-sync:** ${AUTO_SYNC_ON_SAVE ? "Enabled" : "Disabled"}

${hasUncommittedChanges || hasUnpushedCommits ? "💡 Run unified sync to sync changes" : "✅ Everything up to date!"}`;

    return {
      success: true,
      message: statusMessage,
      details: `Notes: ${notesCount}, Uncommitted: ${hasUncommittedChanges}, Unpushed: ${hasUnpushedCommits}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to get sync status",
      details: error.message,
    };
  }
}

/**
 * Load all notes from the Obsidian vault
 */
export function getAllNotesFromVault(): Note[] {
  if (!OBSIDIAN_VAULT_PATH) {
    return [];
  }

  const notesFolder = path.join(OBSIDIAN_VAULT_PATH, NOTES_SUBFOLDER);
  if (!fs.existsSync(notesFolder)) {
    return [];
  }

  try {
    const files = fs
      .readdirSync(notesFolder)
      .filter((file) => file.endsWith(".md"));
    const notes: Note[] = [];

    for (const file of files) {
      const filePath = path.join(notesFolder, file);
      const content = fs.readFileSync(filePath, "utf8");

      // Extract note data from frontmatter and content
      const note = parseMarkdownToNote(content);
      if (note) {
        notes.push(note);
      }
    }

    return notes.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  } catch (error) {
    console.error("Error reading notes from vault:", error);
    return [];
  }
}

/**
 * Parse markdown file back to Note object
 */
function parseMarkdownToNote(markdown: string): Note | null {
  try {
    // Extract frontmatter
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];
    const content = markdown.substring(frontmatterMatch[0].length);

    // Parse frontmatter fields
    const id = extractFrontmatterField(frontmatter, "id");
    const created = extractFrontmatterField(frontmatter, "created");
    const project = extractFrontmatterField(frontmatter, "project");
    const category = extractFrontmatterField(frontmatter, "category");
    const tagsStr = extractFrontmatterField(frontmatter, "tags");

    // Extract title from markdown content
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : "Untitled";

    // Extract main content (everything between title and metadata section)
    const mainContentMatch = content.match(/^#\s+.+\n\n([\s\S]*?)\n\n---/);
    const mainContent = mainContentMatch ? mainContentMatch[1].trim() : "";

    // Parse tags from frontmatter
    let tags: string[] = [];
    if (tagsStr) {
      const tagsMatch = tagsStr.match(/\[(.*?)\]/);
      if (tagsMatch) {
        tags = tagsMatch[1]
          .split(",")
          .map((tag) => tag.trim().replace(/"/g, ""))
          .filter((tag) => tag.length > 0);
      }
    }

    if (!id || !created) return null;

    return {
      id,
      title,
      content: mainContent,
      timestamp: created,
      tags,
      project: project ? project.replace(/"/g, "") : undefined,
      category: category ? category.replace(/"/g, "") : undefined,
    };
  } catch (error) {
    console.error("Error parsing markdown to note:", error);
    return null;
  }
}

/**
 * Extract field value from frontmatter
 */
function extractFrontmatterField(
  frontmatter: string,
  field: string,
): string | undefined {
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : undefined;
}

/**
 * Find note by ID from vault
 */
export function findNoteByIdInVault(id: string): Note | null {
  const allNotes = getAllNotesFromVault();
  return allNotes.find((note) => note.id === id) || null;
}

/**
 * Search notes in vault
 */
export function searchNotesInVault(query: string): Note[] {
  const allNotes = getAllNotesFromVault();
  const lowerQuery = query.toLowerCase();

  return allNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      note.project?.toLowerCase().includes(lowerQuery) ||
      note.category?.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Add new note to vault and sync
 */
export async function addNoteToVault(
  noteData: Omit<Note, "id" | "timestamp">,
): Promise<UnifiedSyncResult> {
  const note: Note = {
    id: `note-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...noteData,
  };

  const allNotes = getAllNotesFromVault();
  return await saveNoteToVaultAndSync(
    note,
    [...allNotes, note],
    AUTO_SYNC_ON_SAVE,
  );
}

/**
 * Update existing note in vault
 */
export async function updateNoteInVault(
  id: string,
  updates: Partial<Note>,
): Promise<UnifiedSyncResult> {
  const existingNote = findNoteByIdInVault(id);
  if (!existingNote) {
    return {
      success: false,
      message: "Note not found",
      details: `No note found with ID: ${id}`,
    };
  }

  const updatedNote: Note = {
    ...existingNote,
    ...updates,
    id: existingNote.id, // Ensure ID doesn't change
    timestamp: existingNote.timestamp, // Keep original timestamp
  };

  const allNotes = getAllNotesFromVault();
  const updatedNotes = allNotes.map((note) =>
    note.id === id ? updatedNote : note,
  );

  return await saveNoteToVaultAndSync(
    updatedNote,
    updatedNotes,
    AUTO_SYNC_ON_SAVE,
  );
}

/**
 * Delete note from vault
 */
export async function deleteNoteFromVault(
  id: string,
): Promise<UnifiedSyncResult> {
  const existingNote = findNoteByIdInVault(id);
  if (!existingNote) {
    return {
      success: false,
      message: "Note not found",
      details: `No note found with ID: ${id}`,
    };
  }

  try {
    // Remove the markdown file
    const filename = `${sanitizeFilename(existingNote.title)}.md`;
    const filePath = path.join(OBSIDIAN_VAULT_PATH!, NOTES_SUBFOLDER, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Auto-sync if enabled
    if (AUTO_SYNC_ON_SAVE) {
      const gitResult = await commitAndPushChanges(
        `Delete note: ${existingNote.title}`,
      );
      if (!gitResult.success) {
        return {
          success: false,
          message: "Note deleted locally but Git sync failed",
          details: gitResult.details,
        };
      }
    }

    return {
      success: true,
      message: `Note "${existingNote.title}" deleted successfully`,
      details: `Removed file: ${filename}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to delete note",
      details: error.message,
    };
  }
}
