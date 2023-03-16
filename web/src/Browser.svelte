<script>
	import Audio from "./Audio.svelte"
	import Container from "./Container.svelte"

	export let path = ""

	async function refresh() {
		items = await fetch(`/api/v1/view/${path}`).then(response => response.json()).then(json => json)

		audioIDs = items.audios
		containerIDs = items.containers
	}

	$: refresh(path)

	async function getAudioInfo(ID) {
		const results = await Promise.allSettled(
			fetch(`/api/v1/container/${ID}?query=title`),
			fetch(`/api/v1/container/${ID}?query=singer`)
		)

		return {
			title: results[0].value || "",
			singer: results[1] || ""
		}
	}

	let audioIDs = []
	let containerIDs = []
</script>

<div id="browser">
	<div>
		<h1>&nbsp</h1>
	</div>
	<div id="browser-item-container">
		{@debug path}
		{#each containerIDs as containerID}
			{#await fetch(`/api/v1/container/${containerID}?query=title`).then(res => res.text())}
				<Container class="browser-item-loading"/>
			{:then title}
				<Container {title}/>
			{/await}
		{/each}

		{#each audioIDs as audioID}
			{#await getAudioInfo(audioID)}
				<Audio class="browser-item-loading"/>
			{:then info}
				<Audio {...info}/>
			{/await}
		{/each}
	</div>
</div>