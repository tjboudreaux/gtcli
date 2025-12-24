import * as http from "node:http";
import * as readline from "node:readline";
import { OAuth2Client } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/tasks"];

const REDIRECT_PORT = 3000;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

export interface OAuthFlowOptions {
	clientId: string;
	clientSecret: string;
	scopes?: string[];
	redirectPort?: number;
}

export interface OAuthResult {
	refreshToken: string;
	accessToken?: string;
}

export class OAuthFlow {
	private oauth2Client: OAuth2Client;
	private scopes: string[];
	private redirectPort: number;

	constructor(options: OAuthFlowOptions) {
		this.scopes = options.scopes ?? SCOPES;
		this.redirectPort = options.redirectPort ?? REDIRECT_PORT;
		const redirectUri = `http://localhost:${this.redirectPort}`;

		this.oauth2Client = new OAuth2Client(options.clientId, options.clientSecret, redirectUri);
	}

	getAuthUrl(): string {
		return this.oauth2Client.generateAuthUrl({
			access_type: "offline",
			scope: this.scopes,
			prompt: "consent",
		});
	}

	async exchangeCode(code: string): Promise<OAuthResult> {
		const { tokens } = await this.oauth2Client.getToken(code);

		if (!tokens.refresh_token) {
			throw new Error("No refresh token received. Try revoking app access and re-authorizing.");
		}

		return {
			refreshToken: tokens.refresh_token,
			accessToken: tokens.access_token ?? undefined,
		};
	}

	async authorize(manual = false): Promise<OAuthResult> {
		const authUrl = this.getAuthUrl();

		if (manual) {
			return this.authorizeManual(authUrl);
		}
		return this.authorizeBrowser(authUrl);
	}

	private async authorizeManual(authUrl: string): Promise<OAuthResult> {
		console.log("Open this URL in your browser:\n");
		console.log(authUrl);
		console.log("\nAfter authorization, paste the redirect URL here:");

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		return new Promise((resolve, reject) => {
			rl.question("Redirect URL: ", async (redirectUrl) => {
				rl.close();
				try {
					const code = this.extractCodeFromUrl(redirectUrl);
					const result = await this.exchangeCode(code);
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});
		});
	}

	private async authorizeBrowser(authUrl: string): Promise<OAuthResult> {
		console.log("Opening browser for authorization...");
		console.log(`If browser doesn't open, visit: ${authUrl}\n`);

		await this.openBrowser(authUrl);

		return new Promise((resolve, reject) => {
			const server = http.createServer(async (req, res) => {
				const url = new URL(req.url ?? "", REDIRECT_URI);
				const code = url.searchParams.get("code");
				const error = url.searchParams.get("error");

				if (error) {
					res.writeHead(400, { "Content-Type": "text/html" });
					res.end(`<html><body><h1>Authorization Failed</h1><p>${error}</p></body></html>`);
					server.close();
					reject(new Error(`Authorization failed: ${error}`));
					return;
				}

				if (code) {
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end("<html><body><h1>Authorization Successful</h1><p>You can close this window.</p></body></html>");
					server.close();

					try {
						const result = await this.exchangeCode(code);
						resolve(result);
					} catch (err) {
						reject(err);
					}
				} else {
					res.writeHead(400, { "Content-Type": "text/html" });
					res.end("<html><body><h1>Invalid Request</h1></body></html>");
				}
			});

			server.listen(this.redirectPort, () => {
				console.log(`Waiting for authorization on port ${this.redirectPort}...`);
			});

			server.on("error", (err) => {
				reject(new Error(`Failed to start local server: ${err.message}`));
			});

			setTimeout(
				() => {
					server.close();
					reject(new Error("Authorization timed out after 5 minutes"));
				},
				5 * 60 * 1000,
			);
		});
	}

	extractCodeFromUrl(url: string): string {
		try {
			const parsedUrl = new URL(url);
			const code = parsedUrl.searchParams.get("code");
			if (!code) {
				throw new Error("No authorization code found in URL");
			}
			return code;
		} catch {
			if (url.includes("code=")) {
				const match = url.match(/code=([^&]+)/);
				if (match) {
					return decodeURIComponent(match[1]);
				}
			}
			throw new Error("Invalid redirect URL");
		}
	}

	private async openBrowser(url: string): Promise<void> {
		const { exec } = await import("node:child_process");
		const platform = process.platform;

		let command: string;
		if (platform === "darwin") {
			command = `open "${url}"`;
		} else if (platform === "win32") {
			command = `start "" "${url}"`;
		} else {
			command = `xdg-open "${url}"`;
		}

		return new Promise((resolve) => {
			exec(command, (error) => {
				if (error) {
					console.log("Could not open browser automatically.");
				}
				resolve();
			});
		});
	}

	getOAuth2Client(): OAuth2Client {
		return this.oauth2Client;
	}

	static getDefaultScopes(): string[] {
		return [...SCOPES];
	}
}
