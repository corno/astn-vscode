
import * as fs from "fs"
import * as path from "path"
import * as p from "pareto"
import * as p20 from "pareto-20"
import * as db5 from "db5"

export function readFileFromFileSystem(
	dir: string,
	schemaFileName: string,
): p.IUnsafeValue<p.IStream<string, null>, db5.FileError> {
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
						onError(db5.FileError.FileNotFound)
					} else {
						onError(db5.FileError.UnknownError)
					}
				}
			}
		)
	})
}