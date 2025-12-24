import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Account, StoredCredentials } from "./types.js";

export class AccountStorage {
	private accounts: Map<string, Account> = new Map();
	private configDir: string;
	private accountsFile: string;
	private credentialsFile: string;

	constructor(configDir?: string) {
		this.configDir = configDir ?? path.join(os.homedir(), ".gtcli");
		this.accountsFile = path.join(this.configDir, "accounts.json");
		this.credentialsFile = path.join(this.configDir, "credentials.json");
		this.ensureConfigDir();
		this.loadAccounts();
	}

	private ensureConfigDir(): void {
		if (!fs.existsSync(this.configDir)) {
			fs.mkdirSync(this.configDir, { recursive: true });
		}
	}

	private loadAccounts(): void {
		if (fs.existsSync(this.accountsFile)) {
			try {
				const data = JSON.parse(fs.readFileSync(this.accountsFile, "utf8"));
				if (Array.isArray(data)) {
					for (const account of data) {
						if (this.isValidAccount(account)) {
							this.accounts.set(account.email, account);
						}
					}
				}
			} catch {
				// Ignore invalid JSON
			}
		}
	}

	private isValidAccount(account: unknown): account is Account {
		if (typeof account !== "object" || account === null) return false;
		const acc = account as Record<string, unknown>;
		if (typeof acc.email !== "string") return false;
		if (typeof acc.oauth2 !== "object" || acc.oauth2 === null) return false;
		const oauth2 = acc.oauth2 as Record<string, unknown>;
		return (
			typeof oauth2.clientId === "string" &&
			typeof oauth2.clientSecret === "string" &&
			typeof oauth2.refreshToken === "string"
		);
	}

	private saveAccounts(): void {
		fs.writeFileSync(this.accountsFile, JSON.stringify(Array.from(this.accounts.values()), null, 2));
	}

	addAccount(account: Account): void {
		this.accounts.set(account.email, account);
		this.saveAccounts();
	}

	getAccount(email: string): Account | undefined {
		return this.accounts.get(email);
	}

	getAllAccounts(): Account[] {
		return Array.from(this.accounts.values());
	}

	deleteAccount(email: string): boolean {
		const deleted = this.accounts.delete(email);
		if (deleted) {
			this.saveAccounts();
		}
		return deleted;
	}

	hasAccount(email: string): boolean {
		return this.accounts.has(email);
	}

	setCredentials(clientId: string, clientSecret: string): void {
		fs.writeFileSync(this.credentialsFile, JSON.stringify({ clientId, clientSecret }, null, 2));
	}

	getCredentials(): StoredCredentials | null {
		if (!fs.existsSync(this.credentialsFile)) {
			return null;
		}
		try {
			const data = JSON.parse(fs.readFileSync(this.credentialsFile, "utf8"));
			if (typeof data.clientId === "string" && typeof data.clientSecret === "string") {
				return data as StoredCredentials;
			}
			return null;
		} catch {
			return null;
		}
	}

	getConfigDir(): string {
		return this.configDir;
	}
}
