/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import * as fs from "fs"

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

import * as vscode from 'vscode'

let client: LanguageClient;

namespace ata {
	export type Range = {
		start: Location
	}

	export type Location = {
		position: number
	}
}

namespace atl {
	export function init() {

	}
}


export function format(
	_documentContent: string,
	_replace: (range: ata.Range, newValue: string) => void,
	_del: (range: ata.Range) => void,
	_insert: (location: ata.Location, newValue: string) => void,
) {
	// const formatter = astn.createFormatter(
	// 	"    ",
	// 	replace,
	// 	del,
	// 	insert,
	// 	() => {
	// 		return p.value(null)
	// 	}
	// )
	// const parserStack = astn.createParserStack(
	// 	() => {
	// 		return formatter
	// 	},
	// 	() => {
	// 		return formatter
	// 	}
	// )
	// return p20.createArray([documentContent]).streamify().tryToConsume(
	// 	null,
	// 	parserStack
	// ).convertToNativePromise(() => "something went wrong")
	return new Promise(x => {
		x(null)
	})
}


function convertLocation(document: vscode.TextDocument, location: ata.Location) {
	return document.positionAt(location.position)
}

function convertRange(document: vscode.TextDocument, range: ata.Range) {

	//return new vscode.Range(convertLocation(document, range.start), convertLocation(document, atl.init().getEndLocationFromRange(range)))
	return new vscode.Range(convertLocation(document, range.start), convertLocation(document, range.start))
}


export function activate(context: ExtensionContext) {



	{
		const disposable = vscode.commands.registerCommand('astn.saveAsJSON', () => {
			vscode.window.showInformationMessage('Save as JSON!');

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showInformationMessage('Open an ASTN file first to convert to JSON');
				return;
			}

			const document = editor.document;
			const text = document.getText();

			const activeUri = vscode.window.activeTextEditor.document.uri;

			vscode.window.showSaveDialog({}).then(fileInfos => {
				fs.writeFileSync(fileInfos.path, text)
			});

		});

		context.subscriptions.push(disposable);
	}
	{
		const disposable = vscode.commands.registerCommand('astn.convertToJSON', () => {
			vscode.window.showInformationMessage('Convert to JSON!');

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showInformationMessage('Open an ASTN file first to save as JSON');
				return;
			}

			const document = editor.document;
			const text = document.getText();

			editor.edit(($) => {
				$.replace(new vscode.Position(0, 2), "FSDFSDFSFSDF")
			})

		});

		context.subscriptions.push(disposable);
	}


	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'astn' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);


	vscode.languages.registerDocumentFormattingEditProvider('astn', {

		provideDocumentFormattingEdits(document: vscode.TextDocument) {
			const edits: vscode.TextEdit[] = []
			return format(
				document.getText(),
				(range, newValue) => {
					edits.push(vscode.TextEdit.replace(
						convertRange(document, range),
						newValue
					))
				},
				range => {
					edits.push(vscode.TextEdit.delete(
						convertRange(document, range)
					))
				},
				(location, newValue) => {
					edits.push(vscode.TextEdit.insert(
						convertLocation(document, location),
						newValue
					))
				}
			).then(() => {
				return edits
			})
		}
	})


	// Start the client. This will also launch the server
	client.start();


}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
