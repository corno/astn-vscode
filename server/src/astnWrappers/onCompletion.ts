import * as astn from "astn"
import { readSchemaFileFromFileSystem } from "astn/dist/src/readSchemaFileFromFileSystem"
import { URI } from 'vscode-uri'
import { makeNativeHTTPrequest } from 'astn/dist/src/makeNativeHTTPrequest'

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
			astn.createSnippetFinder(
				completionPositionLine,
				completionPositionCharacter,
				snippet => {
					callback(snippet, "XXXXX")
				}
			)
		],
		schema => {
			return astn.createInMemoryDataset(schema)
		}
	).convertToNativePromise().then(() => {
	})
}