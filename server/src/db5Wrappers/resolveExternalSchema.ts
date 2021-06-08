import * as db5 from 'db5';
import * as p from "pareto"
import { makeNativeHTTPrequest } from './makeNativeHTTPrequest';


const timeout = 3000

type ResolveExternalSchema = (id: string) => p.IUnsafeValue<p.IStream<string, null>, db5.RetrievalError>

export const resolveExternalSchema: db5.ResolveExternalSchema = schemaID => {
	return makeNativeHTTPrequest(
		{
			host: "astn.io",
			pathStart: "/dev/schemas"
		},
		schemaID,
		timeout
	)
}