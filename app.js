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
app.get("/web", authenticate, (req, res) => res.status(200).sendFile(resolvePath("./web interface/index.html")))
app.use("/web", express.static("./web interface"))

app.get("/", (req, res) => res.redirect("/web"))
app.get("/login", (req, res) => res.status(200).sendFile(resolvePath("./web interface/login.html")))
app.get("/register", (req, res) => res.status(200).sendFile(resolvePath("./web interface/register.html")))

if (process.env.MODE === "DEV") {app.get("/test", (req, res) => res.status(200).sendFile(resolvePath("./web interface/test.html")))}

app.all("/*", (req, res) => {
	res.status(404).sendFile(resolvePath("./web interface/404.html"))
})

app.listen(process.env.PORT, () => {
	console.log(`App listening on port ${process.env.PORT}...`)
	console.log(`\n\x1b[34mGenerated address: \x1b[1mhttp://${require("ip").address()}:${process.env.PORT}\x1b[0m`)
})
