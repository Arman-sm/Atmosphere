<script>
	export let ID = ""
	export let isLoading = true
	
	let title = ""
	let singer = ""

	async function updateInfo(ID) {
		const results = await Promise.allSettled([
			fetch(`/api/v1/audio/${ID}?query=Title` ).then(res => res.text()),
			fetch(`/api/v1/audio/${ID}?query=Singer`).then(res => res.text()),
		])

		title  = results[0].value || ""
		singer = results[1].value || ""
	}

	$: updateInfo(ID)
</script>

<button class="browserItem" class:browserItemLoading={isLoading} data-item-type="audio" data-id={ID} on:click
			type="button" title={(title || "No title") + (singer ? ` by ${singer}` : "")}
			on:contextmenu
	>
	<div
		style="--background : url(/api/v1/audio/{ID}?query=Cover)"
	></div>
	<span {title}>{title}</span>
	<span title={singer}>{singer}</span>
</button>