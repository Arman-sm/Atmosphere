const uploadForm = document.getElementById("upload-page")
const nextButton = document.getElementById("upload-next")
const uploadPictureGraphic = document.getElementById("upload-picture-graphic")
const uploadPicture = document.getElementById("upload-picture")
const uploadTitle = document.getElementById("upload-title")
const uploadSinger = document.getElementById("upload-singer")
const uploadFormat = document.getElementById("upload-format")

const acceptedFormats = [
	'mp3', 'mpeg', 'opus', 'ogg', 'oga', 'wav', 'aac', 'caf', 'm4a', 'mp4','weba', 'webm', 'dolby', 'flac'
]

function toDataURI(file) {
	return URL.createObjectURL(file)
}

function capitalizeFirstChars(value) {
	return value
		.split(" ")
		.map(word => word[0].toUpperCase() + word.slice(1).toLowerCase())
		.join(" ")
}

function validateFile(dataTransfer) {
	if (dataTransfer.items[0].kind !== "file") {
		alert("The item that you entered is not a file.")
		return false
	}
	if (dataTransfer.items.length !== 1) {
		alert("You can only enter one file, multiple were entered.")
		return false
	}
	if (!acceptedFormats.includes(dataTransfer.files[0].name.split(".")[1])) {
		alert("The format of the file you entered is not supported")
		return false
	}
	return true
}

function fileDropForUpload(event) {
	event.preventDefault()
	if (validateFile(event.dataTransfer)) {
		document.getElementById("upload-audio-file-input").files = event.dataTransfer.files
	}
}

function uploadPage() {
	for (element of uploadForm.children) {
		element.classList.toggle("invisible")
	}
	uploadForm.classList.toggle('height-auto')
	uploadForm.classList.toggle('width-auto')
}

function fillUploadForm(file) {
	new jsmediatags.Reader(file).read({
		onSuccess: async metadata => {
			const { title, artist, picture } = metadata.tags

			uploadFormat.value = file.name.split(".").at(-1)

			if (title) {
				uploadTitle.value = capitalizeFirstChars(title.trim().slice(0, 50))
			}
			
			if (artist) {
				uploadSinger.value = capitalizeFirstChars(artist.trim().slice(0, 50))
			}
			if (picture) {
				const dt = new DataTransfer()
				dt.items.add(new File(
					[new Uint8Array(picture.data)],
					`cover.${picture.format.split("/")[1]}`,
					{
						type : picture.format
					}
				))
				uploadPicture.files = dt.files
				uploadPictureGraphic.src = toDataURI(uploadPicture.files[0])
			} else {
				uploadPictureGraphic.src = "/web/images/music.svg"
			}
		}
	})
}

nextButton.addEventListener("click", uploadPage)