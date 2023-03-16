<script>
	export let title = ""
	export let singer = ""
	export let ID = ""
</script>

<button class="browser-item" data-item-type="audio" data-id="${ID}" on:click={browserItemClick(this)}
			type="button" title="${title || "No title"}${singer ? ` by ${singer}` : ""}"
			on:contextmenu
	>
	<div
		style="--background : url('/api/v1/audio/${ID}?query=Cover')"
	></div>
	<span {title}>${title}</span>
	<span title="${singer}">${singer}</span>
</button>