import * as astn from 'astn'
import * as p20 from 'pareto-20'
import * as p from "pareto"

export function format(
	_documentContent: string,
	_replace: (range: astn.Range, newValue: string) => void,
	_del: (range: astn.Range) => void,
	_insert: (location: astn.Location, newValue: string) => void,
) {
	// const formatter = astn.createFormatter(
	// 	"    ",
	// 	replace,
	// 	del,
	// 	insert,
	// 	() => {
	// 		return p.value(null)
	// 	}
	// )
	// const parserStack = astn.createParserStack(
	// 	() => {
	// 		return formatter
	// 	},
	// 	() => {
	// 		return formatter
	// 	}
	// )
	// return p20.createArray([documentContent]).streamify().tryToConsume(
	// 	null,
	// 	parserStack
	// ).convertToNativePromise(() => "something went wrong")
	return new Promise(x => {
		x(null)
	})
}