const queryAudio = require("./view/audio.js")
const { authenticate, sendToken, sentRegisterUserToken, setRegisterAuthorizationCookie, setAuthorizationCookie } = require("./authentication")
const { returnUserID } = require("./view/user")
const { registerAudio, updateAudioData } = require("./controller.js")
const express = require("express")
const multer = require("multer")({ dest : "./audios" })
const router = express.Router()
const mysql = require("mysql2")

databaseOptions = {
	host:process.env.DB_ADDRESS,
	port:process.env.DB_PORT,
	user:process.env.DB_USER,
	database:process.env.DB_NAME
}

if (process.env.DB_PASSWORD) databaseOptions.password = process.env.DB_PASSWORD

let database = mysql.createConnection(databaseOptions)

database.connect(err => {if (err) throw err})
database = database.promise()

console.log("Connected to the database at localhost on port 3306")

router.post("/token/cookie", passDB(setAuthorizationCookie))
router.post("/token", passDB(sendToken))

router.post("/user/cookie", passDB(setRegisterAuthorizationCookie))
router.post("/user", passDB(sentRegisterUserToken))

router.use(authenticate)

router.get("/user/id", returnUserID)

function passDB(func) {
	return (req, res) => func(req, res, database)
}

router.route("/audio").post(multer.single("audioFile"), passDB(registerAudio))
router.route("/audio/:Audio_ID").get(passDB(queryAudio)).patch(passDB(updateAudioData))

router.get("/audios", (req, res) => {
	database.query(`SELECT ID FROM Audios WHERE Owner_ID = ?;`, [req.user.ID]).then(
		results => {res.status(200).json(results[0].map(item => item.ID)).end()},
		err => {res.status(500).end("Internal Error"); console.error(err)}
		)
	}
)
	
router.all("*", (req, res) => {
	res.status(404).end("Not Found")
})

module.exports = router