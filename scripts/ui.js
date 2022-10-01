class UIManager {
	constructor(input) {
		this.UIElements = []
		this.input = input
		this.focusedElement
	}
	
	update() {
		let i = this.UIElements.length
		document.body.style.cursor = "default"
		
		while (i--) {
			let obj = this.UIElements[i]
			if (obj.disabled) {continue}
			
			if (
				input.mouse.x > obj.x &&
				input.mouse.x < obj.x + obj.sizeX &&
				input.mouse.y > obj.y &&
				input.mouse.y < obj.y + obj.sizeY
			) {
				if (obj.uiType == "button") {
					document.body.style.cursor = "pointer"
					obj.color = "#ffffff77"
				}
				if (obj.uiType == "textbox") {
					document.body.style.cursor = "text"
					obj.color = "#ffffff55"
				}
			} else {
				obj.color = "#ffffff33"
			}
		}
	}
	
	mouseDown(e) {
		let i = this.UIElements.length
		
		while (i--) {
			let obj = this.UIElements[i]
			if (obj.disabled) {continue}
			
			if (
				e.clientX > obj.x &&
				e.clientX < obj.x + obj.sizeX &&
				e.clientY > obj.y &&
				e.clientY < obj.y + obj.sizeY
			) {
				if (obj.uiType == "button") {
					obj.onClick(e)
				}
				else if (obj.uiType == "textbox") {
					if (!obj.focused) {
						obj.onFocus(e)
					}
				}
			} else {
				if (obj.uiType == "textbox") {
					if (obj.focused) {
						obj.onUnfocus(e)
					}
				}
			}
		}
	} 
}

class Button {
	constructor(x, y, height, labelText, renderer, onClick = ()=>{}) {
		this.x = x
		this.y = y
		this.sizeY = height
		this.isUI = true
		this.color = "#ffffff33"
		this.type = "rect"
		this.z = 1
		this.borderRadius = 5
		this.uiType = "button"
		
		this.onClick = onClick
		
		this.label = {
			type: "text",
			text: labelText,
			fontSize: height-6,
			
			x: x+6,
			y: y+3,
			isUI: true,
			color: "#ee9b00",
			z: 2
		}

		this.sizeX = renderer.measureText(this.label).width + 12
	}
}

class TextBox {
	constructor(x, y, height, width, placeholderText, renderer) {
		this.x = x
		this.y = y
		this.sizeY = height
		this.sizeX = width
		this.isUI = true
		this.color = "#ffffff66"
		this.type = "rect"
		this.z = 1
		this.borderRadius = 5
		this.uiType = "textbox"
		this.focused = false
		this.value = ""
		
		window.addEventListener('keydown', (e) => {
			if (this.focused && e.key.length == 1 && /[a-zA-Z0-9]/.test(e.key)) {
				this.value += e.key
				this.label.text += e.key
				this.textHead.x1 = x + renderer.measureText(this.label).width + 10
				this.textHead.x2 = x + renderer.measureText(this.label).width + 10
			} else if (this.focused && e.key == "Backspace") {
				this.value = this.value.slice(0, -1)
				this.label.text = this.label.text.slice(0, -1)
				this.textHead.x1 = x + renderer.measureText(this.label).width + 10
				this.textHead.x2 = x + renderer.measureText(this.label).width + 10
			}
		})
		
		this.onFocus = (e) => {
			this.focused = true
			this.label.color = "#ee9b00"
			this.stroke = "#ee9b00"
			this.textHead.disabled = false
			
			if (this.value === "") {
				this.label.text = ""
			}
		}
		this.onUnfocus = (e) => {
			this.focused = false
			this.stroke = undefined
			this.textHead.disabled = true
			
			if (this.value === "") {
				this.label.color = "#ee9b0033"
				this.label.text = placeholderText
			}
		}
		
		this.label = {
			type: "text",
			text: placeholderText,
			fontSize: height-6,
			
			x: x+6,
			y: y+3,
			isUI: true,
			color: "#ee9b0033",
			z: 2
		}
		this.textHead = {
			type: "line",
			stroke: "white",
			width: 3,
			x1: x+10,
			y1: -y-5,
			x2: x+10,
			y2: -y-height+5,
			disabled: true,
			isUI: true,
			z: 3,
		}
		
		this.disable = () => {
			this.disabled = true
			this.label.disabled = true
		}
		this.enable = () => {
			this.disabled = false
			this.label.disabled = false
		}
	}
}