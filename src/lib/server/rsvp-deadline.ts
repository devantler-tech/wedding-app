/**
 * RSVP deadline handling.
 *
 * The cutoff is configured via the optional `RSVP_DEADLINE` environment
 * variable (an ISO 8601 date string, e.g. `2027-01-01`). RSVP stays **open**
 * whenever the deadline is unset, empty, or unparseable, so a missing or
 * misconfigured value never silently locks guests out — closing is an explicit,
 * intentional act.
 */
export function isRsvpClosed(
	deadline: string | undefined | null,
	now: Date = new Date()
): boolean {
	if (!deadline) return false;
	const cutoff = new Date(deadline);
	if (Number.isNaN(cutoff.getTime())) return false;
	return now.getTime() > cutoff.getTime();
}
