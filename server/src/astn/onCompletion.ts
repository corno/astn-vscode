import * as astn from "astn"
import { readSchemaFileFromFileSystem } from "astn/dist/src/readSchemaFileFromFileSystem"
import { URI } from 'vscode-uri'
import { makeNativeHTTPrequest } from 'astn/dist/src/makeNativeHTTPrequest'
import { printRange } from 'astn'

export function onCompletion(
	uri: string,
	completionPositionLine: number,
	completionPositionCharacter: number,
	content: string,
	callback: (
		label: string,
		data: string
	) => void
): Promise<void> {
	console.log("Completion postion", completionPositionLine, completionPositionCharacter)
	let positionAlreadyFound = false
	let previousAfter: null | (() => string[]) = null
	//console.log("FINDING COMPLETIONS", line, character)
	function generate(gs: (() => string[]) | null) {
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

	return astn.loadDocument(
		content,
		filePath,
		makeNativeHTTPrequest,
		readSchemaFileFromFileSystem,
		() => {
			//
		},
		[
			new astn.SnippetGenerator((tokenRange, intra, after) => {
				//console.log("LOCATION", range.start.line, range.start.column, range.end.line, range.end.column)

				if (positionAlreadyFound) {
					return
				}
				if (completionPositionLine < tokenRange.start.line || (completionPositionLine === tokenRange.start.line && completionPositionCharacter < tokenRange.start.column)) {
					//console.log("AFTER", previousAfter)
					generate(previousAfter)
					positionAlreadyFound = true
					return
				}
				if (completionPositionLine < tokenRange.end.line || (completionPositionLine === tokenRange.end.line && completionPositionCharacter < tokenRange.end.column)) {
					//console.log("INTRA", intra)
					generate(intra)
					positionAlreadyFound = true
					return
				}
				previousAfter = after
			})
		],
		schema => {
			return astn.createInMemoryDataset(schema)
		}
	).convertToNativePromise().then(() => {
		if (!positionAlreadyFound) {
			generate(previousAfter)
		}
	})
}