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
		[req.params.Container_ID, req.user.ID]
	)
	const [audios,] = await database.query(
		"SELECT ID FROM Audios WHERE Container_ID = ? AND Owner_ID = ?;",
		[req.params.Container_ID, req.user.ID]
	)

	res.status(200).end(
		JSON.stringify({
			containers: containers.map(container => container.ID),
			audios: audios.map(audio => audio.ID)
		})
	)
}

async function queryContainer(req, res, database) {
	if (typeof allowedFields === "undefined") {
		global.allowedFields = (await database.query(`SHOW COLUMNS FROM Containers;`))[0]
			.map(field => field.Field)
			.filter(item => !(["ID", "Owner_ID"].includes(item)))
	}
	const { Container_ID } = req.params
	if (!Container_ID) { return res.status(404).end("Container ID Not Specified") }
	try {
		// Selecting the container with the container id provided
		const [results,] = await database.query(
			`SELECT * FROM Containers WHERE ID = ? AND Owner_ID = ?;`,
			[Container_ID, req.user.ID]
		)
		// Checking if there are audios with the specified audio id
		if (results.length == 0) {
			return res.status(404).end("Container Not Found")
		}

		// If no query option matches the query
		if (allowedFields.includes(req.query["query"])) {
			return res.status(200).end(results[0][req.query["query"]])
		}
		return res.status(400).end("Invalid Query")
	} catch (err) { console.error(err); res.status(500).end("Internal Error"); }
}

module.exports = {containerView, rootView, queryContainer}