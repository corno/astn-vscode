import * as db5 from 'db5';
import { makeNativeHTTPrequest } from './makeNativeHTTPrequest';

const schemaHost: db5.SchemaHost = {
	host: "astn.io",
	pathStart: "/dev/schemas"
}

const timeout = 3000

export const resolveExternalSchema: db5.ResolveExternalSchema = schemaID => {
	return makeNativeHTTPrequest(
		schemaHost,
		schemaID,
		timeout
	)
}