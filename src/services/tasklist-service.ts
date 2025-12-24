import { google, type tasks_v1 } from "googleapis";
import type { TaskList, TaskListOptions, TaskListsResult } from "../types.js";
import { BaseService } from "./base-service.js";

export class TaskListService extends BaseService {
	private tasksClients: Map<string, tasks_v1.Tasks> = new Map();

	private getTasksClient(email: string): tasks_v1.Tasks {
		if (!this.tasksClients.has(email)) {
			const auth = this.getOAuth2Client(email);
			const tasks = google.tasks({ version: "v1", auth });
			this.tasksClients.set(email, tasks);
		}
		return this.tasksClients.get(email)!;
	}

	async list(email: string, options: TaskListOptions = {}): Promise<TaskListsResult> {
		const client = this.getTasksClient(email);

		const params: tasks_v1.Params$Resource$Tasklists$List = {
			maxResults: options.maxResults ?? 100,
		};

		if (options.pageToken) {
			params.pageToken = options.pageToken;
		}

		const response = await client.tasklists.list(params);

		return {
			items: (response.data.items ?? []).map(this.mapTaskList),
			nextPageToken: response.data.nextPageToken ?? undefined,
		};
	}

	async get(email: string, taskListId: string): Promise<TaskList> {
		const client = this.getTasksClient(email);

		const response = await client.tasklists.get({
			tasklist: taskListId,
		});

		return this.mapTaskList(response.data);
	}

	async create(email: string, title: string): Promise<TaskList> {
		const client = this.getTasksClient(email);

		const response = await client.tasklists.insert({
			requestBody: { title },
		});

		return this.mapTaskList(response.data);
	}

	async update(email: string, taskListId: string, title: string): Promise<TaskList> {
		const client = this.getTasksClient(email);

		const response = await client.tasklists.update({
			tasklist: taskListId,
			requestBody: { title },
		});

		return this.mapTaskList(response.data);
	}

	async delete(email: string, taskListId: string): Promise<void> {
		const client = this.getTasksClient(email);

		await client.tasklists.delete({
			tasklist: taskListId,
		});
	}

	generateWebUrl(taskListId: string): string {
		return `https://tasks.google.com/embed/?origin=https://calendar.google.com&fullWidth=1&listId=${taskListId}`;
	}

	private mapTaskList(taskList: tasks_v1.Schema$TaskList): TaskList {
		return {
			id: taskList.id ?? "",
			title: taskList.title ?? "",
			updated: taskList.updated ?? undefined,
			selfLink: taskList.selfLink ?? undefined,
		};
	}

	clearTasksClientCache(email?: string): void {
		if (email) {
			this.tasksClients.delete(email);
		} else {
			this.tasksClients.clear();
		}
		this.clearClientCache(email);
	}
}
