import {
  getGitStatus,
  fullSync,
  pullChanges,
  commitChanges,
  pushChanges,
} from "../../utils/git-sync.js";

export async function handleSyncNotes(args: any): Promise<string> {
  const { operation = "full", message } = args;

  try {
    switch (operation) {
      case "status":
        return await handleSyncStatus();

      case "pull":
        return await handlePullOnly();

      case "commit":
        return await handleCommitOnly();

      case "push":
        return await handlePushOnly();

      case "full":
      default:
        return await handleFullSync();
    }
  } catch (error: any) {
    return `❌ Sync operation failed: ${error.message}`;
  }
}

async function handleSyncStatus(): Promise<string> {
  const status = await getGitStatus();

  let statusMessage = `📊 **Git Status for Notes Repository**\n\n`;
  statusMessage += `🌿 **Branch:** ${status.branch}\n`;
  statusMessage += `📝 **Has changes:** ${status.hasChanges ? "Yes" : "No"}\n`;
  statusMessage += `📋 **Uncommitted changes:** ${status.hasUncommittedChanges ? "Yes" : "No"}\n`;
  statusMessage += `⬆️ **Unpushed commits:** ${status.hasUnpushedCommits ? "Yes" : "No"}\n\n`;

  if (status.changedFiles.length > 0) {
    statusMessage += `**Changed files:**\n`;
    status.changedFiles.forEach((file) => {
      statusMessage += `  • ${file}\n`;
    });
    statusMessage += `\n`;
  }

  if (status.hasChanges) {
    statusMessage += `💡 **Recommendation:** Run sync with operation='full' to sync all changes`;
  } else {
    statusMessage += `✅ **Repository is up to date!**`;
  }

  return statusMessage;
}

async function handlePullOnly(): Promise<string> {
  const result = await pullChanges();

  if (result.success) {
    return `⬇️ **Pull completed successfully**\n\n${result.message}\n\n${result.details || ""}`;
  } else {
    return `❌ **Pull failed**\n\n${result.message}\n\n${result.details || ""}`;
  }
}

async function handleCommitOnly(customMessage?: string): Promise<string> {
  const commitMessage = customMessage || "Update notes via MCP server";
  const result = await commitChanges(commitMessage);

  if (result.success) {
    return `💾 **Commit completed**\n\n${result.message}\n\n${result.details || ""}`;
  } else {
    return `❌ **Commit failed**\n\n${result.message}\n\n${result.details || ""}`;
  }
}

async function handlePushOnly(): Promise<string> {
  const result = await pushChanges();

  if (result.success) {
    return `⬆️ **Push completed successfully**\n\n${result.message}\n\n${result.details || ""}`;
  } else {
    return `❌ **Push failed**\n\n${result.message}\n\n${result.details || ""}`;
  }
}

async function handleFullSync(): Promise<string> {
  const result = await fullSync();

  if (result.success) {
    return `🔄 **Full sync completed successfully!**\n\n${result.message}\n\n${result.details || ""}`;
  } else {
    return `❌ **Full sync failed**\n\n${result.message}\n\n${result.details || ""}`;
  }
}
