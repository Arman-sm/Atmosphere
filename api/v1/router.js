const { queryAudio, returnAudios } = require("./view/audio.js")
const { authenticate, sendToken, sentRegisterUserToken, setRegisterAuthorizationCookie, setAuthorizationCookie } = require("./authentication")
const { returnUserID } = require("./view/user")
const { registerAudio, updateAudioData } = require("./controller.js")
const express = require("express")
const multerLib = require("multer")
const multer = multerLib({
	storage : multerLib.diskStorage({
		destination : (req, file, cb) => {
			if (file.fieldname === "audio") return cb(null, "./audios")
			cb(null, "./audio covers/")
		}
	})
})
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

router.route("/audio").post(
	multer.fields([{name : "audio", maxCount : 1}, {name : "cover", maxCount : 1}]),
	passDB(registerAudio)
)
router.route("/audio/:Audio_ID").get(passDB(queryAudio)).patch(passDB(updateAudioData))

router.get("/audios", passDB(returnAudios))

router.all("*", (req, res) => {
	res.status(404).end("Not Found")
})

module.exports = router