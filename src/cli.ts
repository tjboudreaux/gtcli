#!/usr/bin/env node

import * as fs from "node:fs";
import { parseArgs } from "node:util";
import { AccountStorage } from "./account-storage.js";
import { OAuthFlow } from "./oauth-flow.js";
import { TaskService } from "./services/task-service.js";
import { TaskListService } from "./services/tasklist-service.js";
import type { Account } from "./types.js";

const storage = new AccountStorage();
const taskListService = new TaskListService(storage);
const taskService = new TaskService(storage);

function usage(): never {
	console.log(`gtcli - Google Tasks CLI

USAGE

  gtcli accounts <action>                    Account management
  gtcli <email> lists [command] [options]    Task list operations
  gtcli <email> tasks <listId> [command]     Task operations

ACCOUNT COMMANDS

  gtcli accounts credentials <file.json>     Set OAuth credentials (once)
  gtcli accounts list                        List configured accounts
  gtcli accounts add <email> [--manual]      Add account (--manual for browserless OAuth)
  gtcli accounts remove <email>              Remove account

TASK LIST COMMANDS

  gtcli <email> lists                        List all task lists
  gtcli <email> lists get <listId>           Get task list details
  gtcli <email> lists create <title>         Create new task list
  gtcli <email> lists update <listId> --title <title>
                                             Update task list title
  gtcli <email> lists delete <listId>        Delete task list
  gtcli <email> lists url <listIds...>       Generate web URLs

TASK COMMANDS

  gtcli <email> tasks <listId>               List tasks in list
  gtcli <email> tasks <listId> --completed   Include completed tasks
  gtcli <email> tasks <listId> --hidden      Include hidden tasks

  gtcli <email> tasks <listId> get <taskId>  Get task details

  gtcli <email> tasks <listId> create <title> [--notes N] [--due DATE]
                                             Create task

  gtcli <email> tasks <listId> update <taskId> [--title T] [--notes N] [--due DATE] [--status STATUS]
                                             Update task

  gtcli <email> tasks <listId> complete <taskId>
                                             Mark task as completed

  gtcli <email> tasks <listId> uncomplete <taskId>
                                             Mark task as needs action

  gtcli <email> tasks <listId> delete <taskId>
                                             Delete task

  gtcli <email> tasks <listId> move <taskId> [--parent ID] [--previous ID]
                                             Move/reorder task

  gtcli <email> tasks <listId> clear         Clear completed tasks

  gtcli <email> tasks <listId> url <taskIds...>
                                             Generate web URLs

DATA STORAGE

  ~/.gtcli/credentials.json   OAuth client credentials
  ~/.gtcli/accounts.json      Account tokens`);
	process.exit(1);
}

function error(msg: string): never {
	console.error("Error:", msg);
	process.exit(1);
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		usage();
	}

	const first = args[0];
	const rest = args.slice(1);

	try {
		if (first === "accounts") {
			await handleAccounts(rest);
			return;
		}

		const account = first;
		const service = rest[0];
		const serviceArgs = rest.slice(1);

		if (!service) {
			error("Missing service. Use: lists, tasks");
		}

		switch (service) {
			case "lists":
				await handleLists(account, serviceArgs);
				break;
			case "tasks":
				await handleTasks(account, serviceArgs);
				break;
			default:
				error(`Unknown service: ${service}`);
		}
	} catch (e) {
		error(e instanceof Error ? e.message : String(e));
	}
}

