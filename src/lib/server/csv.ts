/**
 * Minimal RFC 4180 CSV serialization helpers.
 *
 * Kept generic (no domain knowledge) so the logic that has to be exactly right —
 * field escaping and line assembly — can be unit-tested in isolation.
 */

/** Escape a single field per RFC 4180: quote it when it contains `"`, `,`, CR or LF. */
export function escapeCsvField(value: string): string {
	if (/["\r\n,]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Serialize a header row plus data rows into an RFC 4180 CSV string.
 * Uses CRLF line endings (the standard) and terminates the final row with CRLF.
 */
export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
	const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','));
	return lines.join('\r\n') + '\r\n';
}
