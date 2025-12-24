import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AccountStorage } from "./account-storage.js";

describe("AccountStorage", () => {
	let tempDir: string;
	let storage: AccountStorage;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gtcli-test-"));
		storage = new AccountStorage(tempDir);
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("account management", () => {
		it("should add and retrieve an account", () => {
			const account = {
				email: "test@example.com",
				oauth2: {
					clientId: "client-id",
					clientSecret: "client-secret",
					refreshToken: "refresh-token",
				},
			};

			storage.addAccount(account);
			const retrieved = storage.getAccount("test@example.com");

			expect(retrieved).toEqual(account);
		});

		it("should return undefined for non-existent account", () => {
			const retrieved = storage.getAccount("nonexistent@example.com");
			expect(retrieved).toBeUndefined();
		});

		it("should list all accounts", () => {
			storage.addAccount({
				email: "user1@example.com",
				oauth2: { clientId: "c1", clientSecret: "s1", refreshToken: "r1" },
			});
			storage.addAccount({
				email: "user2@example.com",
				oauth2: { clientId: "c2", clientSecret: "s2", refreshToken: "r2" },
			});

			const accounts = storage.getAllAccounts();

			expect(accounts).toHaveLength(2);
			expect(accounts.map((a) => a.email).sort()).toEqual(["user1@example.com", "user2@example.com"]);
		});

		it("should delete an account", () => {
			storage.addAccount({
				email: "test@example.com",
				oauth2: { clientId: "c", clientSecret: "s", refreshToken: "r" },
			});

			const deleted = storage.deleteAccount("test@example.com");

			expect(deleted).toBe(true);
			expect(storage.getAccount("test@example.com")).toBeUndefined();
		});

		it("should return false when deleting non-existent account", () => {
			const deleted = storage.deleteAccount("nonexistent@example.com");
			expect(deleted).toBe(false);
		});

		it("should check if account exists", () => {
			storage.addAccount({
				email: "test@example.com",
				oauth2: { clientId: "c", clientSecret: "s", refreshToken: "r" },
			});

			expect(storage.hasAccount("test@example.com")).toBe(true);
			expect(storage.hasAccount("other@example.com")).toBe(false);
		});

		it("should persist accounts to file", () => {
			storage.addAccount({
				email: "test@example.com",
				oauth2: { clientId: "c", clientSecret: "s", refreshToken: "r" },
			});

			const newStorage = new AccountStorage(tempDir);
			const account = newStorage.getAccount("test@example.com");

			expect(account?.email).toBe("test@example.com");
		});
	});

	describe("credentials management", () => {
		it("should set and get credentials", () => {
			storage.setCredentials("my-client-id", "my-client-secret");

			const creds = storage.getCredentials();

			expect(creds).toEqual({
				clientId: "my-client-id",
				clientSecret: "my-client-secret",
			});
		});

		it("should return null when no credentials exist", () => {
			const creds = storage.getCredentials();
			expect(creds).toBeNull();
		});

		it("should persist credentials to file", () => {
			storage.setCredentials("my-client-id", "my-client-secret");

			const newStorage = new AccountStorage(tempDir);
			const creds = newStorage.getCredentials();

			expect(creds?.clientId).toBe("my-client-id");
		});
	});

	describe("config directory", () => {
		it("should return the config directory", () => {
			expect(storage.getConfigDir()).toBe(tempDir);
		});

		it("should create config directory if it does not exist", () => {
			const newDir = path.join(tempDir, "subdir", ".gtcli");
			new AccountStorage(newDir);

			expect(fs.existsSync(newDir)).toBe(true);
		});
	});

	describe("error handling", () => {
		it("should handle invalid accounts.json gracefully", () => {
			fs.writeFileSync(path.join(tempDir, "accounts.json"), "invalid json");

			const newStorage = new AccountStorage(tempDir);
			const accounts = newStorage.getAllAccounts();

			expect(accounts).toHaveLength(0);
		});

		it("should handle invalid credentials.json gracefully", () => {
			fs.writeFileSync(path.join(tempDir, "credentials.json"), "invalid json");

			const newStorage = new AccountStorage(tempDir);
			const creds = newStorage.getCredentials();

			expect(creds).toBeNull();
		});

		it("should skip invalid accounts in accounts.json", () => {
			fs.writeFileSync(
				path.join(tempDir, "accounts.json"),
				JSON.stringify([
					{ email: "valid@example.com", oauth2: { clientId: "c", clientSecret: "s", refreshToken: "r" } },
					{ email: "invalid" }, // Missing oauth2
					{ invalid: true }, // Missing email
				]),
			);

			const newStorage = new AccountStorage(tempDir);
			const accounts = newStorage.getAllAccounts();

			expect(accounts).toHaveLength(1);
			expect(accounts[0].email).toBe("valid@example.com");
		});

		it("should handle credentials.json with missing fields", () => {
			fs.writeFileSync(path.join(tempDir, "credentials.json"), JSON.stringify({ clientId: "only-id" }));

			const newStorage = new AccountStorage(tempDir);
			const creds = newStorage.getCredentials();

			expect(creds).toBeNull();
		});
	});
});
