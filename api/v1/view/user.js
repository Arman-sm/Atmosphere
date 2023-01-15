function returnUserID(req, res, database) {
	return res.status(200).end(req.user.ID)
}

module.exports = { returnUserID }