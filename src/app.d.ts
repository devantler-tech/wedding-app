/// <reference types="@sveltejs/kit" />

declare namespace App {
	interface Locals {
		guestPair?: {
			id: number;
			code: string;
			name: string;
		};
		sessionId?: string;
	}
}
