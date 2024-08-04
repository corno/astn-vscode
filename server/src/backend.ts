import * as api from "./backendapi"

export const $: api.Backend = {
	'completion': {
		'getTriggerCharacters': () => null,
		'onCompletion': (
			$,
			cb
		) => {
			cb({
				'completionItems': [
					{
						'label': "Textpad",
					},
					{
						'label': "Javascript",
					},
					{
						'label': "Foobar",
					},
				]
			})
		},
	},
	'onHover': (
		$,
		cb
	) => {
		cb({
			'hovertexts': ["ABCDEF", "XXXX"]
		})
	},
	'validateTextDocument': (
		$,
		cb
	) => {
	
		const pattern = /\b[A-Z]{2,}\b/g;
		let m: RegExpExecArray | null;
	
		let problems = 0;
		const diagnostics: api.Diagnostic[] = [];
		while ((m = pattern.exec($.content)) && problems < 100) {
			problems++;
			const diagnostic: api.Diagnostic = {
				severity: ["warning", null],
				range: {
					start: m.index,
					length: m[0].length,
				},
				message: `really??, ${m[0]} is all uppercase.`,
				//source: 'ex'
			};
			// if (hasDiagnosticRelatedInformationCapability) {
			// 	diagnostic.relatedInformation = [
			// 		{
			// 			location: {
			// 				uri: textDocument.uri,
			// 				range: Object.assign({}, diagnostic.range)
			// 			},
			// 			message: 'Spelling matters'
			// 		},
			// 		{
			// 			location: {
			// 				uri: textDocument.uri,
			// 				range: Object.assign({}, diagnostic.range)
			// 			},
			// 			message: 'Particularly for names'
			// 		}
			// 	];
			// }
			diagnostics.push(diagnostic);
		}
	
		// Send the computed diagnostics to VSCode.
		cb({ diagnostics: diagnostics });
	}
	
}