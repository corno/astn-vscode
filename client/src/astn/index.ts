import * as astn from 'astn'

export * from "astn"

export function format(
	documentContent: string,
	replace: (range: astn.Range, newValue: string) => void,
	del: (range: astn.Range) => void,
	insert: (location: astn.Location, newValue: string) => void,
) {
	return new Promise(resolve => {
		const formatter = astn.createFormatter(
			replace,
			del,
			insert,
			resolve
		)
		const parser = new astn.Parser(
			() => {
				//ignore errors
			}
		)
		parser.ondata.subscribe(formatter)
		parser.onschemadata.subscribe(formatter)
		astn.tokenizeString(
			parser,
			() => {
				//ignore errors
			},
			documentContent
		)

	})
}