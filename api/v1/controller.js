const allowedAudioFormats = [
	'mp3', 'mpeg', 'opus', 'ogg', 'oga', 'wav', 'aac', 'caf', 'm4a', 'mp4','weba', 'webm', 'dolby', 'flac'
]

function manipulateAudioMetadata(database, audioID, updatedData) {
	return new Promise( async (resolve, reject) => { 
	try {
		// Finding table columns that the client is allowed to manipulate
		let allowedFields = await database.query(`SELECT * FROM Audios WHERE ID = ?;`, [audioID])
		allowedFields = allowedFields[1]
			.map(field => field.name)
			.filter(item => !["ID", "Owner_ID"].includes(item))
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
		reject(err)
	}
	})
}

function updateAudioData(req, res, database) {
	if (!req.params["Audio_ID"]) { res.status(400).end("Audio ID Not Specified") }
	manipulateAudioMetadata(database, req.params["Audio_ID"], req.body).then(
		() => res.status(200).end(),
		err => {res.end(400).end(); console.error(err)}
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
	if (!req.file) res.status(400).end("No Audio was Sent")
	registerAudioToDB(database, req.file.filename, req.user.ID, req.body).then(
		ID => {
			res.status(201)
			if (req.params.returnAudioID) {
				return res.status(201).end(ID)
			}
			res.status(201).end()
		},
		err => {console.error(err); res.status(400).end()}
	)
}

module.exports = { registerAudio, updateAudioData }