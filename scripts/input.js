class Input {
	constructor() {
		this.keys = new Array(500).fill(false)
		this.mouse = {x: 0, y: 0}
		
		window.addEventListener("mousemove", (e) => {this.mouse.x = e.clientX, this.mouse.y = e.clientY})
		window.addEventListener("keydown", (e) => {this.keys[e.keyCode] = true})
		window.addEventListener("keyup", (e) => {this.keys[e.keyCode] = false})
	}
}