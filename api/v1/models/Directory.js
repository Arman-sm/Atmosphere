const filesystem = require("fs/promises")
const pathLib = require("path")

class File {
	#path

	set path(path) { this.#path = pathLib.resolve(path) }
	get path() { return this.#path }

	constructor(path) {
		this.path = path
	}

	get name() {
		this.path.slice(this.path.lastIndexOf("/") + 1)
	}

	send(response) {
		return response.sendFile(this.path)
	}

	async delete() {
		await filesystem.rm(this.path)
	}
}

class Directory {
	path
	
	constructor(path) {
		this.path = path
	}
	file(name) {
		return new File(this.path + "/" + name)
	}
	// search by the basename
	async fuzzySearch(basename, resultLimit = 1) {
		let results = []
		for await (const file of await filesystem.opendir(this.path)) {
			if (file.name.slice(0, file.name.lastIndexOf(".")) === basename) {
				results.push(new File(this.path + "/" + file.name))
				
				if (results.length >= resultLimit)
					return results
			}
		}
		return []
	}
	// remove by the basename
	async fuzzyRemoval(basename) {
		for (file of await this.fuzzySearch(basename)) {
			await file.delete()
		}
	}

}

module.exports = { Directory, File }