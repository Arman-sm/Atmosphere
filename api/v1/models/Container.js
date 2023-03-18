const { Directory, File } = require("./Directory")

class Container {
	static DB_COLUMNS = ["ID", "Owner_ID", "Container_ID", "Title"]
	
	ID
	ownerID

	#title
	#containerID

	static coversDirectory = new Directory("./data/container/covers")

	async updateMetadata() {
		const [result] = (await this.database.query("SELECT * FROM Containers WHERE ID = ?;", [this.ID]))[0]

		if (!result) 
			throw "Container Not Found"

		this.ownerID = result.Owner_ID

		this.#title = result.Title
		this.#containerID = result.Container_ID	
	}

	#changeMetadata(key, value) {
		this.database.query(
			`UPDATE Containers SET ${key} = ? WHERE ID = ?;`, [value, this.ID]
		)
	}

	get title() { return this.#title }
	set title(value) { this.#changeMetadata("Title", value) }

	get containerID() { return this.#containerID }
	set containerID(value) { this.#changeMetadata("Container_ID", value) }
	
	async cover() {
		return (await Container.coversDirectory.fuzzySearch(this.ID))[0]
	}
	
	async delete() {
		(await this.cover())?.delete()
		
		this.database.query("DELETE FROM Container WHERE ID = ?", [this.ID])
	}

	constructor (containerID, database, metadataUpdateStat) {
		if (!metadataUpdateStat)
			throw "Make a new instance via the 'new' method"

		this.ID = containerID
		this.database = database

		return this
	}

	static async new(containerID, database) {
		const container = new Container(containerID, database, true)
		await container.updateMetadata()
		return container
	}

	static async register(containerID, ownerID, database) {
		await database.query(`INSERT INTO Containers(ID, Owner_ID) VALUES (?, ?)`, [containerID, ownerID])

		return await Container.new(containerID, database)
	}

	static async attachToRequest(req, res, database, next) {
		try {
			req.container = await Container.new(req.params.containerID, database)
			next()
		} catch (err) {
			req.status(404).end(err)
		}
	}
	
	static async attachToRequestWithVerifiedOwnership(req, res, database, next) {
		try {
			if (!req.params.containerID) 
				res.status(400).end("Container ID Not Specified")

			try {
				req.container = await Container.new(req.params.containerID, database)
				if (req.user.ID === req.container?.ownerID)
					return next()
			} catch (err) {
				res.status(404).end("Container Not Found")
			}

		} catch (err) {
			res.status(404).end(err)
		}
	}
}

module.exports = { Container }