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
				obj.color = "#ffffff77"
				
				if (obj.uiType == "button") {
					document.body.style.cursor = "pointer"
				}
				if (obj.uiType == "textbox") {
					document.body.style.cursor = "text"
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
			font: `bold ${height-6}px system-ui`,
			
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
	constructor(x, y, height, placeholderText, renderer) {
		this.x = x
		this.y = y
		this.sizeY = height
		this.isUI = true
		this.color = "#ffffff66"
		this.type = "rect"
		this.z = 1
		this.borderRadius = 5
		this.uiType = "textbox"
		this.focused = false
		this.value = ""
		
		
		this.onFocus = (e) => {
			this.focused = true
			this.label.color = "#ee9b00"
			
			if (this.value === "") {
				this.label.text = ""
			}
		}
		this.onUnfocus = (e) => {
			this.focused = false
			
			if (this.value === "") {
				this.label.color = "#ee9b0033"
				this.label.text = placeholderText 
			}
		}
		
		this.label = {
			type: "text",
			text: placeholderText,
			font: `bold ${height-6}px system-ui`,
			
			x: x+6,
			y: y+3,
			isUI: true,
			color: "#ee9b0033",
			z: 2
		}

		this.sizeX = renderer.measureText(this.label).width + 12
	}
}