async function handleAccounts(args: string[]) {
	const action = args[0];
	if (!action) error("Missing action: list|add|remove|credentials");

	switch (action) {
		case "list": {
			const accounts = storage.getAllAccounts();
			if (accounts.length === 0) {
				console.log("No accounts configured");
			} else {
				for (const a of accounts) {
					console.log(a.email);
				}
			}
			break;
		}
		case "credentials": {
			const credFile = args[1];
			if (!credFile) error("Usage: accounts credentials <credentials.json>");
			const creds = JSON.parse(fs.readFileSync(credFile, "utf8"));
			const installed = creds.installed || creds.web;
			if (!installed) error("Invalid credentials file");
			storage.setCredentials(installed.client_id, installed.client_secret);
			console.log("Credentials saved");
			break;
		}
		case "add": {
			const manual = args.includes("--manual");
			const filtered = args.slice(1).filter((a) => a !== "--manual");
			const email = filtered[0];
			if (!email) error("Usage: accounts add <email> [--manual]");
			if (storage.hasAccount(email)) error(`Account '${email}' already exists`);
			const creds = storage.getCredentials();
			if (!creds) error("No credentials configured. Run: gtcli accounts credentials <credentials.json>");
			const flow = new OAuthFlow({ clientId: creds.clientId, clientSecret: creds.clientSecret });
			const result = await flow.authorize(manual);
			const account: Account = {
				email,
				oauth2: {
					clientId: creds.clientId,
					clientSecret: creds.clientSecret,
					refreshToken: result.refreshToken,
					accessToken: result.accessToken,
				},
			};
			storage.addAccount(account);
			console.log(`Account '${email}' added`);
			break;
		}
		case "remove": {
			const email = args[1];
			if (!email) error("Usage: accounts remove <email>");
			const deleted = storage.deleteAccount(email);
			console.log(deleted ? `Removed '${email}'` : `Not found: ${email}`);
			break;
		}
		default:
			error(`Unknown action: ${action}`);
	}
}

async function handleLists(account: string, args: string[]) {
	const command = args[0];

	// If no command or command looks like an option, list all task lists
	if (!command || command.startsWith("-")) {
		const { values } = parseArgs({
			args,
			options: {
				max: { type: "string", short: "m" },
				page: { type: "string", short: "p" },
			},
		});

		const result = await taskListService.list(account, {
			maxResults: values.max ? Number(values.max) : undefined,
			pageToken: values.page,
		});

		console.log("ID\tTITLE\tUPDATED");
		for (const list of result.items) {
			const updated = list.updated ? list.updated.slice(0, 16).replace("T", " ") : "-";
			console.log(`${list.id}\t${list.title}\t${updated}`);
		}
		if (result.nextPageToken) {
			console.log(`\n# Next page: --page ${result.nextPageToken}`);
		}
		return;
	}

	const cmdArgs = args.slice(1);

	switch (command) {
		case "get": {
			const listId = cmdArgs[0];
			if (!listId) error("Usage: lists get <listId>");
			const list = await taskListService.get(account, listId);
			console.log(JSON.stringify(list, null, 2));
			break;
		}
		case "create": {
			const title = cmdArgs.join(" ");
			if (!title) error("Usage: lists create <title>");
			const list = await taskListService.create(account, title);
			console.log(`Created: ${list.id}\t${list.title}`);
			break;
		}
		case "update": {
			const { values, positionals } = parseArgs({
				args: cmdArgs,
				options: { title: { type: "string", short: "t" } },
				allowPositionals: true,
			});
			const listId = positionals[0];
			if (!listId || !values.title) {
				error("Usage: lists update <listId> --title <title>");
			}
			const list = await taskListService.update(account, listId, values.title);
			console.log(`Updated: ${list.id}\t${list.title}`);
			break;
		}
		case "delete": {
			const listId = cmdArgs[0];
			if (!listId) error("Usage: lists delete <listId>");
			await taskListService.delete(account, listId);
			console.log("Deleted");
			break;
		}
		case "url": {
			if (cmdArgs.length === 0) error("Usage: lists url <listIds...>");
			for (const id of cmdArgs) {
				console.log(`${id}\t${taskListService.generateWebUrl(id)}`);
			}
			break;
		}
		default:
			error(`Unknown lists command: ${command}`);
	}
}

