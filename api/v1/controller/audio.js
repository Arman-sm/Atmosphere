async function manipulateAudioMetadata(audio, updatedData) {
	// Finding table columns that the client is allowed to manipulate
	if (typeof global.allowedFields === "undefined") {
		global.allowedFields = (await audio.database.query(`SHOW COLUMNS FROM Audios;`))[0]
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
			if (global.allowedFields.includes(property) && updatedData[property]) {
				audio.database.query(
					`UPDATE Audios SET ${property} = ? WHERE ID = ?;`, [updatedData[property], audio.ID]
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
	if (req.files?.cover) {
		rename
	}

	manipulateAudioMetadata(req.audio, req.body).then(
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

async function deleteAudio(req, res) {
	switch (req.query.query) {
		case "Picture":
		case "Cover":
			(await req.audio.cover())?.delete()
		default:
			if (req.query.query)
				return res.status(400).end("Invalid Query")
			
			req.audio.delete()
	}
	res.status(200).end()
}

module.exports = { manipulateAudioMetadata, updateAudioData, registerAudio, registerAudioToDB, deleteAudio }