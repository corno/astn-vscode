type CompletionDetails = {
	detail: string
	documentation: string
}

export function onCompletionResolve(_data: string): CompletionDetails {
	return {
		detail: "",
		documentation: "",
	}
}