import * as astn from "astn"
import { URI } from 'vscode-uri'

export function onCompletion(
	uri: string,
	lineMinusOne: number,
	character: number,
	content: string,
	callback: (
		label: string,
		data: string
	) => void
): Promise<void> {
	let positionAlreadyFound = false
	let previousAfter: null | astn.GenerateSnippets = null
	const line = lineMinusOne + 1
	//console.log("FINDING COMPLETIONS", line, character)
	function generate(gs: astn.GenerateSnippets | null) {
		if (gs !== null) {
			const snippets = gs()
			//console.log(snippets)
			snippets.forEach(snippet => {
				//console.log("SNIPPET", snippet)
				callback(snippet, "XXXX")
			})
		}

	}

	const parsedURI = URI.parse(uri)

	const filePath = parsedURI.fsPath

	return astn.validateDocument(
		content,
		filePath,
		astn.readSchemaFileFromFileSystem,
		() => {
			//
		},
		new astn.SnippetGenerator((range, intra, after) => {
			//console.log("LOCATION", range.start.line, range.start.column, range.end.line, range.end.column)

			if (positionAlreadyFound) {
				return
			}
			if (line < range.start.line || (line === range.start.line && character < range.start.column)) {
				//console.log("AFTER", previousAfter)
				generate(previousAfter)
				positionAlreadyFound = true
				return
			}
			if (line < range.end.line || (line === range.end.line && character < range.end.column - 1)) {
				//console.log("INTRA", intra)
				generate(intra)
				positionAlreadyFound = true
				return
			}
			previousAfter = after
		})
	).convertToNativePromise().then(() => {
		if (!positionAlreadyFound) {
			generate(previousAfter)
		}
	})
}