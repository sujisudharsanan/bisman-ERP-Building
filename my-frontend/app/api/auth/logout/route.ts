// Minimal logout route handler
// Returns 204 No Content. Expand to clear cookies/session as needed.

export async function GET() {
	return new Response(null, {
		status: 204,
	})
}

export async function POST() {
	// For clients that POST to log out
	return new Response(null, {
		status: 204,
	})
}
