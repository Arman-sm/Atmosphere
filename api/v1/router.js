const { queryAudio, returnAudios } = require("./view/audio.js")
const { updateAudioData, registerAudio, deleteAudio } = require("./controller/audio.js")
const { containerView, rootView, queryContainer } = require("./view/container")
const { authenticate, sendToken, sentRegisterUserToken, setRegisterAuthorizationCookie, setAuthorizationCookie } = require("./authentication")
const { returnUserID } = require("./view/user")
const { Audio } = require("./models/Audio")
const express = require("express")
const multerLib = require("multer")

const multer = multerLib({
	storage : multerLib.diskStorage({
		destination : (req, file, cb) => {
			if (file.fieldname === "audio") return cb(null, "./audio/audios")
			cb(null, "./audio/covers/")
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

//#region token
router.post("/token/cookie", passDB(setAuthorizationCookie))
router.post("/token", passDB(sendToken))
//#endregion
//#region user
router.post("/user/cookie", passDB(setRegisterAuthorizationCookie))
router.post("/user", passDB(sentRegisterUserToken))
//#endregion

// Requiring authentication for the rest
router.use(authenticate)
// Get user ID
router.get("/user/id", returnUserID)

function passDB(func) {
	return (req, res, next) => func(req, res, database, next)
}
//#region Audio
router.route("/audio").post(
	multer.fields([{name : "audio", maxCount : 1}, {name : "cover", maxCount : 1}]),
	passDB(registerAudio)
)
router.use("/audio/:audioID", passDB(Audio.attachToRequestWithVerifiedOwnership))
router.route("/audio/:audioID")
	.get(passDB(queryAudio))
	.patch(passDB(updateAudioData))
	.delete(passDB(deleteAudio))
//#endregion

router.get("/audios", passDB(returnAudios))

router.get("/container/:Container_ID", passDB(queryContainer))

router.get("/view/", passDB(rootView))
router.get("/view/:Container_ID", passDB(containerView))

router.delete("/cover/audio/:audioID", Audio.attachToRequestWithVerifiedOwnership, (req, res) => {
	removeAudioCover(req.params.audioID)
	res.status(200).end()
})

router.all("*", (req, res) => {
	console.log(1)
	res.status(404).end("Not Found")
})

module.exports = router