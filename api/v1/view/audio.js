const { dirxml } = require("console")
const { response } = require("express")
const { createReadStream } = require("fs")
const { stat, readFile, opendir, readdir } = require("fs/promises")
const { getAudioDurationInSeconds } = require("get-audio-duration")

async function extensionCarelessFileSearch(dirname, filename) {
	return new Promise(async (resolve, reject) => {
		for await (const file of await opendir(dirname)) {
			if (file.name.slice(0, file.name.lastIndexOf(".")) === filename) {
				return resolve(file)
			}
		}
		reject()
	})
}


function returnAudios(req, res, database) {
	database.query(`SELECT ID FROM Audios WHERE Owner_ID = ?;`, [req.user.ID]).then(
		results => {res.status(200).json(results[0].map(item => item.ID)).end()},
		err => {res.status(500).end("Internal Error"); console.error(err)}
	)
}

async function returnCover(req, res, AudioID) {
	if (AudioID.includes("/")) return res.status(400).end("Invalid Audio ID")
	return new Promise((resolve, reject) => {
		extensionCarelessFileSearch("./audio covers/", AudioID).then(
			file => {
				res.status(200).sendFile("./audio covers/" + file.name,
					{
						root : process.cwd()
					},
					err => {
						if (err === undefined) {return resolve(true)}
						console.error(err)
						reject(err)
					}
				)
			},
			err => {
				res.status(404).end("Cover Not Found")
				reject(err)
			}
		)
	}
	)
}

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
		console.log(0)
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
		// Selecting the audio by the audio id provided
		const [results,] = await database.query(
			`SELECT * FROM Audios WHERE Audios.ID = ? AND Owner_ID = ?;`,
			[Audio_ID, req.user.ID]
		)
		// Checking if there are audios with the specified audio id
		if (results.length == 0) { return res.status(404).end("Audio Not Found") }
		// Options for querying different info about an audio
		res.status(200)
	
		// Piping the file if no query is specified
		if (!req.query["query"]) { return await pipeMusic(`./audios/${Audio_ID}`, res, Number(req.query["start"])) }
		
		switch (req.query["query"]) {
			// Duration of the selected audio in seconds
			case "Duration":
				return res.end(String(await getAudioDurationInSeconds(`./audios/${Audio_ID}`)))
			case "Picture":
			case "Cover":
				try {	
					await returnCover(req, res, Audio_ID)
				} catch {}
				return
			default:
				// If no query option matches the query
				if (allowedFields.includes(req.query["query"])) {
					return res.status(200).end(results[0][req.query["query"]])
				}
				return res.status(400).end("Invalid Query")
		}
	} catch (err) { console.error(err); res.status(500).end("Internal Error"); }
}

module.exports = { queryAudio, returnAudios }