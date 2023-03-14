const { Container } = require("../models/Container")

async function manipulateContainerMetadata(container, updatedData) {
	// Applying changes to the database where possible
	for (property in updatedData) {
		if (property === "Format" && !allowedAudioFormats.includes(updatedData[property].toLowerCase())) {
			if (!updatedData[property]) continue
			throw "Audio Format is Not Supported"
		}
		if (Container.DB_COLUMNS.includes(property) && updatedData[property]) {
			container.database.query(
				`UPDATE Containers SET ${property} = ? WHERE ID = ?;`, [updatedData[property], container.ID]
			)
		}
	}
	return
}

async function deleteContainer(req, res) {
	switch (req.query.query) {
		case "Picture":
		case "Cover":
			(await req.container.cover())?.delete()
		default:
			if (req.query.query)
				return res.status(400).end("Invalid Query")
			
			req.container.delete()
	}
	res.status(200).end()
}

function uuid(allowedCharacters, resultLength) {
	results = ""
	for (let index = 1; index <= resultLength; index++) {
		results += allowedCharacters.at(Math.floor(Math.random() * allowedCharacters.length))
	}
	return results
}

async function registerContainer(req, res, database) {
	let ID = ""
	do {
		ID = uuid([ 
			'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
			'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
			'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a',
			'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
			'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
			't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1',
			'2', '3', '4', '5', '6', '7', '8', '9', '_',
		], 32)
	} while ( await (async function() {
		try {
			req.container = await Container.new(ID, database)
		} catch (err) {
			return true
		}
		return false
	})())
	
	if (req.files.cover?.[0]) {
		Container.coversDirectory.file(req.files.cover[0].filename)
			.rename(`${ID}.${req.files.cover[0].mimetype.split("/").at(-1)}`)
	}

	Container.register(req.files.audio[0].filename, req.user.ID, database).then(
		container => {
			manipulateContainerMetadata(audio, req.body)
			res.status(201)
			if (req.query.returnAudioID)
				return res.status(201).end(audio.ID)
			res.status(201).end()
		},
		err => {console.error(err); res.status(400).end()}
	)

	manipulateContainerMetadata(req.container, req.body)

	res.status(201).end(ID)
}

module.exports = { registerContainer, deleteContainer, manipulateContainerMetadata }