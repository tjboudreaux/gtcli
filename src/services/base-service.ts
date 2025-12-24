import { OAuth2Client } from "google-auth-library";
import { AccountStorage } from "../account-storage.js";
import type { Account } from "../types.js";

export abstract class BaseService {
	protected accountStorage: AccountStorage;
	protected clients: Map<string, OAuth2Client> = new Map();

	constructor(accountStorage?: AccountStorage) {
		this.accountStorage = accountStorage ?? new AccountStorage();
	}

	protected getOAuth2Client(email: string): OAuth2Client {
		if (!this.clients.has(email)) {
			const account = this.accountStorage.getAccount(email);
			if (!account) {
				throw new Error(`Account '${email}' not found`);
			}
			const client = this.createOAuth2Client(account);
			this.clients.set(email, client);
		}
		return this.clients.get(email)!;
	}

	protected createOAuth2Client(account: Account): OAuth2Client {
		const oauth2Client = new OAuth2Client(account.oauth2.clientId, account.oauth2.clientSecret, "http://localhost");

		oauth2Client.setCredentials({
			refresh_token: account.oauth2.refreshToken,
			access_token: account.oauth2.accessToken,
		});

		return oauth2Client;
	}

	clearClientCache(email?: string): void {
		if (email) {
			this.clients.delete(email);
		} else {
			this.clients.clear();
		}
	}

	getAccountStorage(): AccountStorage {
		return this.accountStorage;
	}
}
