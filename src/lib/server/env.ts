// The server's environment variables, declared in src/env.ts. Importing them
// through this one module keeps the `env.NAME` reads unchanged and gives the
// unit tests a single module to replace with process.env.
import * as env from '$app/env/private';

export { env };
