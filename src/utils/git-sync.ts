import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

const execAsync = promisify(exec);

// Load environment variables manually from .env file
function loadEnvVariables() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

// Load environment variables
loadEnvVariables();

// Configuration from environment variables
const NOTES_REPO_PATH = process.env.NOTES_REPO_PATH;
const DEFAULT_BRANCH = process.env.DEFAULT_BRANCH || "main";

if (!NOTES_REPO_PATH) {
  throw new Error(
    "NOTES_REPO_PATH environment variable is required. Please check your .env file.",
  );
}

export interface SyncResult {
  success: boolean;
  message: string;
  details?: string;
}

export interface GitStatus {
  hasChanges: boolean;
  changedFiles: string[];
  branch: string;
  hasUncommittedChanges: boolean;
  hasUnpushedCommits: boolean;
}

/**
 * Execute git command in the notes repository
 */
async function execGitCommand(
  command: string,
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(command, {
      cwd: NOTES_REPO_PATH,
      timeout: 10000, // 10 second timeout
    });
    return result;
  } catch (error: any) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

/**
 * Get the current git status of the notes repository
 */
export async function getGitStatus(): Promise<GitStatus> {
  try {
    // Check for uncommitted changes
    const statusResult = await execGitCommand("git status --porcelain");
    const hasUncommittedChanges = statusResult.stdout.trim().length > 0;
    const changedFiles = statusResult.stdout
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);

    // Get current branch
    const branchResult = await execGitCommand("git branch --show-current");
    const branch = branchResult.stdout.trim();

    // Check for unpushed commits
    const unpushedResult = await execGitCommand(
      `git log origin/${branch}..HEAD --oneline`,
    );
    const hasUnpushedCommits = unpushedResult.stdout.trim().length > 0;

    return {
      hasChanges: hasUncommittedChanges || hasUnpushedCommits,
      changedFiles,
      branch,
      hasUncommittedChanges,
      hasUnpushedCommits,
    };
  } catch (error: any) {
    throw new Error(`Failed to get git status: ${error.message}`);
  }
}

/**
 * Pull latest changes from remote repository
 */
export async function pullChanges(): Promise<SyncResult> {
  try {
    const result = await execGitCommand(`git pull origin ${DEFAULT_BRANCH}`);
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
 * Add and commit all changes in the notes repository
 */
export async function commitChanges(
  message: string = "Update notes via MCP server",
): Promise<SyncResult> {
  try {
    // Add all changes
    await execGitCommand("git add .");

    // Check if there are changes to commit
    const statusResult = await execGitCommand("git status --porcelain");
    if (statusResult.stdout.trim().length === 0) {
      return {
        success: true,
        message: "No changes to commit",
        details: "Repository is up to date",
      };
    }

    // Commit changes
    const commitResult = await execGitCommand(`git commit -m "${message}"`);
    return {
      success: true,
      message: "Successfully committed changes",
      details: commitResult.stdout,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to commit changes",
      details: error.message,
    };
  }
}

/**
 * Push committed changes to remote repository
 */
export async function pushChanges(): Promise<SyncResult> {
  try {
    const result = await execGitCommand(`git push origin ${DEFAULT_BRANCH}`);
    return {
      success: true,
      message: "Successfully pushed changes to GitHub",
      details: result.stdout,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to push changes",
      details: error.message,
    };
  }
}

/**
 * Full sync: pull, commit local changes, and push
 */
export async function fullSync(): Promise<SyncResult> {
  try {
    const status = await getGitStatus();
    let operations: string[] = [];

    // 1. Pull latest changes first
    const pullResult = await pullChanges();
    if (!pullResult.success) {
      return pullResult;
    }
    operations.push("✓ Pulled latest changes");

    // 2. Commit local changes if any
    if (status.hasUncommittedChanges) {
      const commitResult = await commitChanges();
      if (!commitResult.success) {
        return commitResult;
      }
      operations.push("✓ Committed local changes");
    }

    // 3. Push changes if there are unpushed commits
    const finalStatus = await getGitStatus();
    if (finalStatus.hasUnpushedCommits) {
      const pushResult = await pushChanges();
      if (!pushResult.success) {
        return pushResult;
      }
      operations.push("✓ Pushed changes to GitHub");
    }

    if (operations.length === 1) {
      operations.push("✓ No local changes to sync");
    }

    return {
      success: true,
      message: "Full sync completed successfully",
      details: operations.join("\n"),
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Sync failed",
      details: error.message,
    };
  }
}
