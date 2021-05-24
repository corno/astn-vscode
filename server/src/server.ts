/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentSyncKind,
	InitializeResult,
	Range,
	Hover,
} from 'vscode-languageserver';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import * as db5wrappers from './db5Wrappers'
import { readFileFromFileSystem } from "./db5Wrappers/readFileFromFileSystem"

import { URI } from "vscode-uri"
import { resolveExternalSchema } from './db5Wrappers/resolveExternalSchema';
import { printLoadDocumentDiagnostic } from './db5Wrappers';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			hoverProvider: true,
			textDocumentSync: TextDocumentSyncKind.Full,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true,
				triggerCharacters: [".", "(", "<", ",", "{", "[", "\"", "'", ":"]
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'ASTNServer'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document)
});

function assertUnreachable<RT>(_x: never): RT {
	throw new Error("unreachable")
}

function getRange(astnDiagnostic: db5wrappers.LoadDocumentDiagnostic): db5wrappers.Range | null {
	switch (astnDiagnostic.type[0]) {
		case "deserialization": {
			const $ = astnDiagnostic.type[1]
			return $.range
		}
		case "schema retrieval": {
			return null
		}
		case "structure": {
			return null
		}
		case "validation": {
			const $ = astnDiagnostic.type[1]
			return $.range
		}
		default:
			return assertUnreachable(astnDiagnostic.type[0])
	}
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	let text = textDocument.getText();

	let diagnostics: Diagnostic[] = [];

	const uri = URI.parse(textDocument.uri)


	db5wrappers.deserializeTextIntoDataset(
		{
			filePath: uri.fsPath,
			getContextSchema: readFileFromFileSystem
		},
		text,
		resolveExternalSchema,
		astnDiagnostic => {

			const tempRange = getRange(astnDiagnostic)
			const range: Range = tempRange === null
				? {
					start: textDocument.positionAt(0),
					end: astnDiagnostic.severity === db5wrappers.DiagnosticSeverity.warning
						? textDocument.positionAt(0) //don't pollute the whole view for just a warning
						: textDocument.positionAt(text.length - 1)
				}
				: {
					start: textDocument.positionAt(tempRange.start.position),
					end: textDocument.positionAt(db5wrappers.getEndLocationFromRange(tempRange).position),
				}

			let diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				range: range,
				message: printLoadDocumentDiagnostic(astnDiagnostic),
				source: 'astn'
			};
			if (hasDiagnosticRelatedInformationCapability) {
				diagnostic.relatedInformation = [
					{
						location: {
							uri: textDocument.uri,
							range: range
						},
						message: printLoadDocumentDiagnostic(astnDiagnostic)
					},
				];
			}
			diagnostics.push(diagnostic);
		},
		[],
		schema => {
			return db5wrappers.createInMemoryDataset(schema)
		}
	).convertToNativePromise(() => {
		return "something went wrong"
	}).then(() => {
		connection.sendDiagnostics({
			uri: textDocument.uri,
			diagnostics: diagnostics,
		})
	}).catch(() => {
		connection.sendDiagnostics({
			uri: textDocument.uri,
			diagnostics: diagnostics,
		})
	})

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(textDocumentPosition, cancellationToken, workDoneProgress, resultProgress) => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested.

		const completionItems: CompletionItem[] = []
		const doc = documents.get(textDocumentPosition.textDocument.uri)
		if (doc === undefined) {
			return []
		}
		return db5wrappers.onCompletion(
			textDocumentPosition.textDocument.uri,
			textDocumentPosition.position.line + 1, //astn's line numbering is 1 based, vscode's is 0 based
			textDocumentPosition.position.character + 1, //astn's character numbering is 1 based, vscode's is 0 based
			doc.getText(),
			(label, data) => {
				completionItems.push({
					label: label,
					kind: CompletionItemKind.Text, //FIXME
					data: data,
				})
			},
		).then(() => {
			return completionItems
		})
	}
);

// This handler provides the initial list of the completion items.
connection.onHover(
	(hoverParams, cancellationToken, workdoneProgress, resultProgress) => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested.

		const hoverTexts: string[] = []
		const doc = documents.get(hoverParams.textDocument.uri)
		if (doc === undefined) {
			return null
		}
		return db5wrappers.onHover(
			hoverParams.textDocument.uri,
			hoverParams.position.line + 1, //astn's line numbering is 1 based, vscode's is 0 based
			hoverParams.position.character + 1, //astn's character numbering is 1 based, vscode's is 0 based
			doc.getText(),
			hoverText => {
				hoverTexts.push(hoverText)
			},
		).then(() => {
			const hv: Hover = {
				contents: hoverTexts
			}
			return hv
		})
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		const details = db5wrappers.onCompletionResolve(item.data)
		item.detail = details.detail
		item.documentation = details.documentation
		return item;
	}
);

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.textDocument.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.textDocument.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
