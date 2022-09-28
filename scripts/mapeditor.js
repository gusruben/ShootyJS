var lastEditorDownPos = {x: 0, y: 0}
var editorDown = false
var dragging = false
var mapEditorElements = []
var mapEditorSelected
var placingBlockHighlight = {type: "rect", x: 0, y: 0, sizeX: 0, sizeY: 0, color: "#00374d77", disabled: true, z: 10}
var placingSpawnHighlight = {type: "rect", x: 0, y: 0, sizeX: 20, sizeY: 45, disabled: true, z: 10}
var placingSpawn = false
var readyToPlaceSpawn = false
var placingSpawnType
renderer.addToScene("MapEditor", placingBlockHighlight)
renderer.addToScene("MapEditor", placingSpawnHighlight)
const snap = 50

renderer.addToScene("MapEditor", new Button(10, 10, 30, "Back", renderer, () => {
	renderer.switchScene("MainMenu")
}))
renderer.addToScene("MapEditor", new Button(10, 50, 30, "Save", renderer, () => {
	let compressed = Util.LZWcompress(JSON.stringify(mapEditorElements))
	
	let file = new Blob([compressed])
	let a = document.createElement("a")	
	let url = URL.createObjectURL(file)
	a.href = url
	a.download = "map.tmf"
	document.body.appendChild(a)
	a.click()
	setTimeout(function() {
		document.body.removeChild(a)
		window.URL.revokeObjectURL(url) 
	}, 0)
}))
renderer.addToScene("MapEditor", new Button(10, 90, 30, "Load", renderer, () => {
	let input = document.createElement('input')
	input.type = 'file'
	
	input.onchange = e => { 
		let file = e.target.files[0]
		let reader = new FileReader()
		reader.readAsText(file, 'UTF-8')

		reader.onload = readerEvent => {
			for (const obj of mapEditorElements) {
				renderer.removeFromScene(obj)
			}
			
			mapEditorElements = JSON.parse(Util.LZWdecompress(readerEvent.target.result.split(",")))
			
			for (const obj of mapEditorElements) {
				renderer.addToScene("MapEditor", obj)
			}
		}
	}
	
	input.click()
}))
renderer.addToScene("MapEditor", new Button(10, 130, 30, "Red Spawn", renderer, () => {
	if (placingSpawn) {return}
	
	placingSpawnHighlight.disabled = false
	readyToPlaceSpawn = true
	placingSpawnType = "red"
	placingSpawnHighlight.color = "#ee9b0077"
}))
renderer.addToScene("MapEditor", new Button(10, 170, 30, "Blue Spawn", renderer, () => {
	if (placingSpawn) {return}
	
	placingSpawnHighlight.disabled = false
	readyToPlaceSpawn = true
	placingSpawnType = "blue"
	placingSpawnHighlight.color = "#0a939677"
}))

renderer.addToScene("MapEditor", {
	type: "line",
	x1: 0,
	x2: 0,
	y1: 10000,
	y2: -10000,
	width: 5,
	z: 30,
	color: "#ffffff88"
})
renderer.addToScene("MapEditor", {
	type: "line",
	x1: 10000,
	x2: -10000,
	y1: 0,
	y2: 0,
	width: 5,
	z: 30,
	color: "#ffffff88"
})

