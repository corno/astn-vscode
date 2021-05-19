/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext, } from 'vscode';
import * as vscode from "vscode"
import * as astn from "astn"
import {
	format
} from "./db5Wrappers"

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

let client: LanguageClient;

function convertLocation(document: vscode.TextDocument, location: astn.Location) {
	return document.positionAt(location.position)
}

function convertRange(document: vscode.TextDocument, range: astn.Range) {
	return new vscode.Range(convertLocation(document, range.start), convertLocation(document, astn.getEndLocationFromRange(range)))
}

// formatter implemented using API
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
});

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'astn' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'ASTN',
		'ASTN Server',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
