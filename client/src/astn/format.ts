import * as bc from "bass-clarinet"

export function format(
	_documentContent: string,
	replace: (
		range: bc.Range,
		newValue: string,
	) => void,
	del: (
		range: bc.Range,
	) => void,
	insert: (
		location: bc.Location,
		newValue: string,
	) => void,
) {
	return new Promise<void>(resolve => {
		replace(
			{
				start: {
					position: 0,
					line: 1,
					column: 1,
				},
				end: {
					position: 0,
					line: 1,
					column: 1,
				}
			},
			"line1col1",
		)
		del(
			{
				start: {
					position: 0,
					line: 2,
					column: 2,
				},
				end: {
					position: 0,
					line: 2,
					column: 7,
				}
			},
		)
		insert(
			{
				position: 0,
				line: 3,
				column: 5,
			},
			"line3col5",
		)
		resolve()
	})
}