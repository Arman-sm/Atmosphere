<script>
  import { onMount } from "svelte"

let timeline, timelineEnd, timelineState, pausePlayButton
export let playingAudioCover

let timelineValue = 0

import { Howl } from "./Howler.js"

// Difference between audio start read position (player.seek()) and the timeline
let timelineDifference = 0
// ID of the set interval that updates the timeline's state every second
let timelineUpdaterID = 0

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
export function playAudio(audioId, start) {
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
onMount(() => {
	timeline.addEventListener("change", timelineUserChange)
})
function timelineUserChange() {
	console.log(timeline)
	playAudio(player.audio_id_playing, timelineValue)
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
</script>

<div id="music-control">
	<img src="./images/music.svg" alt="audio cover" on:error={this.src = 'web/images/music.svg'}
		bind:this={playingAudioCover}/>
	<div id="controller">
		<div class="flex flex-center">
			<button type="button" class="no-border" title="previous">
				<img src="./images/next.svg" style="rotate: 180deg;" class="unselectable" alt=""/>
			</button>
			<button type="button" class="no-border" bind:this={pausePlayButton}
				on:click={() => {if (window.player.playing()) {pause()} else {resume()}}} title="play/pause">
				<img src="./images/pause.svg" class="unselectable" alt=""/>
			</button>
			<button type="button" class="no-border" title="next">
				<img src="./images/next.svg" class="unselectable" alt=""/>
			</button>
		</div>
		<div id="timeline">
			<span  bind:this={timelineState}>0:00</span>
			<input bind:this={timeline} type="range" min="0" max="60" aria-label="timeline"
				on:change={timelineUserChange} bind:value={timelineValue}/>
			<span  bind:this={timelineEnd}>0:00</span>
		</div>
	</div>
</div>