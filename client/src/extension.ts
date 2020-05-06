/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext, } from 'vscode';
import * as vscode from "vscode"

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';
import * as astn from './astn';

let client: LanguageClient;

function convertLocation(location: astn.Location) {
	return new vscode.Position(location.line -1, location.column -1)
}

function convertRange(range: astn.Range) {
	return new vscode.Range(convertLocation(range.start), convertLocation(range.end))
}

// formatter implemented using API
vscode.languages.registerDocumentFormattingEditProvider('astn', {
	provideDocumentFormattingEdits(document: vscode.TextDocument) {
		const edits: vscode.TextEdit[] = []
		return astn.format(
			document.getText(),
			(range, newValue) => {
				edits.push(vscode.TextEdit.replace(
					convertRange(range),
					newValue
				))
			},
			range => {
				edits.push(vscode.TextEdit.delete(
					convertRange(range)
				))
			},
			(location, newValue) => {
				edits.push(vscode.TextEdit.insert(
					convertLocation(location),
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
