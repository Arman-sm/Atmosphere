const { rename, rm, opendir } = require("fs/promises")

const allowedAudioFormats = [
	'mp3', 'mpeg', 'opus', 'ogg', 'oga', 'wav', 'aac', 'caf', 'm4a', 'mp4','weba', 'webm', 'dolby', 'flac'
]

class Audio {
	updateMetadata() {
		return new Promise(async function() {
			const [, results] = await this.database.query("SELECT * FROM Audios WHERE ID = ?;", [this.ID])
			if (results.length === 0) {
				reject("Audio Not Found")
			}
			this.ownerID = results[0].Owner_ID
			
			this._title = results[0].Title
			this._singer = results[0].Singer
			this._format = results[0].Format
			this._containerID = results[0].Container_ID
		})
	}

	#changeMetadata(key, value) {
		this.database.query(
			`UPDATE Audios SET ${key} = ? WHERE ID = ?;`, [value, this.ID]
		)
	}
	
	get title() { return this._title }
	set title(value) { this.#changeMetadata("Title", value) }
	
	get singer() { return this._singer }
	set singer(value) { this.#changeMetadata("Singer", value) }
	
	get format() { return this._format }
	set format(value) { this.#changeMetadata("Format", value) }
	
	get containerID() { return this._format }
	set containerID(value) { this.#changeMetadata("Container_ID", value) }

	async deleteCover() {
		while (true) {
			const file = await extensionCarelessFileSearch("./audio/covers", this.ID)
			if (file === undefined) break
			await rm("./audio/covers/" + file.name)
		}
	}
	
	async delete() {
		this.deleteCover()
		
		this.database.query("DELETE FROM Audios WHERE ID = ?", [this.ID])
		rm("./audio/audios/" + this.ID).catch(() => {})
	}
	
	constructor (audioID, database) {
		return new Promise(async function(resolve, reject) {
			this.ID = audioID
			this.database = database

			this.updateMetadata().then(
				metadata => resolve(this),
				err => reject(err)
			)
		}
		)
	}

	static async register(audioID, ownerID, database) {
		await database.query(`INSERT INTO Audios(ID, Owner_ID) VALUES (?, ?)`, [audioID, ownerID])

		return await new Audio(audioID, database)
	}

	static attachToRequest(req, res, next, database) {
		try {
			req.audio = new Audio(req.params.Audio_ID, database)
			next()
		} catch (err) {
			req.status(404).end(err)
		}
	}
	
	static attachToRequestWithVerifiedOwnership(req, res, next, database) {
		try {
			req.audio = new Audio(req.params.Audio_ID, database)
			if (req.user === req.audio.ownerID) return next()
			req.status(404).end("Audio Not Found")
			
		} catch (err) {
			req.status(404).end(err)
		}
	}
}


async function extensionCarelessFileSearch(dirname, filename) {
	for await (const file of await opendir(dirname)) {
		if (file.name.slice(0, file.name.lastIndexOf(".")) === filename) {
			return file
		}
	}
	return
}
// TODO: deprecate
async function removeAudioCover(audioID) {
}
// TODO: deprecate
async function removeAudio(audioID, database) {
}
// TODO: re-write based on the new Audio class
async function manipulateAudioMetadata(database, audioID, updatedData) {
	// Finding table columns that the client is allowed to manipulate
	if (typeof allowedFields === "undefined") {
		global.allowedFields = (await database.query(`SHOW COLUMNS FROM Audios;`))[0]
			.map(field => field.Field)
			.filter(item => !(["ID", "Owner_ID"].includes(item)))
	}
	return new Promise( async (resolve, reject) => { 
	try {
		// Applying changes to the database where possible
		for (property in updatedData) {
			if (property === "Format" && !allowedAudioFormats.includes(updatedData[property].toLowerCase())) {
				if (!updatedData[property]) continue
				reject("Audio Format is Not Supported")
			}
			if (allowedFields.includes(property) && updatedData[property]) {
				database.query(
					`UPDATE Audios SET ${property} = ? WHERE ID = ?;`, [updatedData[property], audioID]
				)
			}
		}
		resolve()
	} catch (err) {
		reject()
	}
	})
}

function updateAudioData(req, res, database) {
	if (!req.params.Audio_ID) { res.status(400).end("Audio ID Not Specified") }

	if (req.files?.cover) {
		rename
	}

	manipulateAudioMetadata(database, req.params["Audio_ID"], req.body).then(
		() => res.status(200).end(),
		err => res.end(400).end()
	)
}

function registerAudioToDB(database, audioID, ownerID, metadata) {
	return new Promise(async (resolve, reject) => {
		try {
			await database.query(`INSERT INTO Audios(ID, Owner_ID) VALUES (?, ?)`, [audioID, ownerID])
			if (metadata) {manipulateAudioMetadata(database, audioID, metadata)}
			resolve(audioID)
		} catch (err) {
			await database.query("DELETE FROM Audios WHERE ID = ?", [audioID])
			reject(err)
		}
	})
}

function registerAudio(req, res, database) {
	if (!req.files.audio?.[0]) res.status(400).end("No Audio was Sent")
	if (req.files.cover?.[0]) {
		rename(
			"./audio/covers/" + req.files.cover[0].filename,
			`./audio/covers/${req.files.audio[0].filename}.${req.files.cover[0].mimetype.split("/").at(-1)}`
		)
	}
	registerAudioToDB(database, req.files.audio[0].filename, req.user.ID, req.body).then(
		ID => {
			res.status(201)
			if (req.query.returnAudioID) {
				return res.status(201).end(ID)
			}
			res.status(201).end()
		},
		err => {console.error(err); res.status(400).end()}
	)
}

module.exports = { registerAudio, updateAudioData, removeAudio, removeAudioCover }