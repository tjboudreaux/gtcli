import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AccountStorage } from "../account-storage.js";
import { BaseService } from "./base-service.js";

class TestService extends BaseService {
	public testGetOAuth2Client(email: string) {
		return this.getOAuth2Client(email);
	}
}

describe("BaseService", () => {
	let tempDir: string;
	let storage: AccountStorage;
	let service: TestService;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gtcli-test-"));
		storage = new AccountStorage(tempDir);
		storage.addAccount({
			email: "test@example.com",
			oauth2: {
				clientId: "test-client-id",
				clientSecret: "test-client-secret",
				refreshToken: "test-refresh-token",
				accessToken: "test-access-token",
			},
		});
		service = new TestService(storage);
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("getOAuth2Client", () => {
		it("should create and return an OAuth2Client for a valid account", () => {
			const client = service.testGetOAuth2Client("test@example.com");

			expect(client).toBeDefined();
			expect(client.credentials.refresh_token).toBe("test-refresh-token");
			expect(client.credentials.access_token).toBe("test-access-token");
		});

		it("should throw error for non-existent account", () => {
			expect(() => service.testGetOAuth2Client("unknown@example.com")).toThrow(
				"Account 'unknown@example.com' not found",
			);
		});

		it("should cache OAuth2Client instances", () => {
			const client1 = service.testGetOAuth2Client("test@example.com");
			const client2 = service.testGetOAuth2Client("test@example.com");

			expect(client1).toBe(client2);
		});
	});

	describe("clearClientCache", () => {
		it("should clear cache for specific email", () => {
			const client1 = service.testGetOAuth2Client("test@example.com");
			service.clearClientCache("test@example.com");
			const client2 = service.testGetOAuth2Client("test@example.com");

			expect(client1).not.toBe(client2);
		});

		it("should clear all caches when no email specified", () => {
			const client1 = service.testGetOAuth2Client("test@example.com");
			service.clearClientCache();
			const client2 = service.testGetOAuth2Client("test@example.com");

			expect(client1).not.toBe(client2);
		});
	});

	describe("getAccountStorage", () => {
		it("should return the account storage instance", () => {
			expect(service.getAccountStorage()).toBe(storage);
		});
	});

	describe("default AccountStorage", () => {
		it("should create default AccountStorage when none provided", () => {
			const defaultService = new TestService();
			expect(defaultService.getAccountStorage()).toBeInstanceOf(AccountStorage);
		});
	});
});
