import * as fs from "fs";
import * as path from "path";
import { Note } from "../../types/note.js";
import {
  getVaultConfig,
  ensureVaultStructure,
  writeVaultFile,
  deleteVaultFile,
  getNoteFilename,
} from "../vault/vault-operations.js";
import { formatNoteAsMarkdown } from "../vault/markdown-parser.js";
import { findRelatedNotes } from "../vault/note-linking.js";
import {
  isGitRepository,
  hasRemoteRepository,
  getGitStatus,
  pullChanges,
  addCommitAndPush,
  getRepositoryInfo,
  GitResult,
} from "../git/git-operations.js";

// Load environment variables
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

export const AUTO_SYNC_ON_SAVE = process.env.AUTO_SYNC_ON_SAVE === "true";
export const DEFAULT_BRANCH = process.env.DEFAULT_BRANCH || "main";

export interface UnifiedSyncResult {
  success: boolean;
  message: string;
  details?: string;
  notesAffected?: number;
  connectionsCreated?: number;
}

/**
 * Check if unified sync setup is ready
 */
export async function checkUnifiedSyncSetup(): Promise<UnifiedSyncResult> {
  try {
    const config = getVaultConfig();

    // Check vault path exists
    if (!fs.existsSync(config.vaultPath)) {
      return {
        success: false,
        message: "Obsidian vault directory not found",
        details: `Path does not exist: ${config.vaultPath}`,
      };
    }

    // Check if it's a Git repository
    const isRepo = await isGitRepository();
    if (!isRepo) {
      return {
        success: false,
        message: "Git repository not properly configured",
        details: 'Directory is not a Git repository. Run "git init" first.',
      };
    }

    // Check remote configuration
    const { hasRemote, remoteName } = await hasRemoteRepository();
    const status = await getGitStatus();

    return {
      success: true,
      message: "Unified sync setup is ready",
      details: `Vault: ${config.vaultPath}\nBranch: ${status.currentBranch}\nRemote configured: ${hasRemote ? `Yes (${remoteName})` : "No"}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to check sync setup",
      details: error.message,
    };
  }
}

/**
 * Save a single note to vault and optionally sync to Git
 */
export async function saveNoteToVaultAndSync(
  note: Note,
  allNotes: Note[],
  autoSync: boolean = AUTO_SYNC_ON_SAVE,
): Promise<UnifiedSyncResult> {
  const setupCheck = await checkUnifiedSyncSetup();
  if (!setupCheck.success) {
    return setupCheck;
  }

  try {
    // Ensure vault structure exists
    ensureVaultStructure();

    // Find related notes for smart linking
    const relatedNotes = findRelatedNotes(note, allNotes);

    // Format note as enhanced markdown
    const markdown = formatNoteAsMarkdown(note, relatedNotes);
    const filename = getNoteFilename(note);

    // Save to vault
    const filePath = writeVaultFile(filename, markdown);

    let syncDetails = `Note saved to vault: ${filename}`;

    // Auto-sync to Git if enabled
    if (autoSync) {
      const gitResult = await addCommitAndPush(`Add note: ${note.title}`);
      if (gitResult.success) {
        syncDetails += `\n✓ Synced to Git: ${gitResult.stdout}`;
      } else {
        return {
          success: false,
          message: "Note saved locally but Git sync failed",
          details: gitResult.stderr || gitResult.stdout,
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
 * Delete note from vault and sync
 */
export async function deleteNoteFromVaultAndSync(
  note: Note,
  autoSync: boolean = AUTO_SYNC_ON_SAVE,
): Promise<UnifiedSyncResult> {
  const setupCheck = await checkUnifiedSyncSetup();
  if (!setupCheck.success) {
    return setupCheck;
  }

  try {
    const filename = getNoteFilename(note);
    const deleted = deleteVaultFile(filename);

    if (!deleted) {
      return {
        success: false,
        message: "Note file not found",
        details: `Could not find file: ${filename}`,
      };
    }

    let syncDetails = `Note deleted from vault: ${filename}`;

    // Auto-sync if enabled
    if (autoSync) {
      const gitResult = await addCommitAndPush(`Delete note: ${note.title}`);
      if (gitResult.success) {
        syncDetails += `\n✓ Synced to Git: ${gitResult.stdout}`;
      } else {
        return {
          success: false,
          message: "Note deleted locally but Git sync failed",
          details: gitResult.stderr || gitResult.stdout,
        };
      }
    }

    return {
      success: true,
      message: `Note "${note.title}" deleted successfully`,
      details: syncDetails,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to delete note",
      details: error.message,
    };
  }
}

/**
 * Pull latest changes from remote repository
 */
export async function pullLatestChanges(): Promise<UnifiedSyncResult> {
  const setupCheck = await checkUnifiedSyncSetup();
  if (!setupCheck.success) {
    return setupCheck;
  }

  try {
    const result = await pullChanges("origin", DEFAULT_BRANCH);

    if (result.success) {
      return {
        success: true,
        message: "Successfully pulled latest changes",
        details: result.stdout || "Already up to date",
      };
    } else {
      return {
        success: false,
        message: "Failed to pull changes",
        details: result.stderr || result.stdout,
      };
    }
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
  const setupCheck = await checkUnifiedSyncSetup();
  if (!setupCheck.success) {
    return setupCheck;
  }

  try {
    const result = await addCommitAndPush(message);

    if (result.success) {
      // Check if there were actually changes
      if (result.stdout.includes("No changes to commit")) {
        return {
          success: true,
          message: "No changes to commit",
          details: "Vault is up to date",
        };
      }

      return {
        success: true,
        message: "Successfully committed and pushed changes",
        details: result.stdout,
      };
    } else {
      return {
        success: false,
        message: "Failed to commit and push changes",
        details: result.stderr || result.stdout,
      };
    }
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
  const setupCheck = await checkUnifiedSyncSetup();
  if (!setupCheck.success) {
    return setupCheck;
  }

  try {
    let operations: string[] = [];
    let totalConnections = 0;

    // 1. Pull latest changes first
    const pullResult = await pullLatestChanges();
    if (!pullResult.success) {
      return pullResult;
    }
    operations.push("✓ Pulled latest changes");

    // 2. Ensure vault structure
    ensureVaultStructure();

    // 3. Save all notes to vault with smart linking
    for (const note of notes) {
      const relatedNotes = findRelatedNotes(note, notes);
      const markdown = formatNoteAsMarkdown(note, relatedNotes);
      const filename = getNoteFilename(note);

      writeVaultFile(filename, markdown);
      totalConnections += relatedNotes.length;
    }
    operations.push(`✓ Synced ${notes.length} notes with smart linking`);

    // 4. Commit and push all changes
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
    // Check setup first
    const setupCheck = await checkUnifiedSyncSetup();
    if (!setupCheck.success) {
      return setupCheck;
    }

    // Get repository information
    const repoInfo = await getRepositoryInfo();
    const config = getVaultConfig();

    // Count notes in vault
    let notesCount = 0;
    if (fs.existsSync(config.fullNotesPath)) {
      notesCount = fs
        .readdirSync(config.fullNotesPath)
        .filter((file) => file.endsWith(".md")).length;
    }

    const status = repoInfo.status!;
    const statusMessage = `📊 **Unified Sync Status**

🔮 **Vault Status:**
- Path: ${config.vaultPath}
- Branch: ${status.currentBranch}
- Notes: ${notesCount} in ${config.notesFolder} folder

📝 **Changes:**
- Uncommitted changes: ${status.hasUncommittedChanges ? "Yes" : "No"}
- Unpushed commits: ${status.hasUnpushedCommits ? "Yes" : "No"}
- Modified files: ${status.modifiedFiles.length}

🚀 **Auto-sync:** ${AUTO_SYNC_ON_SAVE ? "Enabled" : "Disabled"}
🌐 **Remote:** ${repoInfo.hasRemote ? `✓ ${repoInfo.remoteInfo?.remoteName}` : "✗ Not configured"}

${status.hasUncommittedChanges || status.hasUnpushedCommits ? "💡 Run unified sync to sync changes" : "✅ Everything up to date!"}`;

    return {
      success: true,
      message: statusMessage,
      details: `Notes: ${notesCount}, Uncommitted: ${status.hasUncommittedChanges}, Unpushed: ${status.hasUnpushedCommits}`,
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
 * Smart sync strategy - only sync if there are meaningful changes
 */
export async function smartSync(
  notes: Note[],
  forceSync: boolean = false,
): Promise<UnifiedSyncResult> {
  if (!forceSync) {
    // Check if sync is needed
    const status = await getGitStatus();
    if (!status.hasUncommittedChanges && !status.hasUnpushedCommits) {
      return {
        success: true,
        message: "Smart sync: No changes detected",
        details: "Vault is already synchronized",
      };
    }
  }

  return await fullUnifiedSync(notes);
}

/**
 * Batch sync multiple notes efficiently
 */
export async function batchSyncNotes(
  notes: Note[],
  commitMessage?: string,
): Promise<UnifiedSyncResult> {
  const setupCheck = await checkUnifiedSyncSetup();
  if (!setupCheck.success) {
    return setupCheck;
  }

  try {
    ensureVaultStructure();
    let totalConnections = 0;

    // Save all notes in batch
    for (const note of notes) {
      const relatedNotes = findRelatedNotes(note, notes);
      const markdown = formatNoteAsMarkdown(note, relatedNotes);
      const filename = getNoteFilename(note);

      writeVaultFile(filename, markdown);
      totalConnections += relatedNotes.length;
    }

    // Single commit for all changes
    const message =
      commitMessage || `Batch sync: ${notes.length} notes updated`;
    const gitResult = await addCommitAndPush(message);

    if (!gitResult.success) {
      return {
        success: false,
        message: "Batch sync failed during Git operations",
        details: gitResult.stderr || gitResult.stdout,
      };
    }

    return {
      success: true,
      message: `Batch sync completed: ${notes.length} notes`,
      details: `✓ ${notes.length} notes synced\n✓ ${totalConnections} connections created\n✓ Committed and pushed`,
      notesAffected: notes.length,
      connectionsCreated: totalConnections,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Batch sync failed",
      details: error.message,
    };
  }
}

/**
 * Emergency sync - force sync even if there are conflicts
 */
export async function emergencySync(notes: Note[]): Promise<UnifiedSyncResult> {
  try {
    // First try normal sync
    const normalSync = await fullUnifiedSync(notes);
    if (normalSync.success) {
      return normalSync;
    }

    // If normal sync fails, try to resolve by pulling first
    await pullChanges();

    // Try sync again
    return await fullUnifiedSync(notes);
  } catch (error: any) {
    return {
      success: false,
      message: "Emergency sync failed",
      details: error.message,
    };
  }
}
