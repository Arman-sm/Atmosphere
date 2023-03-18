<script>
	export let ID = ""
	export let isLoading = false
	
	export let browse = () => {}
	
	function browseWrap() {
		browse(ID)
	}

	let title = ""

	$: fetch(`/api/v1/container/${ID}?query=Title`).then(res => res.text().then(txt => title = txt))
</script>

<style>
	.containerCover {
		float: left;
	}
</style>

<button class="browserItem" class:browserItemLoading={isLoading} data-item-type="container" data-id={ID} on:click={browseWrap}
			data-title={title} type="button" title={title || "No title"}
			on:contextmenu 
		>
	<div class="browserItemCover containerCover" style="--background: url(/api/v1/container/{ID}?query=Cover)"
	></div>
	<img src="./images/container.svg" alt="album indicator"
		style="width: 2.5rem; aspect-ratio: 1/1; margin-left: calc(-2.5rem - .5rem); clear: right; position: relative; margin-top: .25rem"
	/>
	<span title={title}>{title}</span>
	<span></span>
</button>