<script>
	import Audio from "./Audio.svelte"
	import Container from "./Container.svelte"

	export let onBrowse = () => {}
	export let playAudio = () => {}

	export let onContextMenu = () => {

	}
	
	export let viewID = ""

	async function refresh() {
		const items = await fetch(`/api/v1/view/${viewID}`).then(response => response.json()).then(json => json)

		audioIDs     = items.audios
		containerIDs = items.containers
	}

	$: refresh(viewID)

	function browseByID(ID) {
		viewID = ID
		onBrowse(ID)
	}

	let audioIDs = []
	let containerIDs = []
</script>

<div class="baseBrowser">
	{#each containerIDs as containerID}
		<Container isLoading={true} on:contextmenu={onContextMenu} ID={containerID} browse={browseByID}/>
	{/each}
	{#each audioIDs as audioID}
		<Audio     isLoading={true} on:contextmenu={onContextMenu} ID={audioID} on:click={() => playAudio(audioID)}/>
	{/each}
</div>