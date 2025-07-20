import * as fs from "fs";
import * as path from "path";
import { Note } from "../../types/note.js";

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

export const OBSIDIAN_VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;
export const NOTES_SUBFOLDER = process.env.OBSIDIAN_SUBFOLDER || "ClaudeVault";

export interface VaultConfig {
  vaultPath: string;
  notesFolder: string;
  fullNotesPath: string;
}

/**
 * Get vault configuration
 */
export function getVaultConfig(): VaultConfig {
  if (!OBSIDIAN_VAULT_PATH) {
    throw new Error("OBSIDIAN_VAULT_PATH not configured");
  }

  const notesFolder = NOTES_SUBFOLDER;
  const fullNotesPath = path.join(OBSIDIAN_VAULT_PATH, notesFolder);

  return {
    vaultPath: OBSIDIAN_VAULT_PATH,
    notesFolder,
    fullNotesPath,
  };
}

/**
 * Ensure vault directory structure exists
 */
export function ensureVaultStructure(): void {
  const config = getVaultConfig();

  if (!fs.existsSync(config.vaultPath)) {
    throw new Error(`Vault directory does not exist: ${config.vaultPath}`);
  }

  if (!fs.existsSync(config.fullNotesPath)) {
    fs.mkdirSync(config.fullNotesPath, { recursive: true });
  }
}

/**
 * Read all markdown files from vault
 */
export function readVaultFiles(): string[] {
  const config = getVaultConfig();
  ensureVaultStructure();

  try {
    return fs
      .readdirSync(config.fullNotesPath)
      .filter((file) => file.endsWith(".md"))
      .map((file) => path.join(config.fullNotesPath, file));
  } catch (error) {
    console.error("Error reading vault files:", error);
    return [];
  }
}

/**
 * Read specific file content
 */
export function readVaultFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Write content to vault file
 */
export function writeVaultFile(filename: string, content: string): string {
  const config = getVaultConfig();
  ensureVaultStructure();

  const filePath = path.join(config.fullNotesPath, filename);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

/**
 * Delete file from vault
 */
export function deleteVaultFile(filename: string): boolean {
  const config = getVaultConfig();
  const filePath = path.join(config.fullNotesPath, filename);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filename}:`, error);
    return false;
  }
}

/**
 * Generate safe filename from title
 */
export function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .toLowerCase()
    .substring(0, 100); // Limit length
}

/**
 * Get filename for note
 */
export function getNoteFilename(note: Note): string {
  return `${sanitizeFilename(note.title)}.md`;
}