async function handleTasks(account: string, args: string[]) {
	const listId = args[0];
	if (!listId) error("Usage: tasks <listId> [command] [options]");

	const command = args[1];
	const cmdArgs = args.slice(2);

	// If no command or command is an option, list tasks
	if (!command || command.startsWith("-")) {
		const allArgs = args.slice(1);
		const { values } = parseArgs({
			args: allArgs,
			options: {
				completed: { type: "boolean", short: "c" },
				hidden: { type: "boolean", short: "h" },
				max: { type: "string", short: "m" },
				page: { type: "string", short: "p" },
			},
		});

		const result = await taskService.list(account, listId, {
			showCompleted: values.completed ?? false,
			showHidden: values.hidden ?? false,
			maxResults: values.max ? Number(values.max) : undefined,
			pageToken: values.page,
		});

		console.log("ID\tSTATUS\tTITLE\tDUE");
		for (const task of result.items) {
			const status = task.status === "completed" ? "✓" : "○";
			const due = task.due ? task.due.slice(0, 10) : "-";
			console.log(`${task.id}\t${status}\t${task.title}\t${due}`);
		}
		if (result.nextPageToken) {
			console.log(`\n# Next page: --page ${result.nextPageToken}`);
		}
		return;
	}

	switch (command) {
		case "get": {
			const taskId = cmdArgs[0];
			if (!taskId) error("Usage: tasks <listId> get <taskId>");
			const task = await taskService.get(account, listId, taskId);
			console.log(JSON.stringify(task, null, 2));
			break;
		}
		case "create": {
			const { values, positionals } = parseArgs({
				args: cmdArgs,
				options: {
					notes: { type: "string", short: "n" },
					due: { type: "string", short: "d" },
					parent: { type: "string", short: "p" },
				},
				allowPositionals: true,
			});
			const title = positionals.join(" ");
			if (!title) error("Usage: tasks <listId> create <title> [--notes N] [--due DATE]");
			const task = await taskService.create(account, listId, {
				title,
				notes: values.notes,
				due: values.due,
				parent: values.parent,
			});
			console.log(`Created: ${task.id}\t${task.title}`);
			break;
		}
		case "update": {
			const { values, positionals } = parseArgs({
				args: cmdArgs,
				options: {
					title: { type: "string", short: "t" },
					notes: { type: "string", short: "n" },
					due: { type: "string", short: "d" },
					status: { type: "string", short: "s" },
				},
				allowPositionals: true,
			});
			const taskId = positionals[0];
			if (!taskId) error("Usage: tasks <listId> update <taskId> [--title T] [--notes N] [--due DATE]");
			const task = await taskService.update(account, listId, taskId, {
				title: values.title,
				notes: values.notes,
				due: values.due,
				status: values.status as "needsAction" | "completed" | undefined,
			});
			console.log(`Updated: ${task.id}\t${task.title}`);
			break;
		}
		case "complete": {
			const taskId = cmdArgs[0];
			if (!taskId) error("Usage: tasks <listId> complete <taskId>");
			const task = await taskService.complete(account, listId, taskId);
			console.log(`Completed: ${task.id}\t${task.title}`);
			break;
		}
		case "uncomplete": {
			const taskId = cmdArgs[0];
			if (!taskId) error("Usage: tasks <listId> uncomplete <taskId>");
			const task = await taskService.uncomplete(account, listId, taskId);
			console.log(`Uncompleted: ${task.id}\t${task.title}`);
			break;
		}
		case "delete": {
			const taskId = cmdArgs[0];
			if (!taskId) error("Usage: tasks <listId> delete <taskId>");
			await taskService.delete(account, listId, taskId);
			console.log("Deleted");
			break;
		}
		case "move": {
			const { values, positionals } = parseArgs({
				args: cmdArgs,
				options: {
					parent: { type: "string", short: "p" },
					previous: { type: "string" },
				},
				allowPositionals: true,
			});
			const taskId = positionals[0];
			if (!taskId) error("Usage: tasks <listId> move <taskId> [--parent ID] [--previous ID]");
			const task = await taskService.move(account, listId, taskId, {
				parent: values.parent,
				previous: values.previous,
			});
			console.log(`Moved: ${task.id}\t${task.title}`);
			break;
		}
		case "clear": {
			await taskService.clear(account, listId);
			console.log("Cleared completed tasks");
			break;
		}
		case "url": {
			if (cmdArgs.length === 0) error("Usage: tasks <listId> url <taskIds...>");
			for (const id of cmdArgs) {
				console.log(`${id}\t${taskService.generateWebUrl(listId, id)}`);
			}
			break;
		}
		default:
			error(`Unknown tasks command: ${command}`);
	}
}

main();
