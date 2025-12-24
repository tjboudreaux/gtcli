import { google, type tasks_v1 } from "googleapis";
import type {
	CreateTaskOptions,
	MoveTaskOptions,
	Task,
	TaskOptions,
	TasksResult,
	UpdateTaskOptions,
} from "../types.js";
import { BaseService } from "./base-service.js";

export class TaskService extends BaseService {
	private tasksClients: Map<string, tasks_v1.Tasks> = new Map();

	private getTasksClient(email: string): tasks_v1.Tasks {
		if (!this.tasksClients.has(email)) {
			const auth = this.getOAuth2Client(email);
			const tasks = google.tasks({ version: "v1", auth });
			this.tasksClients.set(email, tasks);
		}
		return this.tasksClients.get(email)!;
	}

	async list(email: string, taskListId: string, options: TaskOptions = {}): Promise<TasksResult> {
		const client = this.getTasksClient(email);

		const params: tasks_v1.Params$Resource$Tasks$List = {
			tasklist: taskListId,
			maxResults: options.maxResults ?? 100,
			showCompleted: options.showCompleted ?? false,
			showDeleted: options.showDeleted ?? false,
			showHidden: options.showHidden ?? false,
		};

		if (options.pageToken) params.pageToken = options.pageToken;
		if (options.dueMin) params.dueMin = options.dueMin;
		if (options.dueMax) params.dueMax = options.dueMax;
		if (options.completedMin) params.completedMin = options.completedMin;
		if (options.completedMax) params.completedMax = options.completedMax;
		if (options.updatedMin) params.updatedMin = options.updatedMin;

		const response = await client.tasks.list(params);

		return {
			items: (response.data.items ?? []).map(this.mapTask),
			nextPageToken: response.data.nextPageToken ?? undefined,
		};
	}

	async get(email: string, taskListId: string, taskId: string): Promise<Task> {
		const client = this.getTasksClient(email);

		const response = await client.tasks.get({
			tasklist: taskListId,
			task: taskId,
		});

		return this.mapTask(response.data);
	}

	async create(email: string, taskListId: string, options: CreateTaskOptions): Promise<Task> {
		const client = this.getTasksClient(email);

		const params: tasks_v1.Params$Resource$Tasks$Insert = {
			tasklist: taskListId,
			requestBody: {
				title: options.title,
				notes: options.notes,
				due: options.due,
			},
		};

		if (options.parent) params.parent = options.parent;
		if (options.previous) params.previous = options.previous;

		const response = await client.tasks.insert(params);

		return this.mapTask(response.data);
	}

	async update(email: string, taskListId: string, taskId: string, options: UpdateTaskOptions): Promise<Task> {
		const client = this.getTasksClient(email);

		const currentTask = await this.get(email, taskListId, taskId);

		const requestBody: tasks_v1.Schema$Task = {
			id: taskId,
			title: options.title ?? currentTask.title,
			notes: options.notes ?? currentTask.notes,
			due: options.due ?? currentTask.due,
			status: options.status ?? currentTask.status,
		};

		const response = await client.tasks.update({
			tasklist: taskListId,
			task: taskId,
			requestBody,
		});

		return this.mapTask(response.data);
	}

	async delete(email: string, taskListId: string, taskId: string): Promise<void> {
		const client = this.getTasksClient(email);

		await client.tasks.delete({
			tasklist: taskListId,
			task: taskId,
		});
	}

	async move(email: string, taskListId: string, taskId: string, options: MoveTaskOptions = {}): Promise<Task> {
		const client = this.getTasksClient(email);

		const params: tasks_v1.Params$Resource$Tasks$Move = {
			tasklist: taskListId,
			task: taskId,
		};

		if (options.parent) params.parent = options.parent;
		if (options.previous) params.previous = options.previous;

		const response = await client.tasks.move(params);

		return this.mapTask(response.data);
	}

	async clear(email: string, taskListId: string): Promise<void> {
		const client = this.getTasksClient(email);

		await client.tasks.clear({
			tasklist: taskListId,
		});
	}

	async complete(email: string, taskListId: string, taskId: string): Promise<Task> {
		return this.update(email, taskListId, taskId, { status: "completed" });
	}

	async uncomplete(email: string, taskListId: string, taskId: string): Promise<Task> {
		return this.update(email, taskListId, taskId, { status: "needsAction" });
	}

	generateWebUrl(taskListId: string, taskId?: string): string {
		const baseUrl = `https://tasks.google.com/embed/?origin=https://calendar.google.com&fullWidth=1&listId=${taskListId}`;
		if (taskId) {
			return `${baseUrl}&taskId=${taskId}`;
		}
		return baseUrl;
	}

	private mapTask(task: tasks_v1.Schema$Task): Task {
		return {
			id: task.id ?? "",
			title: task.title ?? "",
			status: (task.status as "needsAction" | "completed") ?? "needsAction",
			due: task.due ?? undefined,
			notes: task.notes ?? undefined,
			parent: task.parent ?? undefined,
			position: task.position ?? undefined,
			completed: task.completed ?? undefined,
			deleted: task.deleted ?? undefined,
			hidden: task.hidden ?? undefined,
			links: task.links?.map((link) => ({
				type: link.type ?? undefined,
				description: link.description ?? undefined,
				link: link.link ?? undefined,
			})),
			selfLink: task.selfLink ?? undefined,
			updated: task.updated ?? undefined,
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
