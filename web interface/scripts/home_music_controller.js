// The section when you van select audios
const browser = document.getElementById("browser-item-container")

const timeline = document.querySelector("#timeline > input[type=range]")
const timelineEnd = document.querySelector("#timeline > :nth-child(3)")
const timelineState = document.querySelector("#timeline > :nth-child(1)")
const pausePlayButton = document.querySelector("#controller button:nth-child(2) > img")
const playingAudioCover = document.querySelector("#music-control > img")
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
	playingAudioCover.src = `/api/v1/audio/${element.getAttribute("data-audio-id")}?query=Cover`
	playAudio(element.getAttribute("data-audio-id"))
}
// Refreshes the browser items
async function refresh() {
	const audios = await fetch("/api/v1/audios").then(response => response.json()).then(json => json)
	console.log(audios)
	browser.innerHTML = ""
	for (const audio of audios) {
		const title = await queryAudioMetadata(audio, "Title")
		const singer = await queryAudioMetadata(audio, "Singer")
		browser.innerHTML += `
		<button class="browser-item" data-item-type="audio" data-audio-id="${audio}" onclick='browserItemClick(this)'
			type="button" title="${title || "No title"}${singer ? ` by ${singer}` : ""}"
			oncontextmenu="return showFloatingMenuOnContext(event);"
		>
			<div
				style="--background : url('/api/v1/audio/${audio}?query=Cover')"
				onerror="this.src = 'web/images/music.svg', this.onerror = undefined"
			></div>
			<span title="${title}">${title}</span>
			<span title="${singer}">${singer}</span>
		</button>\n
		`
	};
}

refresh()

function queryAudioMetadata(audioID, query) {
	return fetch(`/api/v1/audio/${audioID}?query=${query}`).then(response => response.text())
}
