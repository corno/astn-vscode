import * as db5 from "db5"
import { readFileFromFileSystem } from "./readFileFromFileSystem"
import { URI } from 'vscode-uri'
import { resolveExternalSchema } from './resolveExternalSchema'

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

	return db5.deserializeTextIntoDataset(
		{
			filePath: filePath,
			getContextSchema: readFileFromFileSystem,
		},
		content,
		resolveExternalSchema,
		() => {
			//
		},
		[
			db5.createCodeCompletionFinder(
				completionPositionLine,
				completionPositionCharacter,
				snippet => {
					callback(snippet, "XXXXX")
				}
			)
		],
		schema => {
			return db5.createInMemoryDataset(schema)
		}
	).convertToNativePromise(() => "something went wrong").then(() => {
	})
}