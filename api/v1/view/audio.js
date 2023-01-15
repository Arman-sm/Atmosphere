const { createReadStream } = require("fs")
const { stat } = require("fs/promises")
const { getAudioDurationInSeconds } = require("get-audio-duration")
// Pipes the music to the client from the specified start in seconds
async function pipeMusic(path, res, start) {
	if (!start) { start = 0 }
	const { size } = await stat(path)
	start = Math.floor(start * (size / Math.floor(await getAudioDurationInSeconds(path))))
	if (isNaN(start)) {
		start = 0
	}
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
async function queryMusic(req, res, database) {
	const { Audio_ID } = req.params
	if (!Audio_ID) { return res.status(404).end("Audio ID Not Specified") }
	try {
		// Selecting the audio by the audio id provided
		const [results, fields] = await database.query(
			`SELECT * FROM Audios WHERE Audios.ID = ? AND Owner_ID = ?;`,
			[Audio_ID, req.user.ID]
		)
		// Checking if there are audios with the specified audio id
		if (results.length == 0) {return res.status(404).end("Audio Not Found")}
		// Options for querying different info about an audio
		res.status(200)
	
		// Piping the file if no query is specified
		if (!req.query["query"]) { return await pipeMusic(`./audios/${Audio_ID}`, res, Number(req.query["start"])) }
		
		switch (req.query["query"]) {
			// Duration of the selected audio in seconds
			case "Duration":
				return res.end(String(await getAudioDurationInSeconds(`./audios/${Audio_ID}`)))
			// If no query option matches the query
			default:
				if (fields.map(field => field.name).includes(req.query["query"])) {
					return res.status(200).end(results[0][req.query["query"]])
				}
				return res.status(400).end("Invalid Query")
		}
	} catch (err) { console.error(err); res.status(500).end("Internal Error"); }
}

module.exports = queryMusic