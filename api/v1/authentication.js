const { createHash } = require("crypto")
const jwt = require("jsonwebtoken")

function hash(text) {
	return createHash("sha1").update(text).digest("base64")
}

function authenticate(req, res, next) {
	let token = req.cookies.authorization
	if (req.headers.authorization) {
		token = req.headers.authorization
	}
	if (token && token.startsWith("Bearer ")) {
		try {
			req.user = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET)
			return next()
		} catch (err) {
			return (req.baseUrl.startsWith("/api/") ? res.status(401).end("Authentication Error") : res.redirect("/login"))
		}
	} else if (req.baseUrl.includes("/api/")) {
		return res.status(401).end("No Authorization Token")
	}
	return res.redirect("/login")
}

function registerUser(ID, password, database) {
	const info = [ID, password]
	return new Promise(async (resolve, reject) => {
		try {
			if ((await database.query("SELECT * FROM Users WHERE ID = ?", [ID]))[0].length != 0) {
				reject("User Already Exists") 
			}
		} catch (err) {
			reject("Internal Error")
		}
		if (info.includes(undefined) || info.includes(null)) { reject("Not Enough Info") }
		try {
			await database.query(
				"INSERT INTO Users(ID, Hashed_Password) VALUES (?, ?)",
				[ID, hash(password)]
			)
		} catch (err) {
			reject(err)
		}
		resolve(jwt.sign({ ID : ID }, process.env.JWT_SECRET, { expiresIn : "2h" }))
	})
}

function sentRegisterUserToken(req, res, database) {
	registerUser(req.body.ID, req.body.password, database).then(
		token => res.status(201).end(token),
		err => {console.error(err); res.status(500).end(err)}
	)
}

function setRegisterAuthorizationCookie(req, res, database) {
	registerUser(req.body.ID, req.body.password, database).then(
		token => res.cookie("authorization", "Bearer " + token).redirect("/web"),
		err => {console.error(err); res.status(500).end(err)}
	)
}

function generateToken(UserID, enteredPassword, database) {
	return new Promise(async (resolve, reject) => {
		const results = (await database.query("SELECT Hashed_Password FROM Users WHERE ID = ?", [UserID]))[0]
		if (results[0]?.Hashed_Password === hash(enteredPassword)) {
			resolve(jwt.sign({ ID : UserID }, process.env.JWT_SECRET, { expiresIn : "2h" }))
		}
		// The same thing happens if username or password is not specified or is invalid
		reject("User Not Found or Password is Incorrect")
	})
}

function sendToken(req, res, database) {
	generateToken(req.body.ID, req.body.password, database).then(
		token => res.status(200).end(token),
		err => res.status(400).end(err)
	)
}

function setAuthorizationCookie(req, res, database) {
	generateToken(req.body.ID, req.body.password, database).then(
		token => res.cookie("authorization", "Bearer " + token).redirect("/web"),
		err => res.status(400).end(err)
	)
}

module.exports = { hash, authenticate, sentRegisterUserToken, registerUser, generateToken, sendToken, setAuthorizationCookie, setRegisterAuthorizationCookie }