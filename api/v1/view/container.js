const { Container } = require("../models/Container")

async function rootView(req, res, database) {
	const [containers,] = await database.query(
		"SELECT ID FROM Containers WHERE Container_ID is NULL AND Owner_ID = ?;",
		[req.user.ID]
	)
	const [audios,] = await database.query(
		"SELECT ID FROM Audios WHERE Container_ID is NULL AND Owner_ID = ?;",
		[req.user.ID]
	)

	res.status(200).end(
		JSON.stringify({
			containers: containers.map(container => container.ID),
			audios: audios.map(audio => audio.ID)
		})
	)
}

async function containerView(req, res, database) {
	const [containers,] = await database.query(
		"SELECT ID FROM Containers WHERE Container_ID = ? AND Owner_ID = ?;",
		[req.params.containerID, req.user.ID]
	)
	const [audios,] = await database.query(
		"SELECT ID FROM Audios WHERE Container_ID = ? AND Owner_ID = ?;",
		[req.params.containerID, req.user.ID]
	)

	res.status(200).end(
		JSON.stringify({
			containers: containers.map(container => container.ID),
			audios: audios.map(audio => audio.ID)
		})
	)
}

async function queryContainer(req, res) {
	if (typeof global.allowedFields === "undefined") {
		global.allowedFields = (await req.container.database.query(`SHOW COLUMNS FROM Containers;`))[0]
			.map(field => field.Field)
			.filter(item => !(["ID", "Owner_ID"].includes(item)))
	}

	if (req.query.query === "Cover" || req.query.query === "Picture") {
		try {
			const cover = await req.container.cover()
			if (cover) {
				res.status(200)
				cover.send(res)
				return
			}
			return res.status(404).end("Cover Not Found")
		} catch (err) {
			console.error(err)
			return res.status(500).end("Internal Error")
		}
	}

	try {
		// Selecting the container with the container id provided
		const [results,] = await req.container.database.query(
			`SELECT * FROM Containers WHERE ID = ? AND Owner_ID = ?;`,
			[req.container.ID, req.user.ID]
		)
		// If no query option matches the query
		if (global.allowedFields.includes(req.query["query"])) {
			return res.status(200).end(results[0][req.query["query"]])
		}
		return res.status(400).end("Invalid Query")
	} catch (err) { console.error(err); res.status(500).end("Internal Error"); }
}

async function manipulateContainerMetadata(container, updatedData) {
	// Finding table columns that the client is allowed to manipulate
	if (typeof global.allowedFields === "undefined") {
		global.allowedFields = [...(await container.database.query(`SHOW COLUMNS FROM Audios;`))][0]
			.map(field => field.Field)
			.filter(item => !(["ID", "Owner_ID"].includes(item)))
	}

	// Applying changes to the database where possible
	for (property in updatedData) {
		if (property === "Format" && !allowedAudioFormats.includes(updatedData[property].toLowerCase())) {
			if (!updatedData[property]) continue
			throw "Audio Format is Not Supported"
		}
		if (global.allowedFields.includes(property) && updatedData[property]) {
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

async function createContainer(req, res, database) {
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

	manipulateContainerMetadata(req.container, req.body)

	res.status(201).end(ID)
}

module.exports = {containerView, rootView, queryContainer, deleteContainer, manipulateContainerMetadata, createContainer}