require("dotenv").config()
const { resolve: resolvePath} = require("path")
const apiRouter = require("./api/v1/router")
const { authenticate } = require("./api/v1/authentication")
const cookieParser = require("cookie-parser")
const express = require("express")

const app = express()

app.use(cookieParser())
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({extended:true}))

app.use("/api/v1", apiRouter)
app.get("/web", authenticate, (req, res) => res.status(200).sendFile(resolvePath("./web/public/index.html")))
app.use("/web", express.static("./web/public"))

app.get("/", (req, res) => res.redirect("/web"))
app.get("/login", (req, res) => res.status(200).sendFile(resolvePath("./web/public/login.html")))
app.get("/register", (req, res) => res.status(200).sendFile(resolvePath("./web/public/register.html")))

if (process.env.MODE === "DEV") {app.get("/test", (req, res) => res.status(200).sendFile(resolvePath("./web/public/test.html")))}

app.all("/*", (req, res) => {
	res.status(404).sendFile(resolvePath("./web/public/404.html"))
})

try {
	
	app.listen(process.env.PORT || 6812, () => {
		console.log(`App listening on port ${process.env.PORT || 6812}...`)
		console.log(`\n\x1b[34mGenerated address: \x1b[1mhttp://${require("ip").address()}:${process.env.PORT || 6812}\x1b[0m`)
	})
} catch (error) {
	process.exit()
}
