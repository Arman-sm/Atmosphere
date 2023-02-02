const { opendir } = require("fs/promises")

async function extensionCarelessFileSearch(dirname, filename) {
	return new Promise(async (resolve, reject) => {
		for await (const file of await opendir(dirname)) {
			if (file.name.slice(0, file.name.lastIndexOf(".")) === filename) {
				return resolve(file)
			}
		}
		reject()
	})
}

async function returnCover(req, res, imageName, path) {
	if (imageName.includes("/")) return res.status(400).end("Illegal ID")
	return new Promise((resolve, reject) => {
		extensionCarelessFileSearch(path, imageName).then(
			file => {
				res.status(200).sendFile(path + file.name,
					{
						root : process.cwd()
					},
					err => {
						if (err === undefined) {return resolve(true)}
						console.error(err)
						reject(err)
					}
				)
			},
			err => {
				res.status(404).end("Cover Not Found")
				reject(err)
			}
		)
	}
	)
}

module.exports = {returnCover}