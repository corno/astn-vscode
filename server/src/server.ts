/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as fs from "fs"
import * as path from "path"
import * as url from "url"

import {
	createConnection,
	TextDocuments,
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	Position,
} from 'vscode-languageserver';
import * as astn from "astn"

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

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

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true
			}
		}
	};
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
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	//cleanup diagnostics
	connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] })
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

function createDiagnostic(message: string, uri: string, severity: DiagnosticSeverity, start: Position, end: Position): Diagnostic {
	let diagnostic: Diagnostic = {
		severity: severity,
		range: {
			start: start,
			end: end,
		},
		message: message,
		source: 'astn'
	};
	if (hasDiagnosticRelatedInformationCapability) {
		diagnostic.relatedInformation = [
			{
				location: {
					uri: uri,
					range: Object.assign({}, diagnostic.range)
				},
				message: message
			},
		];
	}
	return diagnostic
}

async function validateDocument(
	textDocument: TextDocument,
	schema: null | astn.Schema,
) {
	//connection.console.log(`validation of ${textDocument.uri} with${schema === null ? "*out*" : ""} external schema`)
	let diagnostics: Diagnostic[] = [];
	astn.validateDocument(
		textDocument.getText(),
		new astn.DummyNodeBuilder(),
		schema,
		astn.resolveSchemaFromSite,
		(errorMessage, range) => {
			diagnostics.push(createDiagnostic(errorMessage, textDocument.uri, DiagnosticSeverity.Error, textDocument.positionAt(range.start.position), textDocument.positionAt(range.end.position)))
		},
		(warningMessage, range) => {
			diagnostics.push(createDiagnostic(warningMessage, textDocument.uri, DiagnosticSeverity.Warning, textDocument.positionAt(range.start.position), textDocument.positionAt(range.end.position)))
		},
	).then(() => {
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	})

}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	//let settings = await getDocumentSettings(textDocument.uri);

	const text = textDocument.getText();
	const textUri = new url.URL(textDocument.uri)
	if (textUri.protocol === "file:") {
		const rawFilePath = decodeURIComponent(textUri.pathname)
		const filePath = rawFilePath.startsWith("/")
			? rawFilePath.substr(1) //'localhost' not specified, strip leading slash
			: rawFilePath

		const dirname = path.dirname(filePath)
		fs.readFile(path.join(dirname, "schema.astn-schema"), { encoding: "utf-8" }, (err, serializedSchema) => {
			if (err) {

				if (err.code === "ENOENT") {
					//there is no schema file
					try {
						validateDocument(textDocument, null)
					} catch (e) {
						let diagnostics: Diagnostic[] = [];
						diagnostics.push(createDiagnostic(`uncaught astn exception: ${e.message}`, textDocument.uri, DiagnosticSeverity.Error, textDocument.positionAt(0), textDocument.positionAt(text.length)))
						connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
					}
				} else {
					//something else went wrong
					connection.sendDiagnostics({
						uri: textDocument.uri, diagnostics: [createDiagnostic(
							`error while retrieving schema: ${err.message}`,
							textDocument.uri,
							DiagnosticSeverity.Error,
							textDocument.positionAt(0),
							textDocument.positionAt(0),
						)]
					})
				}
			} else {

				astn.deserializeSchema(serializedSchema)
					.then(schema => {
						validateDocument(
							textDocument,
							schema
						)
					})
					.catch(message => {
						let diagnostics: Diagnostic[] = [];
						diagnostics.push(createDiagnostic(`error in schema: ${message}`, textDocument.uri, DiagnosticSeverity.Error, textDocument.positionAt(0), textDocument.positionAt(0)))
						connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: diagnostics });
					})
			}
		})
	}
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: '{ "FOO" }',
				kind: CompletionItemKind.Snippet,
				data: 1
			},
			{
				label: 'TypeScript_' + _textDocumentPosition.position.line + ":" + _textDocumentPosition.position.character,
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript_' + _textDocumentPosition.position.line + ":" + _textDocumentPosition.position.character,
				kind: CompletionItemKind.Text,
				data: 2
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
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
