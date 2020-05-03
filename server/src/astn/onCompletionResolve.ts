type CompletionDetails = {
	detail: string,
	documentation: string
}

export function onCompletionResolve(data: string): CompletionDetails {
	console.log("IMPLEMENT ME: onCompletionResolve")
	return {
		detail: "IMPLEMENT ME: completionResolve detail",
		documentation: "IMPLEMENT ME: completionResolve documentation",
	}
}