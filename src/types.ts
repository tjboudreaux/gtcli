export interface OAuth2Credentials {
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	accessToken?: string;
}

export interface Account {
	email: string;
	oauth2: OAuth2Credentials;
}

export interface StoredCredentials {
	clientId: string;
	clientSecret: string;
}

export interface TaskList {
	id: string;
	title: string;
	updated?: string;
	selfLink?: string;
}

export interface TaskListsResult {
	items: TaskList[];
	nextPageToken?: string;
}

export interface TaskLink {
	type?: string;
	description?: string;
	link?: string;
}

export interface Task {
	id: string;
	title: string;
	status: "needsAction" | "completed";
	due?: string;
	notes?: string;
	parent?: string;
	position?: string;
	completed?: string;
	deleted?: boolean;
	hidden?: boolean;
	links?: TaskLink[];
	selfLink?: string;
	updated?: string;
}

export interface TasksResult {
	items: Task[];
	nextPageToken?: string;
}

export interface TaskListOptions {
	maxResults?: number;
	pageToken?: string;
}

export interface TaskOptions {
	maxResults?: number;
	pageToken?: string;
	showCompleted?: boolean;
	showDeleted?: boolean;
	showHidden?: boolean;
	dueMin?: string;
	dueMax?: string;
	completedMin?: string;
	completedMax?: string;
	updatedMin?: string;
}

export interface CreateTaskOptions {
	title: string;
	notes?: string;
	due?: string;
	parent?: string;
	previous?: string;
}

export interface UpdateTaskOptions {
	title?: string;
	notes?: string;
	due?: string;
	status?: "needsAction" | "completed";
}

export interface MoveTaskOptions {
	parent?: string;
	previous?: string;
}

export type OutputFormat = "text" | "json" | "tsv";

export interface CliOptions {
	format?: OutputFormat;
	max?: number;
	page?: string;
}
