
import * as fs from "fs"
import * as path from "path"
import * as p from "pareto"
import * as p20 from "pareto-20"
import * as astn from "astn"

export function readFileFromFileSystem(
	dir: string,
	schemaFileName: string,
): p.IUnsafeValue<p.IStream<string, null>, astn.FileError> {
	return p20.wrapUnsafeFunction((onError, onSuccess) => {
		fs.readFile(
			path.join(dir, schemaFileName),
			{ encoding: "utf-8" },
			(err, data) => {
				if (err === null) {
					onSuccess(p20.createArray([data]).streamify())
				} else {
					if (err.code === "ENOENT") {
						//there is no schema file
						onError(astn.FileError.FileNotFound)
					} else {
						onError(astn.FileError.UnknownError)
					}
				}
			}
		)
	})
}