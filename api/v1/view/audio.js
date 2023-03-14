const { createReadStream } = require("fs")
const { stat } = require("fs/promises");
const { Audio } = require("../models/Audio");

function returnAudios(req, res, database) {
	database.query(`SELECT ID FROM Audios WHERE Owner_ID = ?;`, [req.user.ID]).then(
		results => {res.status(200).json(results[0].map(item => item.ID)).end()},
		err => {res.status(500).end("Internal Error"); console.error(err)}
	)
}

// Pipes the music to the client from the specified start in seconds
async function pipeAudio(req, res) {
	const file = req.audio.audio()
	if (req.audio.format)
		res.type(req.audio.format)
	
	let start = Number(req.query.start) || 0

	try {
		var { size } = await stat(file.path)
	} catch (err) {
		if (err.code === "ENOENT") {
			res.status(404).end("audio file was not found")
			req.audio.delete()
			return
		}
		console.error(err)
		return
	}

	start = Math.floor(start * (size / Math.floor(await req.audio.duration())))
	
	if (isNaN(start)) start = 0

	if (start >= size) {
		return res.status(400).end("Start is more than audio's length")
	}
	return new Promise((resolve, reject) => {
	fileStream = createReadStream(file.path, {
		start: start
	})
	fileStream.on("open", async () => {
		fileStream.pipe(res)
	})
	fileStream.on("close", () => {
		res.end()
		resolve()
	})
	fileStream.on("error", (err) => {
		res.status(500).end("Internal Error")
		console.error(err)
		reject(err)
	})
	})
}
async function queryAudio(req, res) {
	try {
		// Selecting the audio with the audio id provided
		const [results,] = await req.audio.database.query(
			`SELECT * FROM Audios WHERE ID = ? AND Owner_ID = ?;`,
			[req.audio.ID, req.user.ID]
		)
		res.status(200)
		
		// Piping the file if no query is specified
		if (!req.query["query"]) { return await pipeAudio(req, res) }
		
		// Options for querying different info about an audio
		switch (req.query["query"]) {
			// Duration of the selected audio in seconds
			case "Duration":
				try {
					return res.end(String(await req.audio.duration()))
				} catch (err) {
					res.status(500).end("0")
				}
			case "Picture":
			case "Cover":
				try {	
					const cover = await req.audio.cover()
					if (!cover)
						return res.status(404).end()
					
					cover.send(res)
				} catch(err) { console.error(err) }
				return
			default:
				// If no query option matches the query
				if (Audio.DB_COLUMNS.includes(req.query["query"])) {
					return res.status(200).end(results[0][req.query["query"]])
				}
				res.status(400).end("Invalid Query")
		}
		return
	} catch (err) { console.error(err); res.status(500).end("Internal Error") }
}

module.exports = { queryAudio, returnAudios }