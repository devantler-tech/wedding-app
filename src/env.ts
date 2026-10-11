import { defineEnvVars } from '@sveltejs/kit/env';

// Every variable here is optional: the app decides what a missing value means
// (hooks.server.ts refuses to start in production without ADMIN_CODE, and
// DATABASE_URL is absent in the auth-skipping development mode). SvelteKit
// treats a variable without a schema as required, so each one passes its value
// through unchanged instead.
const optional = (value: string | undefined) => value;

export const variables = defineEnvVars({
	ADMIN_CODE: {
		schema: optional,
		description: 'The code that opens the admin pages. Required in production.'
	},
	DATABASE_URL: {
		schema: optional,
		description: 'PostgreSQL connection string. Migrations and seeding run when it is set.'
	},
	DEV_SKIP_AUTH: {
		schema: optional,
		description: "Set to 'true' to skip authentication and serve mock data in development."
	},
	NODE_ENV: {
		schema: optional,
		description: "'production' turns on secure cookies and the ADMIN_CODE requirement."
	},
	RSVP_DEADLINE: {
		schema: optional,
		description: 'The moment RSVPs close. Unset means RSVPs stay open.'
	}
});
