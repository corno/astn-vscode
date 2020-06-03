import * as astn from 'astn'
import * as p20 from 'pareto-20'
import * as p from "pareto"

export * from "astn"

export function format(
	documentContent: string,
	replace: (range: astn.Range, newValue: string) => void,
	del: (range: astn.Range) => void,
	insert: (location: astn.Location, newValue: string) => void,
) {
	const formatter = astn.createFormatter(
		replace,
		del,
		insert,
		() => {
			return p.result(null)
		}
	)
	const parser = astn.createParser(
		() => {
			//ignore errors
		},
		{
			onHeaderStart: () => {
				return formatter
			},
			onCompact: () => {

			},
			onHeaderEnd: () => {
				return formatter
			}
		}
	)
	return p20.createArray([documentContent]).streamify().toUnsafeValue(
		null,
		astn.createStreamTokenizer(
			parser,
			() => {
				//ignore errors
			},
		)
	).convertToNativePromise(() => "something went wrong")
}