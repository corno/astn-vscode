/**
 * This file is intended to not have any vscode imports
 */


export type DiagnosticSeverity =
| ["error", null]
| ["warning", null]
| ["information", null]
| ["hint", null]


export type Diagnostic = {
	severity: DiagnosticSeverity
	message: string
	range: {
		start: number
		length: number
	}
}

export type DocumentData = {

	uri: string
	content: string
}

export type ValidateTextDocument = (
	$: DocumentData,
	cb: ($: {
		diagnostics: Diagnostic[]
	}) => void
) => void


export type OnHover = (
	$: {
		document: DocumentData
		offset: number
	},
	cb: ($: {
		hovertexts: string[]
	}) => void
) => void



export type GetCompletionTriggerCharacters = () => null | string[] 

export type OnCompletion = (
	$: {
		document: DocumentData
		offset: number
	},
	cb: ($: {
		completionItems: {
			label: string
		}[]
	}) => void
) => void

export type Backend = {
	'validateTextDocument': ValidateTextDocument
	'completion': {
		'getTriggerCharacters': GetCompletionTriggerCharacters
		'onCompletion': OnCompletion
	}
	'onHover': OnHover
}