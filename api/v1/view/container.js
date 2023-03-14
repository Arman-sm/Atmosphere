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
		if (Container.DB_COLUMNS.includes(req.query["query"])) {
			return res.status(200).end(results[0][req.query["query"]])
		}
		return res.status(400).end("Invalid Query")
	} catch (err) { console.error(err); res.status(500).end("Internal Error"); }
}

module.exports = {containerView, rootView, queryContainer}