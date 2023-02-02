const { createReadStream } = require("fs")
const { stat } = require("fs/promises")
const { removeAudio } = require("../controller/audio")
const { getAudioDurationInSeconds } = require("get-audio-duration")
const { returnCover } = require("./cover")

function returnAudios(req, res, database) {
	database.query(`SELECT ID FROM Audios WHERE Owner_ID = ?;`, [req.user.ID]).then(
		results => {res.status(200).json(results[0].map(item => item.ID)).end()},
		err => {res.status(500).end("Internal Error"); console.error(err)}
	)
}

// Pipes the music to the client from the specified start in seconds
async function pipeAudio(req, res, database) {
	const path = "./audio/audios/" + req.params.Audio_ID
	let start = Number(req.query.start) || 0
	
	try {
		var { size } = await stat(path)
	} catch (err) {
		if (err.code === "ENOENT") {
			res.status(404).end("audio file was not found")
			removeAudio(req.params.Audio_ID, database)
			return
		}
		console.error(err)
		return
	}
	start = Math.floor(start * (size / Math.floor(await getAudioDurationInSeconds(path))))
	
	if (isNaN(start)) start = 0

	if (start >= size) {
		return res.status(400).end("Start is more than audio's length")
	}
	return new Promise((resolve, reject) => {
	fileStream = createReadStream(path, {
		start: (start)
	})
	fileStream.on("open", async () => {
		fileStream.pipe(res)
	})
	fileStream.on("close", () => {
		resolve()
	})
	fileStream.on("error", (err) => {
		res.status(500).end("Internal Error")
		console.error(err)
		reject(err)
	})
	})
}
async function queryAudio(req, res, database) {
	if (typeof allowedFields === "undefined") {
		global.allowedFields = (await database.query(`SHOW COLUMNS FROM Audios;`))[0]
			.map(field => field.Field)
			.filter(item => !(["ID", "Owner_ID"].includes(item)))
	}
	const { Audio_ID } = req.params
	if (!Audio_ID) { return res.status(404).end("Audio ID Not Specified") }
	try {
		// Selecting the audio with the audio id provided
		const [results,] = await database.query(
			`SELECT * FROM Audios WHERE ID = ? AND Owner_ID = ?;`,
			[Audio_ID, req.user.ID]
		)
		// Checking if there are audios with the specified audio id
		if (results.length == 0) { return res.status(404).end("Audio Not Found") }
		res.status(200)
		
		// Piping the file if no query is specified
		if (!req.query["query"]) { return await pipeAudio(req, res, database) }
		
		// Options for querying different info about an audio
		switch (req.query["query"]) {
			// Duration of the selected audio in seconds
			case "Duration":
				try {
					return res.end(String(await getAudioDurationInSeconds(`./audio/audios/${Audio_ID}`)))
				} catch (err) {
					res.status(500).end("0")
				}
			case "Picture":
			case "Cover":
				try {	
					await returnCover(req, res, Audio_ID, "./audio/covers/")
				} catch {}
				return
			default:
				// If no query option matches the query
				if (allowedFields.includes(req.query["query"])) {
					return res.status(200).end(results[0][req.query["query"]])
				}
				res.status(400).end("Invalid Query")
		}
		return
	} catch (err) { console.error(err); res.status(500).end("Internal Error"); }
}

module.exports = { queryAudio, returnAudios }