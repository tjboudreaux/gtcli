import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStorage } from "../account-storage.js";
import { TaskListService } from "./tasklist-service.js";

const mockTaskListsInstance = {
	tasklists: {
		list: vi.fn(),
		get: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
};

vi.mock("googleapis", () => ({
	google: {
		tasks: vi.fn(() => mockTaskListsInstance),
	},
}));

describe("TaskListService", () => {
	let service: TaskListService;
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
		service = new TaskListService(storage);
		vi.clearAllMocks();
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("list", () => {
		it("should list task lists", async () => {
			mockTaskListsInstance.tasklists.list.mockResolvedValue({
				data: {
					items: [
						{ id: "list1", title: "My Tasks", updated: "2024-01-01T00:00:00Z" },
						{ id: "list2", title: "Work", updated: "2024-01-02T00:00:00Z" },
					],
					nextPageToken: undefined,
				},
			});

			const result = await service.list("test@example.com");

			expect(result.items).toHaveLength(2);
			expect(result.items[0].id).toBe("list1");
			expect(result.items[0].title).toBe("My Tasks");
			expect(result.items[1].id).toBe("list2");
			expect(result.nextPageToken).toBeUndefined();
		});

		it("should pass pagination options", async () => {
			mockTaskListsInstance.tasklists.list.mockResolvedValue({
				data: { items: [], nextPageToken: "token123" },
			});

			const result = await service.list("test@example.com", {
				maxResults: 10,
				pageToken: "prevToken",
			});

			expect(mockTaskListsInstance.tasklists.list).toHaveBeenCalledWith({
				maxResults: 10,
				pageToken: "prevToken",
			});
			expect(result.nextPageToken).toBe("token123");
		});

		it("should handle empty list", async () => {
			mockTaskListsInstance.tasklists.list.mockResolvedValue({
				data: { items: undefined },
			});

			const result = await service.list("test@example.com");

			expect(result.items).toHaveLength(0);
		});
	});

	describe("get", () => {
		it("should get a task list by id", async () => {
			mockTaskListsInstance.tasklists.get.mockResolvedValue({
				data: {
					id: "list1",
					title: "My Tasks",
					updated: "2024-01-01T00:00:00Z",
					selfLink: "https://tasks.googleapis.com/tasks/v1/users/@me/lists/list1",
				},
			});

			const result = await service.get("test@example.com", "list1");

			expect(result.id).toBe("list1");
			expect(result.title).toBe("My Tasks");
			expect(mockTaskListsInstance.tasklists.get).toHaveBeenCalledWith({
				tasklist: "list1",
			});
		});
	});

	describe("create", () => {
		it("should create a new task list", async () => {
			mockTaskListsInstance.tasklists.insert.mockResolvedValue({
				data: {
					id: "newList",
					title: "New List",
					updated: "2024-01-01T00:00:00Z",
				},
			});

			const result = await service.create("test@example.com", "New List");

			expect(result.id).toBe("newList");
			expect(result.title).toBe("New List");
			expect(mockTaskListsInstance.tasklists.insert).toHaveBeenCalledWith({
				requestBody: { title: "New List" },
			});
		});
	});

	describe("update", () => {
		it("should update a task list title", async () => {
			mockTaskListsInstance.tasklists.update.mockResolvedValue({
				data: {
					id: "list1",
					title: "Updated Title",
					updated: "2024-01-02T00:00:00Z",
				},
			});

			const result = await service.update("test@example.com", "list1", "Updated Title");

			expect(result.title).toBe("Updated Title");
			expect(mockTaskListsInstance.tasklists.update).toHaveBeenCalledWith({
				tasklist: "list1",
				requestBody: { title: "Updated Title" },
			});
		});
	});

	describe("delete", () => {
		it("should delete a task list", async () => {
			mockTaskListsInstance.tasklists.delete.mockResolvedValue({});

			await service.delete("test@example.com", "list1");

			expect(mockTaskListsInstance.tasklists.delete).toHaveBeenCalledWith({
				tasklist: "list1",
			});
		});
	});

	describe("generateWebUrl", () => {
		it("should generate a web URL for a task list", () => {
			const url = service.generateWebUrl("list123");

			expect(url).toBe("https://tasks.google.com/embed/?origin=https://calendar.google.com&fullWidth=1&listId=list123");
		});
	});

	describe("error handling", () => {
		it("should throw error for unknown account", async () => {
			await expect(service.list("unknown@example.com")).rejects.toThrow("Account 'unknown@example.com' not found");
		});
	});

	describe("client cache", () => {
		it("should clear client cache", async () => {
			mockTaskListsInstance.tasklists.list.mockResolvedValue({
				data: { items: [] },
			});

			await service.list("test@example.com");
			service.clearTasksClientCache("test@example.com");
			await service.list("test@example.com");

			expect(mockTaskListsInstance.tasklists.list).toHaveBeenCalledTimes(2);
		});

		it("should clear all client caches", async () => {
			mockTaskListsInstance.tasklists.list.mockResolvedValue({
				data: { items: [] },
			});

			await service.list("test@example.com");
			service.clearTasksClientCache();
			await service.list("test@example.com");

			expect(mockTaskListsInstance.tasklists.list).toHaveBeenCalledTimes(2);
		});
	});
});
