// The section when you van select audios
const browser = document.getElementById("browser-item-container")
const containerPathElement = document.querySelector("#browser :nth-child(1)")

const timeline = document.querySelector("#timeline > input[type=range]")
const timelineEnd = document.querySelector("#timeline > :nth-child(3)")
const timelineState = document.querySelector("#timeline > :nth-child(1)")
const pausePlayButton = document.querySelector("#controller button:nth-child(2) > img")
const playingAudioCover = document.querySelector("#music-control > img")

// [[ID, Name]]
let containerPath = [["", ""]]
// Difference between audio start read position (player.seek()) and the timeline
let timelineDifference = 0
// ID of the set interval that updates the timeline's state every second
let timelineUpdaterID = 0

// Reading the audio from a different position on timeline change
timeline.addEventListener("change", () => {
	playAudio(player.audio_id_playing, Math.round(Number(timeline.value)))
})

// Pauses the music and changes the ui based on the change
function pause() {
	pausePlayButton.src = "/web/images/pause.svg"
	player.pause()
	clearInterval(timelineUpdaterID)
}
// Plays the music and changes the ui based on the change
function play() {
	pausePlayButton.src = "/web/images/play.svg"
	player.play()
	// Updating the timeline
	timelineUpdaterID = setInterval(() => {
		timeline.value = player.seek() + timelineDifference
		timelineState.textContent = `${Math.round((player.seek() + timelineDifference) / 60)}:${String(Math.round((player.seek() + timelineDifference) % 60)).padStart(2, "0")}`
	}, 1000)
}
// Plays the audio from the specified start position
// The start is in seconds
function playAudio (audioId, start) {
	try { player.unload(); } catch (err) {
		window["player"] = new Howl({
			src : [``],
			html5: true,
		})
		player.on("end", () => {pause(); player.seek(0)})
	}
	player["audio_id_playing"] = audioId
	// Changes the start to 0 if it's not specified (undefined) or if it's any other falsy value
	start = (start ? start : 0)

	player._src = `/api/v1/audio/${audioId}?start=${start}`
	
	timelineDifference = start
	// Getting the audio's duration in seconds from the server and changing the timeline
	fetch(`/api/v1/audio/${audioId}?query=Duration`).then(result => result.json()).then(duration => {
		timeline.max = duration
		timelineEnd.textContent = `${Math.round(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, "0")}`
	})

	play()
}
// Starts the song from the position it was paused last time
// Note: This function is usually called by the play button
function resume() {
	playAudio(player.audio_id_playing, Math.round((player.seek() + timelineDifference)))
}
// This function is called by every item in the browser
function browserItemClick(element) {
	if (element.getAttribute("data-item-type") == "container") {
		containerPath.push([element.getAttribute("data-id"), element.getAttribute("data-title")])
		return refresh(element.getAttribute("data-id"))
	}

	playingAudioCover.src = `/api/v1/audio/${element.getAttribute("data-id")}?query=Cover`
	playAudio(element.getAttribute("data-id"))
}
// Refreshes the browser items
async function refresh(selectedContainerID = "") {
	containerPath = containerPath.slice(0, containerPath.map(item => item[0]).indexOf(selectedContainerID) + 1)

	resultContainerPath = ""
	for (const container of containerPath) {
		console.log(container)
		resultContainerPath += `<h1 onclick="refresh('${container[0]}')">${container[1]}</h1>`
	}

	containerPathElement.innerHTML = resultContainerPath

	const {containers: containerIDs, audios: audioIDs} = await fetch("/api/v1/view/" + selectedContainerID).then(response => response.json()).then(json => json)
	console.log(selectedContainerID)
	console.log(containerIDs, audioIDs)
	browser.innerHTML = ""
	for (const audioID of audioIDs) {
		queryAudioMetadata(audioID, "Title").then(
		title => queryAudioMetadata(audioID, "Singer").then(
		singer => {
		browser.innerHTML += `
		<button class="browser-item" data-item-type="audio" data-id="${audioID}" onclick='browserItemClick(this)'
			type="button" title="${title || "No title"}${singer ? ` by ${singer}` : ""}"
			oncontextmenu="return showFloatingMenuOnContext(event);"
		>
			<div
				style="--background : url('/api/v1/audio/${audioID}?query=Cover')"
			></div>
			<span title="${title}">${title}</span>
			<span title="${singer}">${singer}</span>
		</button>\n
		`
		}
		)
		)
	};

	for (const containerID of containerIDs) {
		queryContainerMetadata(containerID, "Title").then(
		title => {
		browser.innerHTML += `
		<button class="browser-item" data-item-type="container" data-id="${containerID}" onclick='browserItemClick(this)'
			data-title="${title}" type="button" title="${title || "No title"}"
			oncontextmenu="return showFloatingMenuOnContext(event);"
		>
			<div
				style="--background : url('/api/v1/container/${containerID}?query=Cover'); float: left;"
			></div>
			<img src="/web/images/container.svg" alt="album indicator"
				style="width: 2.5rem; aspect-ratio: 1/1; margin-left: calc(-2.5rem - .5rem); clear: right; position: relative; margin-top: .25rem"
			/>
			<span title="${title}">${title}</span>
			<span></span>
		</button>\n
		`
		}
		)
	};
}

refresh()

function queryAudioMetadata(audioID, query) {
	return fetch(`/api/v1/audio/${audioID}?query=${query}`).then(response => response.text())
}

function queryContainerMetadata(containerID, query) {
	return fetch(`/api/v1/container/${containerID}?query=${query}`).then(response => response.text())
}