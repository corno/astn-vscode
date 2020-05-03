import * as astn from "astn"
import * as fs from "fs"
import * as path from "path"
import * as url from "url"

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

async function validateDocument2(
	documentText: string,
	dataset: null | astn.Dataset,
	diagnosticCallback: DiagnosticCallback,
	onDone: () => void,
) {

	const schemaReferenceResolver = astn.createFromURLSchemaDeserializer('www.astn.io', '/dev/schemas/', 7000)

	//connection.console.log(`validation of ${textDocument.uri} with${schema === null ? "*out*" : ""} external schema`)
	let diagnostics: Diagnostic[] = [];
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
		null,
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
	onDone: () => void
) {
	// diagnosticCallback({
	// 	severity: Severity.warning,
	// 	message: "IMPLMEMENT ME: diagnostic",
	// 	range: {
	// 		start: {
	// 			position: 0,
	// 			line: 0,
	// 			column: 0
	// 		},
	// 		end: {
	// 			position: 0,
	// 			line: 0,
	// 			column: 1

	// 		}
	// 	}
	// })
	const textUri = new url.URL(uri)
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
						validateDocument2(
							documentText,
							null,
							diagnosticCallback,
							onDone,
						)
					} catch (e) {
						diagnosticsFailed(
							`uncaught astn exception: ${e.message}`,
							documentText,
							diagnosticCallback,
							onDone
						)
					}
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
					validateDocument2(
						documentText,
						schema,
						diagnosticCallback,
						onDone,
					)
				})
					.catch(message => {
						diagnosticsFailed(
							`error in schema: ${message}`,
							documentText,
							diagnosticCallback,
							onDone
						)
					})
			}
		})
	}
}