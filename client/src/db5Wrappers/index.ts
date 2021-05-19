import * as db5 from 'db5'
import * as p20 from 'pareto-20'
import * as p from "pareto"

export function format(
	documentContent: string,
	replace: (range: db5.Range, newValue: string) => void,
	del: (range: db5.Range) => void,
	insert: (location: db5.Location, newValue: string) => void,
) {
	const formatter = db5.createFormatter(
		"    ",
		replace,
		del,
		insert,
		() => {
			return p.value(null)
		}
	)
	const parserStack = db5.createParserStack(
		() => {
			return formatter
		},
		() => {
			return formatter
		}
	)
	return p20.createArray([documentContent]).streamify().tryToConsume(
		null,
		parserStack
	).convertToNativePromise(() => "something went wrong")
}