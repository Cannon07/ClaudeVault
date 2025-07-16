# ClaudeVault

A powerful TypeScript-based Model Context Protocol (MCP) server that enables intelligent note-taking with Git synchronization. Built for seamless integration with Claude Desktop and multi-device workflows.

## 🌟 Features

### 📝 Complete Note Management
- **Create, Read, Update, Delete** notes with rich metadata
- **Smart search** across titles, content, tags, projects, and categories
- **Flexible organization** with tags, projects, and categories
- **Preview and confirmation** system for safe updates and deletions
- **Unique ID generation** with timestamp-based identification

### 🔄 Git Synchronization
- **Multi-device sync** across work and personal machines
- **Automatic Git operations** (pull, commit, push)
- **Custom commit messages** and branch configuration
- **Flexible sync modes**: status check, pull-only, commit-only, push-only, full sync
- **Conflict-free operations** with proper Git workflow

### ⚙️ Professional Configuration
- **Environment variable support** for flexible deployment
- **Configurable repository paths** and Git settings
- **Clean modular architecture** with separated concerns
- **TypeScript implementation** with full type safety
- **Production-ready error handling** and logging

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Git configured with GitHub access
- Claude Desktop application

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/note-taking-mcp-server.git
   cd note-taking-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Set up your notes repository**
   ```bash
   # Create a private repository on GitHub for your notes
   git clone https://github.com/yourusername/personal-knowledge-base.git
   cd personal-knowledge-base
   mkdir notes
   echo "# Personal Knowledge Base" > README.md
   git add .
   git commit -m "Initial setup"
   git push
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

6. **Configure Claude Desktop**
   
   Add to your Claude Desktop configuration file:
   ```json
   {
     "mcpServers": {
       "note-taking": {
         "command": "/path/to/your/note-taking-mcp-server/start-server.sh"
       }
     }
   }
   ```

7. **Create start script**
   ```bash
   echo '#!/bin/bash
   cd /path/to/your/note-taking-mcp-server
   exec node dist/index.js' > start-server.sh
   chmod +x start-server.sh
   ```

8. **Restart Claude Desktop** and start taking notes!

## 📁 Project Structure

```
src/
├── index.ts                # Main MCP server
├── types/
│   └── note.ts             # Note interface and types
├── storage/
│   ├── index.ts            # Storage API exports
│   └── notes-store.ts      # Core storage operations
├── tools/
│   ├── index.ts            # Tools API exports
│   ├── definitions.ts      # MCP tool definitions
│   └── handlers/           # Individual tool handlers
│       ├── add-note.ts
│       ├── search-notes.ts
│       ├── list-notes.ts
│       ├── update-note.ts
│       ├── delete-note.ts
│       └── sync-notes.ts
└── utils/
    └── git-sync.ts         # Git synchronization utilities
```

## 🛠️ Configuration

### Environment Variables (.env)

```bash
# Notes Repository Configuration
NOTES_REPO_PATH=/path/to/your/personal-knowledge-base

# Git Configuration
DEFAULT_BRANCH=main
AUTO_SYNC=false
SYNC_INTERVAL_MINUTES=5

# MCP Server Configuration
SERVER_NAME=note-taking-mcp
SERVER_VERSION=1.0.0
DATA_SUBFOLDER=notes
```

### Note Structure

Each note is stored as a JSON file with the following structure:

```json
{
  "id": "note-1234567890123",
  "title": "Note Title",
  "content": "Note content with full markdown support",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "tags": ["tag1", "tag2"],
  "project": "project-name",
  "category": "category-name"
}
```

## 💬 Usage Examples

### Basic Note Operations

```
# Add a new note
"Add a note titled 'API Design Patterns' with content 'REST vs GraphQL comparison' and tags 'api, design, architecture'"

# Search notes
"Search for notes about 'database optimization'"

# List recent notes
"List my last 5 notes"

# Update a note
"Update note note-1234567890123 to add tag 'important'"

# Delete a note
"Delete note about 'old project requirements'"
```

### Git Synchronization

```
# Check sync status
"Sync notes with operation 'status'"

# Full synchronization
"Sync notes"

# Pull latest changes only
"Sync notes with operation 'pull'"

# Commit with custom message
"Sync notes with operation 'commit' and message 'Daily standup notes'"

# Push only
"Sync notes with operation 'push'"
```

## 🔄 Multi-Device Workflow

1. **Primary Setup**: Set up the MCP server on your main machine
2. **Secondary Setup**: Clone and configure on additional machines
3. **Sync Workflow**: 
   - Start work session: `sync notes operation='pull'`
   - Work with notes normally
   - End session: `sync notes` (full sync)
4. **Automatic Sync**: Notes stay synchronized across all devices

## 🏗️ Architecture

### MCP Integration
- Uses Anthropic's Model Context Protocol for Claude integration
- Implements standard MCP tool definitions and handlers
- Supports both synchronous and asynchronous operations

### Storage Layer
- JSON file-based storage for simplicity and portability
- Git repository for backup, versioning, and synchronization
- Configurable storage location via environment variables

### Git Integration
- Automatic pull before operations to prevent conflicts
- Smart commit detection (only commits when changes exist)
- Configurable branch and commit message handling
- Error handling for common Git scenarios

## 🚀 Development

### Available Scripts

```bash
npm run build    # Compile TypeScript to JavaScript
npm run dev      # Run server in development mode
npm start        # Run compiled server
```

### Adding New Tools

1. Create handler in `src/tools/handlers/`
2. Add tool definition in `src/tools/definitions.ts`
3. Export from `src/tools/index.ts`
4. Add case in main server switch statement
5. Build and test

## 🔒 Security & Privacy

- **Private notes repository**: Keep personal notes separate from code
- **Environment-based configuration**: No sensitive data in source code
- **Git authentication**: Uses your existing GitHub authentication
- **Local-first**: Notes stored locally with cloud backup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for the Model Context Protocol
- [Claude Desktop](https://claude.ai) for MCP integration
- The open-source community for TypeScript and Node.js ecosystem

## 📞 Support

- Create an issue for bug reports or feature requests
- Check existing issues before creating new ones
- Provide detailed information for better assistance

---

**Built with ❤️ for developers who love taking smart notes**
