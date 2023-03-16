<script>
	export let title = ""
	export let ID = ""
</script>

<button class="browser-item" data-item-type="container" data-id={ID} onclick={browserItemClick(this)}
			data-title={title} type="button" title="${title || "No title"}"
			on:contextmenu
		>
	<div
		style="--background : url('/api/v1/container/${ID}?query=Cover'); float: left;"
	></div>
	<img src="/web/images/container.svg" alt="album indicator"
		style="width: 2.5rem; aspect-ratio: 1/1; margin-left: calc(-2.5rem - .5rem); clear: right; position: relative; margin-top: .25rem"
	/>
	<span title="${title}">${title}</span>
	<span></span>
</button>