<script>
	import BaseBrowser from "./BaseBrowser.svelte"

	export let onContextMenu
	export let viewID = ""

	export let playAudio = () => {}

	let path = [{ID: "", title: ""}]

	function updatePath(ID) {
		path = path.slice(0, path.map(item => item.ID).indexOf(ID) + 1)
		viewID = ID
	}

	async function dive(ID) {
		path.push({ID: ID, title: await fetch(`/api/v1/container/${ID}?query=Title`).then(res => res.text())})
		viewID = ID
	}

	$: updatePath(viewID)
</script>

<div class="browser">
	<div class="browserPath">
		{#each path as container}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<h1 on:click={() => updatePath(container.ID)}>{container.title}</h1>
		{/each}
	</div>
	<BaseBrowser {viewID} {onContextMenu} onBrowse={dive} {playAudio}/>
</div>