# gtcli - Google Tasks CLI

[![CI](https://github.com/tjboudreaux/gtcli/actions/workflows/ci.yml/badge.svg)](https://github.com/tjboudreaux/gtcli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40tjboudreaux%2Fgtcli.svg)](https://www.npmjs.com/package/@tjboudreaux/gtcli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A fast, minimal command-line interface for Google Tasks. Manage your task lists and tasks directly from the terminal with simple, intuitive commands.

## Features

- **Multi-account support** - Manage tasks across multiple Google accounts
- **Full CRUD operations** - Create, read, update, delete tasks and task lists
- **Subtasks** - Create hierarchical task structures with parent-child relationships
- **Tab-separated output** - Easy to parse with standard Unix tools
- **Secure OAuth2** - Browser-based or manual authentication flow
- **Cross-platform** - Works on macOS, Linux, and Windows

## Install

```bash
npm install -g @tjboudreaux/gtcli
```

## Setup

Before using gtcli, you need OAuth2 credentials from Google Cloud Console:

1. [Create a new project](https://console.cloud.google.com/projectcreate) (or select existing)
2. Enable the [Google Tasks API](https://console.cloud.google.com/apis/api/tasks.googleapis.com)
3. [Set app name](https://console.cloud.google.com/auth/branding) in OAuth branding
4. [Add test users](https://console.cloud.google.com/auth/audience) (all Google accounts you want to use)
5. [Create OAuth client](https://console.cloud.google.com/auth/clients):
   - Click "Create Client"
   - Application type: "Desktop app"
   - Download the JSON file

Then configure gtcli:

```bash
gtcli accounts credentials ~/path/to/credentials.json
gtcli accounts add you@gmail.com
```

## Usage

```
gtcli accounts <action>                    Account management
gtcli <email> lists [command] [options]    Task list operations
gtcli <email> tasks <listId> [command]     Task operations
```

## Commands

### accounts

```bash
gtcli accounts credentials <file.json>   # Set OAuth credentials (once)
gtcli accounts list                      # List configured accounts
gtcli accounts add <email>               # Add account (opens browser)
gtcli accounts add <email> --manual      # Add account (browserless, paste redirect URL)
gtcli accounts remove <email>            # Remove account
```

### lists

```bash
# List all task lists
gtcli <email> lists [--max N] [--page TOKEN]

# Task list operations
gtcli <email> lists get <listId>
gtcli <email> lists create <title>
gtcli <email> lists update <listId> --title <title>
gtcli <email> lists delete <listId>
gtcli <email> lists url <listIds...>
```

### tasks

```bash
# List tasks in a task list
gtcli <email> tasks <listId> [--completed] [--hidden] [--max N]

# Task operations
gtcli <email> tasks <listId> get <taskId>
gtcli <email> tasks <listId> create <title> [--notes N] [--due DATE] [--parent ID]
gtcli <email> tasks <listId> update <taskId> [--title T] [--notes N] [--due DATE] [--status STATUS]
gtcli <email> tasks <listId> complete <taskId>
gtcli <email> tasks <listId> uncomplete <taskId>
gtcli <email> tasks <listId> delete <taskId>
gtcli <email> tasks <listId> move <taskId> [--parent ID] [--previous ID]
gtcli <email> tasks <listId> clear
gtcli <email> tasks <listId> url <taskIds...>
```

**Status options:** `needsAction`, `completed`

**Due date format:** RFC 3339 timestamp (e.g., `2024-12-31T00:00:00Z`)

## Examples

```bash
# List all task lists
gtcli you@gmail.com lists

# Create a new task list
gtcli you@gmail.com lists create "Shopping List"

# List tasks in default task list (use list ID from 'lists' command)
gtcli you@gmail.com tasks MTIzNDU2Nzg5

# Create a task with due date
gtcli you@gmail.com tasks MTIzNDU2Nzg5 create "Buy groceries" --due "2024-12-31T00:00:00Z"

# Create a task with notes
gtcli you@gmail.com tasks MTIzNDU2Nzg5 create "Call mom" --notes "Ask about dinner plans"

# Mark task as completed
gtcli you@gmail.com tasks MTIzNDU2Nzg5 complete TASK_ID

# List completed tasks
gtcli you@gmail.com tasks MTIzNDU2Nzg5 --completed

# Clear all completed tasks
gtcli you@gmail.com tasks MTIzNDU2Nzg5 clear

# Create a subtask
gtcli you@gmail.com tasks MTIzNDU2Nzg5 create "Buy milk" --parent PARENT_TASK_ID

# Move task to different position
gtcli you@gmail.com tasks MTIzNDU2Nzg5 move TASK_ID --previous SIBLING_TASK_ID
```

## Data Storage

All data is stored in `~/.gtcli/`:

- `credentials.json` - OAuth client credentials
- `accounts.json` - Account tokens

## Development

```bash
npm install
npm run build
npm run check
npm test
```

## Acknowledgements

Inspired by:
- [gmcli](https://github.com/badlogic/gmcli) - Gmail CLI by badlogic
- [gdcli](https://github.com/tjboudreaux/gdcli) - Google Drive CLI

## License

MIT
