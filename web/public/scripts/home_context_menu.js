const menu = document.getElementById("context-menu")

let isMouseDown = false

document.body.onmouseup = event => {isMouseDown = false; if (event.target !== menu) {menu.classList.toggle("invisible", true)}}
menu.onmouseup = event => {event.target.click(); menu.classList.toggle("invisible", true)}

function showMenu(top, left, ID, borderRadius, height, width, type) {
	menu.style.top = top + "px"
	menu.style.left = left + "px"
	menu.style.borderRadius = borderRadius
	menu.style.height = height
	menu.style.width = width
	
	menu.setAttribute("data-id", ID)
	menu.setAttribute("data-item-type", type)
	
	menu.classList.toggle("invisible", false)
}

function showFloatingMenuOnContext(event) {
	if (event.ctrlKey) return
	event.preventDefault()
	const ID = event.target.getAttribute("data-id") || event.target.parentElement.getAttribute("data-id")
	const type = event.target.getAttribute("data-id") || event.target.parentElement.getAttribute("data-item-type")
	showMenu(event.clientY, event.clientX, ID, "0.75rem", "auto", "auto", type)
}

// function showContextOnElement(element) {
// 	const { height, width, borderRadius } = getComputedStyle(element)
// 	const { x, y } = element.getBoundingClientRect()
// 	showMenu(x, y, element.getAttribute("data-id"), borderRadius, height, width)
// }