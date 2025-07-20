import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { getVaultConfig } from "../vault/vault-operations.js";

const execAsync = promisify(exec);

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

export const DEFAULT_BRANCH = process.env.DEFAULT_BRANCH || "main";
export const GIT_TIMEOUT = parseInt(process.env.GIT_TIMEOUT || "15000");

export interface GitResult {
  success: boolean;
  stdout: string;
  stderr: string;
  command?: string;
}

export interface GitStatus {
  hasUncommittedChanges: boolean;
  hasUnpushedCommits: boolean;
  currentBranch: string;
  remoteName?: string;
  lastCommitHash?: string;
  modifiedFiles: string[];
}

/**
 * Execute git command in the vault directory
 */
export async function execGitCommand(command: string): Promise<GitResult> {
  try {
    const config = getVaultConfig();

    const result = await execAsync(command, {
      cwd: config.vaultPath,
      timeout: GIT_TIMEOUT,
    });

    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      command,
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
      command,
    };
  }
}

/**
 * Check if directory is a Git repository
 */
export async function isGitRepository(): Promise<boolean> {
  const result = await execGitCommand("git rev-parse --git-dir");
  return result.success;
}

/**
 * Check if remote repository is configured
 */
export async function hasRemoteRepository(): Promise<{
  hasRemote: boolean;
  remoteName?: string;
  remoteUrl?: string;
}> {
  const result = await execGitCommand("git remote -v");

  if (!result.success || !result.stdout.trim()) {
    return { hasRemote: false };
  }

  const lines = result.stdout.trim().split("\n");
  const firstRemote = lines[0];
  const match = firstRemote.match(/^(\w+)\s+(.+?)\s+\(fetch\)$/);

  if (match) {
    return {
      hasRemote: true,
      remoteName: match[1],
      remoteUrl: match[2],
    };
  }

  return { hasRemote: false };
}

/**
 * Get current Git status
 */
export async function getGitStatus(): Promise<GitStatus> {
  const [statusResult, branchResult] = await Promise.all([
    execGitCommand("git status --porcelain"),
    execGitCommand("git branch --show-current"),
  ]);

  const currentBranch = branchResult.success
    ? branchResult.stdout.trim()
    : "unknown";
  const hasUncommittedChanges =
    statusResult.success && statusResult.stdout.trim().length > 0;

  // Get modified files
  const modifiedFiles = hasUncommittedChanges
    ? statusResult.stdout
      .trim()
      .split("\n")
      .map((line) => line.substring(3))
    : [];

  // Check for unpushed commits
  const unpushedResult = await execGitCommand(
    `git log origin/${currentBranch}..HEAD --oneline`,
  );
  const hasUnpushedCommits =
    unpushedResult.success && unpushedResult.stdout.trim().length > 0;

  // Get remote info
  const { remoteName } = await hasRemoteRepository();

  // Get last commit hash
  const lastCommitResult = await execGitCommand("git rev-parse HEAD");
  const lastCommitHash = lastCommitResult.success
    ? lastCommitResult.stdout.trim().substring(0, 8)
    : undefined;

  return {
    hasUncommittedChanges,
    hasUnpushedCommits,
    currentBranch,
    remoteName,
    lastCommitHash,
    modifiedFiles,
  };
}

/**
 * Initialize Git repository
 */
export async function initGitRepository(): Promise<GitResult> {
  return await execGitCommand("git init");
}

/**
 * Add files to Git staging area
 */
export async function addFiles(files: string[] = ["."]): Promise<GitResult> {
  const filesList = files.join(" ");
  return await execGitCommand(`git add ${filesList}`);
}

/**
 * Commit changes with message
 */
