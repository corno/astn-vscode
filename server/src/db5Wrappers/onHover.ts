import * as db5 from "db5"
import { readFileFromFileSystem } from "./readFileFromFileSystem"
import { URI } from 'vscode-uri'
import { resolveExternalSchema } from './resolveExternalSchema'

export function onHover(
	uri: string,
	positionLine: number,
	positionCharacter: number,
	content: string,
	callback: (
		hoverText: string
	) => void
): Promise<void> {
	console.log("Completion postion", positionLine, positionCharacter)

	const parsedURI = URI.parse(uri)

	const filePath = parsedURI.fsPath

	return db5.deserializeTextIntoDataset(
		{
			filePath: filePath,
			getContextSchema: readFileFromFileSystem
		},
		content,
		resolveExternalSchema,
		() => {
			//
		},
		[
			db5.createHoverTextFinder(
				positionLine,
				positionCharacter,
				hover => {
					callback(hover)
				}
			)
		],
		schema => {
			return db5.createInMemoryDataset(schema)
		}
	).convertToNativePromise(() => "something went wrong").then(() => {
	})
}