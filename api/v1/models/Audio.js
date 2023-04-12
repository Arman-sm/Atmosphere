const { getAudioDurationInSeconds } = require("get-audio-duration")
const { Directory, File } = require("./Directory")

class Audio {
	static DB_COLUMNS = ["ID", "Owner_ID", "Container_ID", "Format", "Singer", "Title"]
	
	ID
	ownerID

	#title
	#singer
	#format
	#containerID

	static allowedFormats = [
		'mp3', 'mpeg', 'opus', 'ogg', 'oga', 'wav', 'aac', 'caf', 'm4a', 'mp4','weba', 'webm', 'dolby', 'flac'
	]

	static audiosDirectory = new Directory("./data/audio/audios")
	static coversDirectory = new Directory("./data/audio/covers")
	static lyricsDirectory = new Directory("./data/audio/lyrics")

	async updateMetadata() {
		const [result,] = (await this.database.query("SELECT * FROM Audios WHERE ID = ?;", [this.ID]))[0]
		if (!result) 
			reject("Audio Not Found")

		this.ownerID = result.Owner_ID

		this.#title = result.Title
		this.#singer = result.Singer
		this.#format = result.Format
		this.#containerID = result.Container_ID
		
	}

	#changeMetadata(key, value) {
		this.database.query(
			`UPDATE Audios SET ${key} = ? WHERE ID = ?;`, [value, this.ID]
		)
	}

	get title() { return this.#title }
	set title(value) { this.#changeMetadata("Title", value) }
	
	get singer() { return this.#singer }
	set singer(value) { this.#changeMetadata("Singer", value) }
	
	get format() { return this.#format }
	set format(value) { this.#changeMetadata("Format", value) }
	
	get containerID() { return this.#containerID }
	set containerID(value) { this.#changeMetadata("Container_ID", value) }

	audio() {
		return Audio.audiosDirectory.file(this.ID)
	}
	
	async cover() {
		return (await Audio.coversDirectory.fuzzySearch(this.ID))[0]
	}
	
	async lyrics() {
		return (await Audio.lyricsDirectory.fuzzySearch(this.ID))[0]
	}

	async duration() {
		return await getAudioDurationInSeconds(this.audio().path)
	}

	
	async delete() {
		(await this.cover())?.delete()
		this.audio().delete()
		
		this.database.query("DELETE FROM Audios WHERE ID = ?", [this.ID])
		Audio.audiosDirectory.file(this.ID).delete().catch(() => {})
	}
	
	constructor (audioID, database, metadataUpdateStat) {
		if (!metadataUpdateStat)
			throw "Make a new instance via the 'new' method"

		this.ID = audioID
		this.database = database

		return this
	}

	static async new(audioID, database) {
		const audio = new Audio(audioID, database, true)
		await audio.updateMetadata()
		return audio
	}

	static async register(audioID, ownerID, database) {
		await database.query(`INSERT INTO Audios(ID, Owner_ID) VALUES (?, ?)`, [audioID, ownerID])

		return await Audio.new(audioID, database)
	}

	static async attachToRequest(req, res, database, next) {
		try {
			req.audio = await Audio.new(req.params.audioID, database)
			next()
		} catch (err) {
			req.status(404).end(String(err))
		}
	}
	
	static async attachToRequestWithVerifiedOwnership(req, res, database, next) {
		try {
			if (!req.params.audioID) 
				res.status(400).end("Audio ID Not Specified")

			req.audio = await Audio.new(req.params.audioID, database)
			if (req.user.ID === req.audio.ownerID) return next()
			
			res.status(404).end("Audio Not Found")
		} catch (err) {
			res.status(404).end(String(err))
		}
	}
}

module.exports = { Audio }