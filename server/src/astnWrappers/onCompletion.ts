import * as astn from "astn"
import { readFileFromFileSystem } from "./readFileFromFileSystem"
import { URI } from 'vscode-uri'
import { makeNativeHTTPrequest } from './makeNativeHTTPrequest'

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
		readFileFromFileSystem,
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
	).convertToNativePromise(() => "something went wrong").then(() => {
	})
}