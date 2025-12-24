import { describe, expect, it, vi } from "vitest";
import { OAuthFlow } from "./oauth-flow.js";

describe("OAuthFlow", () => {
	const defaultOptions = {
		clientId: "test-client-id",
		clientSecret: "test-client-secret",
	};

	describe("constructor", () => {
		it("should create an OAuthFlow with default options", () => {
			const flow = new OAuthFlow(defaultOptions);

			expect(flow.getOAuth2Client()).toBeDefined();
		});

		it("should accept custom scopes", () => {
			const customScopes = ["https://www.googleapis.com/auth/tasks.readonly"];
			const flow = new OAuthFlow({ ...defaultOptions, scopes: customScopes });

			expect(flow.getAuthUrl()).toContain("tasks.readonly");
		});
	});

	describe("getAuthUrl", () => {
		it("should generate an authorization URL", () => {
			const flow = new OAuthFlow(defaultOptions);
			const url = flow.getAuthUrl();

			expect(url).toContain("accounts.google.com");
			expect(url).toContain("client_id=test-client-id");
			expect(url).toContain("scope=");
			expect(url).toContain("access_type=offline");
		});

		it("should include tasks scope by default", () => {
			const flow = new OAuthFlow(defaultOptions);
			const url = flow.getAuthUrl();

			expect(url).toContain("tasks");
		});
	});

	describe("extractCodeFromUrl", () => {
		it("should extract code from valid URL", () => {
			const flow = new OAuthFlow(defaultOptions);
			const url = "http://localhost:3000?code=auth_code_123&scope=tasks";

			const code = flow.extractCodeFromUrl(url);

			expect(code).toBe("auth_code_123");
		});

		it("should extract code from URL with encoded characters", () => {
			const flow = new OAuthFlow(defaultOptions);
			const url = "http://localhost:3000?code=auth%2Fcode%2F123";

			const code = flow.extractCodeFromUrl(url);

			expect(code).toBe("auth/code/123");
		});

		it("should throw error for URL without code", () => {
			const flow = new OAuthFlow(defaultOptions);
			const url = "http://localhost:3000?error=access_denied";

			expect(() => flow.extractCodeFromUrl(url)).toThrow();
		});

		it("should handle malformed URL with code parameter", () => {
			const flow = new OAuthFlow(defaultOptions);
			const url = "not-a-url?code=fallback_code";

			const code = flow.extractCodeFromUrl(url);

			expect(code).toBe("fallback_code");
		});

		it("should throw error for completely invalid input", () => {
			const flow = new OAuthFlow(defaultOptions);

			expect(() => flow.extractCodeFromUrl("no-code-here")).toThrow("Invalid redirect URL");
		});
	});

	describe("getDefaultScopes", () => {
		it("should return default scopes", () => {
			const scopes = OAuthFlow.getDefaultScopes();

			expect(scopes).toContain("https://www.googleapis.com/auth/tasks");
		});

		it("should return a copy of scopes", () => {
			const scopes1 = OAuthFlow.getDefaultScopes();
			const scopes2 = OAuthFlow.getDefaultScopes();

			scopes1.push("modified");

			expect(scopes2).not.toContain("modified");
		});
	});

	describe("exchangeCode", () => {
		it("should throw error when no refresh token received", async () => {
			const flow = new OAuthFlow(defaultOptions);

			// Mock the getToken to return no refresh token
			const mockClient = flow.getOAuth2Client();
			vi.spyOn(mockClient, "getToken").mockResolvedValue({
				tokens: { access_token: "access", refresh_token: undefined },
				res: null,
			});

			await expect(flow.exchangeCode("test-code")).rejects.toThrow(
				"No refresh token received. Try revoking app access and re-authorizing.",
			);
		});

		it("should return tokens when refresh token is present", async () => {
			const flow = new OAuthFlow(defaultOptions);

			const mockClient = flow.getOAuth2Client();
			vi.spyOn(mockClient, "getToken").mockResolvedValue({
				tokens: { access_token: "access-token", refresh_token: "refresh-token" },
				res: null,
			});

			const result = await flow.exchangeCode("test-code");

			expect(result.refreshToken).toBe("refresh-token");
			expect(result.accessToken).toBe("access-token");
		});
	});
});
