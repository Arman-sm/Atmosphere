const { queryAudio, returnAudios } = require("./view/audio.js")
const { updateAudioData, registerAudio, deleteAudio } = require("./controller/audio.js")
const { containerView, rootView, queryContainer } = require("./view/container")
const { deleteContainer, manipulateContainerMetadata, registerContainer } = require("./controller/container")
const { authenticate, sendToken, sentRegisterUserToken, setRegisterAuthorizationCookie, setAuthorizationCookie } = require("./authentication")
const { returnUserID } = require("./view/user")
const { Container } = require("./models/Container")
const { Audio } = require("./models/Audio")
const express = require("express")
const multerLib = require("multer")

const multerAudio = multerLib({
	storage : multerLib.diskStorage({
		destination : (req, file, cb) => {
			if (file.fieldname === "audio") return cb(null, Audio.audiosDirectory.path)
			cb(null, Audio.coversDirectory.path)
		}
	})
})

const multerContainer = multerLib({
	dest: Container.coversDirectory.path
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

console.log("Connected to the database at localhost on port " + process.env.DB_PORT)

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
	multerAudio.fields([{name : "audio", maxCount : 1}, {name : "cover", maxCount : 1}]),
	passDB(registerAudio)
)
router.use("/audio/:audioID", passDB(Audio.attachToRequestWithVerifiedOwnership))
router.route("/audio/:audioID")
	.get(queryAudio)
	.patch(updateAudioData)
	.delete(deleteAudio)
//#endregion

router.get("/audios", passDB(returnAudios))

router.post("/container",
	multerContainer.fields([{name: "cover", maxCount: 1}]),
	passDB(registerContainer)
)

router.use("/container/:containerID", passDB(Container.attachToRequestWithVerifiedOwnership))
router.route("/container/:containerID")
	.get(queryContainer)
	.patch((req, res) => manipulateContainerMetadata(req.container, req.body).then(
		() => res.status(200).end(),
		err => res.status(400).end(err)
	))
	.delete(deleteContainer)

router.get("/view/", passDB(rootView))
router.get("/view/:containerID", passDB(containerView))

router.all("*", (req, res) => {
	res.status(404).end("Not Found")
})

module.exports = router