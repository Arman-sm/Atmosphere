const menu = document.getElementById("context-menu")

let isMouseDown = false

document.body.onmouseup = event => {isMouseDown = false; if (event.target !== menu) {menu.classList.toggle("invisible", true)}}
menu.onmouseup = event => {event.target.click(); menu.classList.toggle("invisible", true)}

function showMenu(top, left, audioID, borderRadius, height, width) {
	menu.style.top = top + "px"
	menu.style.left = left + "px"
	menu.style.borderRadius = borderRadius
	menu.style.height = height
	menu.style.width = width
	
	menu.setAttribute("data-id", audioID)
	
	menu.classList.toggle("invisible", false)
}

function showFloatingMenuOnContext(event) {
	if (event.ctrlKey) return
	event.preventDefault()
	showMenu(event.clientY, event.clientX, event.target.getAttribute("data-id") || event.target.parentElement.getAttribute("data-id"), "0.75rem", "auto", "auto")
}

function showContextOnElement(element) {
	const { height, width, borderRadius } = getComputedStyle(element)
	const { x, y } = element.getBoundingClientRect()
	showMenu(x, y, element.getAttribute("data-id"), borderRadius, height, width)
}