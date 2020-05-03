import * as astn from "astn"
import * as fs from "fs"
import * as path from "path"
import { SideEffectsAPI } from 'astn'
import { URI } from 'vscode-uri'

enum Severity {
	warning,
	error
}

type Diagnostic = {
	severity: Severity,
	message: string,
	beginPosition: number,
	endPosition: number
}

type DiagnosticCallback = (diagnostic: Diagnostic) => void

async function validateDocumentAfterExternalSchemaResolution(
	documentText: string,
	dataset: null | astn.Dataset,
	diagnosticCallback: DiagnosticCallback,
	sideEffects: astn.SideEffectsAPI | null,
	onDone: () => void,
) {

	const schemaReferenceResolver = astn.createFromURLSchemaDeserializer('www.astn.io', '/dev/schemas/', 7000)

	astn.deserializeDataset(
		documentText,
		dataset,
		schemaReferenceResolver,
		(errorMessage, range) => {
			addDiagnostic(
				diagnosticCallback,
				errorMessage,
				Severity.error,
				range.start.position,
				range.end.position
			)
		},
		(warningMessage, range) => {
			addDiagnostic(diagnosticCallback, warningMessage, Severity.warning, range.start.position, range.end.position)
		},
		sideEffects,
	).then(() => {
		onDone()
	}).catch(message => {
		console.log(`validation failed: ${message}, this should have been reported as a diagnostic, if not, that's a problem`)
		onDone()
	})

}

function addDiagnostic(
	callback: DiagnosticCallback,
	message: string,
	severity: Severity,
	beginPosition: number,
	endPosition: number,
) {
	callback({
		severity: severity,
		message: message,
		beginPosition: beginPosition,
		endPosition: endPosition,
	})
}

function diagnosticsFailed(
	message: string,
	documentText: string,
	diagnosticCallback: DiagnosticCallback,
	onDone: () => void
) {
	addDiagnostic(
		diagnosticCallback,
		message,
		Severity.error,
		0,
		documentText.length
	)
	onDone()
}

export function validateDocument(
	uri: string,
	documentText: string,
	diagnosticCallback: DiagnosticCallback,
	sideEffects: SideEffectsAPI | null,
	onDone: () => void
) {

	let parsedURI = URI.parse(uri)

	const filePath = parsedURI.fsPath
	if (filePath !== undefined) { //FIXME filePath cannot be undefined according to API, but what if the uri is not file://...
		const dirname = path.dirname(filePath)
		fs.readFile(path.join(dirname, "schema.astn-schema"), { encoding: "utf-8" }, (err, serializedSchema) => {
			if (err) {

				if (err.code === "ENOENT") {
					//there is no schema file
					validateDocumentAfterExternalSchemaResolution(
						documentText,
						null,
						diagnosticCallback,
						sideEffects,
						onDone,
					)
				} else {
					//something else went wrong
					diagnosticsFailed(
						`error while retrieving schema: ${err.message}`,
						documentText,
						diagnosticCallback,
						onDone
					)
				}
			} else {
				astn.deserializeSchemaFromString(
					serializedSchema,
					(message, range) => {
						throw new Error("HEEEEELP")
					}
				).then(schema => {
					validateDocumentAfterExternalSchemaResolution(
						documentText,
						schema,
						diagnosticCallback,
						sideEffects,
						onDone,
					)
				}).catch(message => {
					diagnosticsFailed(
						`error in schema: ${message}`,
						documentText,
						diagnosticCallback,
						onDone
					)
				})
			}
		})
	} else {
		//not a file, cannot resolve external schema
		validateDocumentAfterExternalSchemaResolution(
			documentText,
			null,
			diagnosticCallback,
			sideEffects,
			onDone,
		)
	}
}