export async function commitChanges(message: string): Promise<GitResult> {
  // Escape quotes in commit message
  const escapedMessage = message.replace(/"/g, '\\"');
  return await execGitCommand(`git commit -m "${escapedMessage}"`);
}

/**
 * Pull changes from remote repository
 */
export async function pullChanges(
  remote: string = "origin",
  branch?: string,
): Promise<GitResult> {
  const targetBranch = branch || DEFAULT_BRANCH;
  return await execGitCommand(`git pull ${remote} ${targetBranch}`);
}

/**
 * Push changes to remote repository
 */
export async function pushChanges(
  remote: string = "origin",
  branch?: string,
): Promise<GitResult> {
  const targetBranch = branch || DEFAULT_BRANCH;
  return await execGitCommand(`git push ${remote} ${targetBranch}`);
}

/**
 * Fetch changes from remote without merging
 */
export async function fetchChanges(
  remote: string = "origin",
): Promise<GitResult> {
  return await execGitCommand(`git fetch ${remote}`);
}

/**
 * Get commit log
 */
export async function getCommitLog(limit: number = 10): Promise<GitResult> {
  return await execGitCommand(`git log --oneline -${limit}`);
}

/**
 * Get diff of uncommitted changes
 */
export async function getDiff(cached: boolean = false): Promise<GitResult> {
  const command = cached ? "git diff --cached" : "git diff";
  return await execGitCommand(command);
}

/**
 * Check if working directory is clean (no uncommitted changes)
 */
export async function isWorkingDirectoryClean(): Promise<boolean> {
  const status = await getGitStatus();
  return !status.hasUncommittedChanges;
}

/**
 * Add and commit in one operation
 */
export async function addAndCommit(
  message: string,
  files: string[] = ["."],
): Promise<GitResult> {
  // First add files
  const addResult = await addFiles(files);
  if (!addResult.success) {
    return addResult;
  }

  // Check if there are actually changes to commit
  const statusResult = await execGitCommand("git status --porcelain");
  if (!statusResult.success || statusResult.stdout.trim().length === 0) {
    return {
      success: true,
      stdout: "No changes to commit",
      stderr: "",
      command: "git status --porcelain",
    };
  }

  // Then commit
  return await commitChanges(message);
}

/**
 * Full sync operation: add, commit, and push
 */
export async function addCommitAndPush(
  message: string,
  files: string[] = ["."],
  remote: string = "origin",
  branch?: string,
): Promise<GitResult> {
  // Add and commit
  const commitResult = await addAndCommit(message, files);
  if (!commitResult.success) {
    return commitResult;
  }

  // If no changes were committed, don't try to push
  if (commitResult.stdout.includes("No changes to commit")) {
    return commitResult;
  }

  // Push changes
  return await pushChanges(remote, branch);
}

/**
 * Reset changes (unstage files)
 */
export async function resetChanges(files: string[] = []): Promise<GitResult> {
  if (files.length === 0) {
    return await execGitCommand("git reset HEAD");
  } else {
    const filesList = files.join(" ");
    return await execGitCommand(`git reset HEAD ${filesList}`);
  }
}

/**
 * Discard changes in working directory
 */
export async function discardChanges(files: string[] = []): Promise<GitResult> {
  if (files.length === 0) {
    return await execGitCommand("git checkout -- .");
  } else {
    const filesList = files.join(" ");
    return await execGitCommand(`git checkout -- ${filesList}`);
  }
}

/**
 * Create and switch to new branch
 */
export async function createBranch(
  branchName: string,
  switchTo: boolean = true,
): Promise<GitResult> {
  const command = switchTo
    ? `git checkout -b ${branchName}`
    : `git branch ${branchName}`;
  return await execGitCommand(command);
}

/**
 * Switch to existing branch
 */
export async function switchBranch(branchName: string): Promise<GitResult> {
  return await execGitCommand(`git checkout ${branchName}`);
}

/**
 * List all branches
 */
export async function listBranches(): Promise<GitResult> {
  return await execGitCommand("git branch -a");
}

/**
 * Add remote repository
 */
export async function addRemote(name: string, url: string): Promise<GitResult> {
  return await execGitCommand(`git remote add ${name} ${url}`);
}

/**
 * Get detailed repository information
 */
export async function getRepositoryInfo(): Promise<{
  isRepo: boolean;
  hasRemote: boolean;
  status?: GitStatus;
  remoteInfo?: { remoteName: string; remoteUrl: string };
}> {
  const isRepo = await isGitRepository();
  if (!isRepo) {
    return { isRepo: false, hasRemote: false };
  }

  const [status, remoteInfo] = await Promise.all([
    getGitStatus(),
    hasRemoteRepository(),
  ]);

  return {
    isRepo: true,
    hasRemote: remoteInfo.hasRemote,
    status,
    remoteInfo: remoteInfo.hasRemote
      ? {
        remoteName: remoteInfo.remoteName!,
        remoteUrl: remoteInfo.remoteUrl!,
      }
      : undefined,
  };
}
