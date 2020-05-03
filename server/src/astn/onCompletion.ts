export function onCompletion(
	uri: string,
	line: number,
	character: number,
	callback: (
		label: string,
		data: string
	) => void
) {
	console.log("IMPLEMENT ME: onCompletion")
	callback("The first", "THEFIRST")
	callback("The second", "SECOND")
}