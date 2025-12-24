import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStorage } from "../account-storage.js";
import { TaskService } from "./task-service.js";

const mockTasksInstance = {
	tasks: {
		list: vi.fn(),
		get: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		move: vi.fn(),
		clear: vi.fn(),
	},
};

vi.mock("googleapis", () => ({
	google: {
		tasks: vi.fn(() => mockTasksInstance),
	},
}));

describe("TaskService", () => {
	let service: TaskService;
	let storage: AccountStorage;
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gtcli-test-"));
		storage = new AccountStorage(tempDir);
		storage.addAccount({
			email: "test@example.com",
			oauth2: {
				clientId: "test-client-id",
				clientSecret: "test-client-secret",
				refreshToken: "test-refresh-token",
			},
		});
		service = new TaskService(storage);
		vi.clearAllMocks();
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("list", () => {
		it("should list tasks in a task list", async () => {
			mockTasksInstance.tasks.list.mockResolvedValue({
				data: {
					items: [
						{ id: "task1", title: "Buy groceries", status: "needsAction" },
						{ id: "task2", title: "Call mom", status: "completed" },
					],
					nextPageToken: undefined,
				},
			});

			const result = await service.list("test@example.com", "list1");

			expect(result.items).toHaveLength(2);
			expect(result.items[0].id).toBe("task1");
			expect(result.items[0].title).toBe("Buy groceries");
			expect(result.items[0].status).toBe("needsAction");
		});

		it("should pass filter options", async () => {
			mockTasksInstance.tasks.list.mockResolvedValue({
				data: { items: [] },
			});

			await service.list("test@example.com", "list1", {
				showCompleted: true,
				showDeleted: true,
				showHidden: true,
				maxResults: 50,
				dueMin: "2024-01-01T00:00:00Z",
				dueMax: "2024-12-31T23:59:59Z",
			});

			expect(mockTasksInstance.tasks.list).toHaveBeenCalledWith({
				tasklist: "list1",
				maxResults: 50,
				showCompleted: true,
				showDeleted: true,
				showHidden: true,
				dueMin: "2024-01-01T00:00:00Z",
				dueMax: "2024-12-31T23:59:59Z",
			});
		});

		it("should handle empty list", async () => {
			mockTasksInstance.tasks.list.mockResolvedValue({
				data: { items: undefined },
			});

			const result = await service.list("test@example.com", "list1");

			expect(result.items).toHaveLength(0);
		});
	});

	describe("get", () => {
		it("should get a task by id", async () => {
			mockTasksInstance.tasks.get.mockResolvedValue({
				data: {
					id: "task1",
					title: "Buy groceries",
					status: "needsAction",
					notes: "Milk, eggs, bread",
					due: "2024-01-15T00:00:00Z",
				},
			});

			const result = await service.get("test@example.com", "list1", "task1");

			expect(result.id).toBe("task1");
			expect(result.title).toBe("Buy groceries");
			expect(result.notes).toBe("Milk, eggs, bread");
			expect(mockTasksInstance.tasks.get).toHaveBeenCalledWith({
				tasklist: "list1",
				task: "task1",
			});
		});
	});

	describe("create", () => {
		it("should create a new task", async () => {
			mockTasksInstance.tasks.insert.mockResolvedValue({
				data: {
					id: "newTask",
					title: "New Task",
					status: "needsAction",
					notes: "Some notes",
					due: "2024-01-20T00:00:00Z",
				},
			});

			const result = await service.create("test@example.com", "list1", {
				title: "New Task",
				notes: "Some notes",
				due: "2024-01-20T00:00:00Z",
			});

			expect(result.id).toBe("newTask");
			expect(result.title).toBe("New Task");
			expect(mockTasksInstance.tasks.insert).toHaveBeenCalledWith({
				tasklist: "list1",
				requestBody: {
					title: "New Task",
					notes: "Some notes",
					due: "2024-01-20T00:00:00Z",
				},
			});
		});

		it("should create a subtask with parent", async () => {
			mockTasksInstance.tasks.insert.mockResolvedValue({
				data: { id: "subtask", title: "Subtask", status: "needsAction" },
			});

			await service.create("test@example.com", "list1", {
				title: "Subtask",
				parent: "parentTask",
			});

			expect(mockTasksInstance.tasks.insert).toHaveBeenCalledWith({
				tasklist: "list1",
				parent: "parentTask",
				requestBody: {
					title: "Subtask",
					notes: undefined,
					due: undefined,
				},
			});
		});
	});

	describe("update", () => {
		it("should update a task", async () => {
			mockTasksInstance.tasks.get.mockResolvedValue({
				data: {
					id: "task1",
					title: "Old Title",
					status: "needsAction",
					notes: "Old notes",
				},
			});
			mockTasksInstance.tasks.update.mockResolvedValue({
				data: {
					id: "task1",
					title: "New Title",
					status: "needsAction",
					notes: "New notes",
				},
			});

			const result = await service.update("test@example.com", "list1", "task1", {
				title: "New Title",
				notes: "New notes",
			});

			expect(result.title).toBe("New Title");
			expect(mockTasksInstance.tasks.update).toHaveBeenCalledWith({
				tasklist: "list1",
				task: "task1",
				requestBody: {
					id: "task1",
					title: "New Title",
					notes: "New notes",
					due: undefined,
					status: "needsAction",
				},
			});
		});
	});

	describe("delete", () => {
		it("should delete a task", async () => {
			mockTasksInstance.tasks.delete.mockResolvedValue({});

			await service.delete("test@example.com", "list1", "task1");

			expect(mockTasksInstance.tasks.delete).toHaveBeenCalledWith({
				tasklist: "list1",
				task: "task1",
			});
		});
	});

	describe("move", () => {
		it("should move a task", async () => {
			mockTasksInstance.tasks.move.mockResolvedValue({
				data: { id: "task1", title: "Task", status: "needsAction" },
			});

			const result = await service.move("test@example.com", "list1", "task1", {
				parent: "parentTask",
				previous: "siblingTask",
			});

			expect(result.id).toBe("task1");
			expect(mockTasksInstance.tasks.move).toHaveBeenCalledWith({
				tasklist: "list1",
				task: "task1",
				parent: "parentTask",
				previous: "siblingTask",
			});
		});
	});

	describe("clear", () => {
		it("should clear completed tasks", async () => {
			mockTasksInstance.tasks.clear.mockResolvedValue({});

			await service.clear("test@example.com", "list1");

			expect(mockTasksInstance.tasks.clear).toHaveBeenCalledWith({
				tasklist: "list1",
			});
		});
	});

	describe("complete", () => {
		it("should mark a task as completed", async () => {
			mockTasksInstance.tasks.get.mockResolvedValue({
				data: { id: "task1", title: "Task", status: "needsAction" },
			});
			mockTasksInstance.tasks.update.mockResolvedValue({
				data: { id: "task1", title: "Task", status: "completed" },
			});

			const result = await service.complete("test@example.com", "list1", "task1");

			expect(result.status).toBe("completed");
		});
	});

	describe("uncomplete", () => {
		it("should mark a task as needs action", async () => {
			mockTasksInstance.tasks.get.mockResolvedValue({
				data: { id: "task1", title: "Task", status: "completed" },
			});
			mockTasksInstance.tasks.update.mockResolvedValue({
				data: { id: "task1", title: "Task", status: "needsAction" },
			});

			const result = await service.uncomplete("test@example.com", "list1", "task1");

			expect(result.status).toBe("needsAction");
		});
	});

	describe("generateWebUrl", () => {
		it("should generate a web URL for a task list", () => {
			const url = service.generateWebUrl("list123");

			expect(url).toBe("https://tasks.google.com/embed/?origin=https://calendar.google.com&fullWidth=1&listId=list123");
		});

		it("should generate a web URL for a specific task", () => {
			const url = service.generateWebUrl("list123", "task456");

			expect(url).toBe(
				"https://tasks.google.com/embed/?origin=https://calendar.google.com&fullWidth=1&listId=list123&taskId=task456",
			);
		});
	});

	describe("error handling", () => {
		it("should throw error for unknown account", async () => {
			await expect(service.list("unknown@example.com", "list1")).rejects.toThrow(
				"Account 'unknown@example.com' not found",
			);
		});
	});

	describe("client cache", () => {
		it("should clear client cache", async () => {
			mockTasksInstance.tasks.list.mockResolvedValue({
				data: { items: [] },
			});

			await service.list("test@example.com", "list1");
			service.clearTasksClientCache("test@example.com");
			await service.list("test@example.com", "list1");

			expect(mockTasksInstance.tasks.list).toHaveBeenCalledTimes(2);
		});
	});
});
