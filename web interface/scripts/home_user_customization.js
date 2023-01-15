function hueBasedOnLetter(value) {
	return Math.floor(360 / 26) * (value.toLowerCase().charCodeAt(0) - 96)
}

function generateGradientBasedOnLetter(value) {
	const letterHue = hueBasedOnLetter(value)
	return `linear-gradient(45deg, hsl(${letterHue}, 100%, 50%), hsl(${letterHue - Math.floor(360 / 26)}, 100%, 50%))`
}

const userID = JSON.parse(
	atob(
		decodeURIComponent(document.cookie).slice(
			document.cookie.indexOf("authorization") + "authorization=Bearer ".length,
			document.cookie.length
		).split(";")[0].split(".")[1]
	)
).ID

document.querySelector("#quick-access-profile > div")
	.style.background = generateGradientBasedOnLetter(userID)
document.querySelector("#quick-access-profile > div > span")
	.style.color = `hsl(${hueBasedOnLetter(userID)}, 100%, 20%)`

document.querySelector("#quick-access-profile > div > span").textContent = userID[0].toUpperCase()
document.querySelector("#quick-access-profile > span").textContent = userID

// document.querySelector("body").style.setProperty("--lime", `hsl(${hueBasedOnLetter(userID)}, 100%, 50%)`)
// document.querySelector("body").style.setProperty("--green", `hsl(${hueBasedOnLetter(userID)}, 100%, 30%)`)