window.addEventListener("mousedown", (e) => {
	if (renderer.scene == "MapEditor") {
		if (e.clientX < 100) {return}
		
		let gamePos = Util.uiToGamePosition({x: e.clientX, y: -e.clientY}, renderer)
		lastEditorDownPos = {x: Util.snap(gamePos.x, snap), y: Util.snap(gamePos.y, snap)}
		editorDown = true
		dragging = false
		mapEditorSelected ? mapEditorSelected.color = "#00374d" : 0
		mapEditorSelected = undefined
	}
})
window.addEventListener("mousemove", (e) => {
	if (renderer.scene == "MapEditor") {
		if (e.clientX < 100) {return}
		
		if (editorDown && !dragging && Math.sqrt((e.clientX-lastEditorDownPos.x)**2+(e.clientY-lastEditorDownPos.y)**2) > snap/2) {
			dragging = true
			placingBlockHighlight.disabled = false
		}
		if (editorDown && dragging) {
			let gamePos = Util.uiToGamePosition({x: e.clientX, y: -e.clientY}, renderer)
			let sizeX = Math.abs(Util.snap(gamePos.x, snap) - lastEditorDownPos.x)
			let sizeY = Math.abs(Util.snap(gamePos.y, snap) - lastEditorDownPos.y)
			let pos = {x: Math.min(lastEditorDownPos.x, Util.snap(gamePos.x, snap)) + sizeX/2, y: Math.min(lastEditorDownPos.y, Util.snap(gamePos.y, snap)) + sizeY/2}
			
			placingBlockHighlight.x = pos.x
			placingBlockHighlight.y = pos.y
			placingBlockHighlight.sizeX = sizeX
			placingBlockHighlight.sizeY = sizeY
		}
	}
})
window.addEventListener("mouseup", (e) => {
	if (renderer.scene == "MapEditor") {
		let gamePos = Util.uiToGamePosition({x: e.clientX, y: -e.clientY}, renderer)

		if (!dragging || Math.abs(Util.snap(gamePos.x, snap) - lastEditorDownPos.x) < 0.1) {
			if (placingSpawn) {
				let play = {
					type: "rect",
					mapType: `${placingSpawnType} spawn`,
					sizeX: 20,
					sizeY: 45,
					x: Util.snap(gamePos.x, snap),
					y: Util.snap(gamePos.y, snap),
					color: placingSpawnType == "red" ? "#ee9b00" : "#0a9396"
				}
				
				placingSpawnHighlight.disabled = true
				placingSpawn = false
				renderer.addToScene("MapEditor", play)
				mapEditorElements.push(play)
			} else {
				if (readyToPlaceSpawn) {
					placingSpawn = true
					readyToPlaceSpawn = false
				} else {
					mapEditorSelected ? mapEditorSelected.color = "#00374d" : 0
					mapEditorSelected = undefined
					for (const obj of mapEditorElements) {
						if (Util.pointInRect(gamePos, obj)) {
							mapEditorSelected = obj
							obj.color = "#77374d"
							break
						}
					}
				}
			}
		} else {
			let sizeX = Math.abs(Util.snap(gamePos.x, snap) - lastEditorDownPos.x)
			let sizeY = Math.abs(Util.snap(gamePos.y, snap) - lastEditorDownPos.y)
			let pos = {x: Math.min(lastEditorDownPos.x, Util.snap(gamePos.x, snap)) + sizeX/2, y: Math.min(lastEditorDownPos.y, Util.snap(gamePos.y, snap)) + sizeY/2}
			
			let block = {
				type: "rect",
				mapType: "block",
				x: pos.x,
				y: pos.y,
				sizeX: sizeX,
				sizeY: sizeY,
				color: "#00374d",
				z: 1
			}
			
			let valid = true
			
			for (const obj of mapEditorElements) {
				if (Util.rectInRect(obj, block)) {
					valid = false
					break
				}
			}
			
			if (valid) {
				renderer.addToScene("MapEditor", block)
				mapEditorElements.push(block)
			}
		}
		editorDown = false
		dragging = false
		placingBlockHighlight.disabled = true
	}
})
window.addEventListener("keydown", e => {
	if (renderer.scene == "MapEditor") {
		if (e.keyCode === 8 || e.keyCode === 46) {
			if (!mapEditorSelected) {return}
			
			renderer.removeFromScene(mapEditorSelected)
			mapEditorElements.splice(mapEditorElements.indexOf(mapEditorSelected), 1)
		}
	}
})