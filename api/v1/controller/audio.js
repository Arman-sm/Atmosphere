const { rename, rm } = require("fs/promises")

const allowedAudioFormats = [
	'mp3', 'mpeg', 'opus', 'ogg', 'oga', 'wav', 'aac', 'caf', 'm4a', 'mp4','weba', 'webm', 'dolby', 'flac'
]

async function removeAudio(audioID, database) {
	rm("./audios/" + audioID).catch(() => {})
	try {
		while (true) {
			await rm(await extensionCarelessFileSearch("./audio covers/", audioID))
		}
	} catch {}
	
	database.query("DELETE FROM Audios WHERE ID = ?", [audioID])
}

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
				if (updatedData[property] == '') continue
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
			"./audio covers/" + req.files.cover[0].filename,
			`./audio covers/${req.files.audio[0].filename}.${req.files.cover[0].mimetype.split("/").at(-1)}`
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

module.exports = { registerAudio, updateAudioData, removeAudio }