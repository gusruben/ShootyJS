const canvas = document.querySelector("#canvas")
const ctx = canvas.getContext("2d")

const renderer = new Renderer(ctx, canvas)

const input = new Input()

const maxPlayers = 12

const player = new Player()
var unasignedPlayers = []
for (let i=0; i<maxPlayers-1; i++) {unasignedPlayers.push(new Player())}
var players = {}

renderer.addScene("Game")
renderer.addScene("MainMenu", input)
renderer.addScene("MapEditor", input)
renderer.switchScene("MainMenu")

const preformanceMode = false

var ws
var map

const title = {
	type: "text",
	x: 100,
	y: 100,
	text: "Epic game!!!111!!", 
	isUI: true,
	color: "#ee9b00",
	font: "bold 60px system-ui"
}
const playerWait = {
	type: "text",
	x: 100,
	y: 200,
	text: "", 
	isUI: true,
	color: "#ee9b00",
	font: "bold 40px system-ui",
	disabled: true
}
const nameBox = new TextBox(100, 320, 50, 300, "Name...", renderer)
const mapEditorButton = new Button(100, 260, 50, "Map Editor", renderer, () => {
	renderer.switchScene("MapEditor")
})
const cancelStartButton = new Button(100, 260, 50, "Cancel", renderer, () => {
	ws.close()
})
const endRoundMessage = {
	type: "text",
	text: "",
	x: 0,
	y: 0,
	font: "bold 80px system-ui",
	disabled: true,
	z: 75
}
cancelStartButton.disabled = true
cancelStartButton.label.disabled = true
const startButton = new Button(100, 200, 50, "Start", renderer, () => {
	if (nameBox.value == "") {return}
	
	ws = new WebSocket(`ws://${location.hostname}:3000`)
	ws.addEventListener("message", (e) => {
		let raw = JSON.parse(e.data)
		let type = raw.type
		let mes = raw.mes
		
		if (type == "player update") {			
			players[mes.id].x = mes.x
			players[mes.id].y = mes.y
			players[mes.id].weapon.rotation = mes.rot
			players[mes.id].team = mes.team
		}
		else if (type == "shot") {
			let tracer = {
				x1: mes.hit.x2,
				y1: mes.hit.y2,
				x2: mes.hit.x1,
				y2: mes.hit.y1,
				width: 3,
				type: "line",
				ticks: 6,
				fade: true,
				z: 2
			}
			
			if (!preformanceMode) {
				tracer.listColor = [233, 216, 166, 80]

				if (mes.hitId) {
					for (let i=0; i<4; i++) {
						let rot = Math.random()*5
						
						players[mes.id].weapon.x += -Math.sin(players[mes.id].weapon.rotation)*2
						players[mes.id].weapon.y -= Math.cos(players[mes.id].weapon.rotation)*2
						
						renderer.addToScene("Game", {
							type: "circ",
							x: (Math.sin(rot))*(Math.random()*10+10)+mes.hit.x2,
							y: (Math.cos(rot))*(Math.random()*10+10)+mes.hit.y2,
							rad: Math.random()*3+24,
							listColor: [116, 2, 1, 50],
							fade: true,
							ticks: 40,
							z: 5
						})
					}
				} else {
					for (let i=0; i<7; i++) {
						let rot = Math.random()*5
						
						players[mes.id].weapon.x += -Math.sin(players[mes.id].weapon.rotation)*2
						players[mes.id].weapon.y -= Math.cos(players[mes.id].weapon.rotation)*2
						
						renderer.addToScene("Game", {
							x2: mes.hit.x2,
							y2: mes.hit.y2,
							x1: (Math.sin(rot))*(Math.random()*10+20)+mes.hit.x2,
							y1: (Math.cos(rot))*(Math.random()*10+20)+mes.hit.y2,
							listColor: [233, 216, 166, 40],
							initTrans: 30,
							width: 2,
							type: "line",
							ticks: 8,
							trace: true,
							traceWidth: 8,
							z: 2
						})
					}
				}
			} else {
				tracer.color = "rgba(223, 216, 166, 80%)"
			}
			
			renderer.addToScene("Game", tracer)
		}
		else if (type == "player joined") {
			playerWait.text = `${mes}/${maxPlayers} Waiting for Players...`
		}
		else if (type == "start") {
			map = JSON.parse(Util.LZWdecompress(mes.map.split(",")))
			for (const obj of map) {
				if (obj.mapType == "block") {
					renderer.addToScene("Game", obj)
				}
			}

			for (let i=0; i<maxPlayers-1; i++) {
				players[mes.players[i].id] = unasignedPlayers[i]
				unasignedPlayers[i].id = mes.players[i].id
				unasignedPlayers[i].team = mes.players[i].team
				unasignedPlayers[i].nametag.text = mes.players[i].name
				
				if (unasignedPlayers[i].team != player.team) {
					unasignedPlayers[i].weapon.color = "#94d2bd"
					unasignedPlayers[i].color = "#0a9396"
				}
				
				renderer.addToScene("Game", players[mes.players[i].id])
			}

			for (const id in players) {
				let spawn = map.filter(a => a.mapType == `${players[id].team} spawn`)[mes.spawns[id]]
				players[id].x = spawn.x
				players[id].y = spawn.y
				players[id].alive = true
				players[id].disabled = false
				players[id].nametag.disabled = false
				players[id].weapon.disabled = false
			}
			
			endRoundMessage.disabled = true
			renderer.switchScene("Game")
			renderer.activeScene.cam = {x: player.x, y: player.y}
		}
		else if (type == "died") {
			if (players[mes.killed].alive) {
				players[mes.killed].disabled = true
				players[mes.killed].alive = false
				players[mes.killed].nametag.disabled = true
				players[mes.killed].weapon.disabled = true

				if (players[mes.killed] == player || players[mes.killed] == player.spectating) {
					player.spectating = players[mes.killer]
				}
			}
		} else if (type == "begin end round") {
			endRoundMessage.disabled = false
			endRoundMessage.text = mes.winner == player.team ? "Round Won" : "Round Lost"
		}
		else if (type == "player left") {
			renderer.switchScene("MainMenu")
			playerWait.text = `${mes}/${maxPlayers} Waiting for Players...`
		}
		else if (type == "uuid") {
			players[mes.id] = player
			player.id = mes.id
			player.team = mes.team
		} else if (type == "waiting for map") {
			playerWait.text = `${maxPlayers}/${maxPlayers} Waiting for Server to Load Map...`
		} else if (type == "name") {
			players[mes.id].name = mes.name
		}
	})
	ws.addEventListener("open", () => {
		startButton.disabled = true
		startButton.label.disabled = true
		playerWait.disabled = false
		mapEditorButton.disabled = true
		mapEditorButton.label.disabled = true
		cancelStartButton.disabled = false
		cancelStartButton.label.disabled = false
		nameBox.disable()
		
		player.nametag.text = nameBox.value
		ws.send(JSON.stringify({type: "join", mes: {name: nameBox.value}}))
		
	})
	ws.addEventListener("close", () => {
		renderer.switchScene("MainMenu")
		startButton.disabled = false
		startButton.label.disabled = false
		playerWait.disabled = true
		mapEditorButton.disabled = false
		mapEditorButton.label.disabled = false
		cancelStartButton.disabled = true
		cancelStartButton.label.disabled = true
		nameBox.enable()
	})
})
const crosshair = {
	x: 0,
	y: 0,
	rad: 20,
	color: "#e9d8a666",
	type: "circ",
	isUI: true,
	z: 100
}
player.weapon = {
	x: 0,
	y: 0,
	type: "rect",
	sizeX: 10,
	sizeY: 30,
	rotation: 0,
	color: "#bb3e03",
	z: 3,
	lastShotTick: -Infinity
}
player.nametag = {
	x: 0,
	y: 0,
	type: "text",
	text: "",
	font: "bold 20px system-ui",
	z: 50
}
player.alive = false
for (const unaPlayer of unasignedPlayers) {
	unaPlayer.weapon = {
		x: 0,
		y: 0,
		type: "rect",
		sizeX: 10,
		sizeY: 30,
		rotation: 0,
		color: "#bb3e03",
		z: 3,
		lastShotTick: -Infinity
	}
	unaPlayer.nametag = {
		x: 0,
		y: 0,
		type: "text",
		text: "",
		font: "bold 20px system-ui",
		z: 50
	}
	unaPlayer.alive = false
	
	renderer.addToScene("Game", unaPlayer.weapon)
	renderer.addToScene("Game", unaPlayer.nametag)
}

renderer.addToScene("Game", player.nametag)
renderer.addToScene("Game", player.weapon)
renderer.addToScene("Game", player)
renderer.addToScene("MainMenu", title)
renderer.addToScene("MainMenu", startButton)
renderer.addToScene("MainMenu", mapEditorButton)
renderer.addToScene("MainMenu", cancelStartButton)
renderer.addToScene("MainMenu", nameBox)
renderer.addToScene("Game", crosshair)
renderer.addToScene("MainMenu", playerWait)
renderer.addToScene("Game", endRoundMessage)

renderer.addPostProcessing("Game", (imageData) => {
	let halfHeight = imageData.height/2
	let halfWidth = imageData.width/2
	let invIMwidth = 1/imageData.width
	
	for (var i=0; i<imageData.data.length; i+=4) {
		let api = i/4
		let apx = api%imageData.width - halfWidth
		let apy = api*invIMwidth - halfHeight
		
		//imageData.data[i+0] += (Math.abs(apx)+Math.abs(apy)) * 128
	}	
})

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
		
		if (!dragging) {
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

function loop() {
	if (renderer.scene == "Game") {
		crosshair.x = input.mouse.x
		crosshair.y = -input.mouse.y
		
		if (player.alive) {
			player.handleMovement(input, renderer.dt)
			for (const obj of map) {
				if (obj.mapType == "block") {
					player.handleCollision(obj)
				}
			}
			ws.send(JSON.stringify({type: "update move", mes: {x: player.x, y: player.y, rot: player.weapon.rotation}}))
			
			Util.pointToObject(player.weapon, Util.uiToGamePosition(crosshair, renderer))
			Util.lerpObject(renderer.activeScene.cam, player, 0.05)
			
			if (input.keys[32] && renderer.tick - player.weapon.lastShotTick > 7) {	
				player.weapon.lastShotTick = renderer.tick
				let p = Util.uiToGamePosition(crosshair, renderer)
				
				let rotation = (Math.random()-0.5)/10
				let unrotatedX = (p.x-player.weapon.x)
				let unrotatedY = (p.y-player.weapon.y)
				
				let tracer = {
					x1: player.weapon.x,
					y1: player.weapon.y,
					x2: (unrotatedX*Math.cos(rotation)-unrotatedY*Math.sin(rotation))*50+player.weapon.x,
					y2: (unrotatedY*Math.cos(rotation)+unrotatedX*Math.sin(rotation))*50+player.weapon.y,
				}
				
				let hit
				let hitDis = Infinity
				
				for (const obj of map) {
					if (obj.mapType != "block") {continue}

					let res = Util.lineRectIntersect(tracer, obj)
					
					if (res.hit) {
						let dis = Math.sqrt((tracer.x1 - res.x1)**2 + (tracer.y1 - res.y1)**2)
						if (dis < hitDis) {
							hit = res
							hitDis = dis
						}
					}
				}
				
				if (hit) {
					tracer.x2 = hit.x1
					tracer.y2 = hit.y1
				}
				
				ws.send(JSON.stringify({type: "shot", mes: {x1: tracer.x1, y1: tracer.y1, x2: tracer.x2, y2: tracer.y2}}))
			}
		} else {
			if (player.spectating) {
				Util.lerpObject(renderer.activeScene.cam, player.spectating, 0.05)
			}
		}

		endRoundMessage.x = renderer.activeScene.cam.x - renderer.measureText(endRoundMessage).width/2
		endRoundMessage.y = -renderer.activeScene.cam.y - 40

		for (const uid in players) {
			if (!players[uid].nametag) {continue}
			
			Util.lerpObject(players[uid].weapon, players[uid], 0.4)
			players[uid].nametag.x = players[uid].x - renderer.measureText(players[uid].nametag).width/2
			players[uid].nametag.y = -players[uid].y - 45
		}
		
		document.body.style.cursor = "none"
	} else if (renderer.scene == "MapEditor") {
		if (input.keys[87]) {
			renderer.activeScene.cam.y += 10
		}
		if (input.keys[83]) {
			renderer.activeScene.cam.y -= 10
		}
		if (input.keys[68]) {
			renderer.activeScene.cam.x += 10
		}
		if (input.keys[65]) {
			renderer.activeScene.cam.x -= 10
		}
		
		let pos = Util.uiToGamePosition({x: input.mouse.x, y: -input.mouse.y}, renderer)
		placingSpawnHighlight.x = Util.snap(pos.x, snap)
		placingSpawnHighlight.y = Util.snap(pos.y, snap)
	}
	
	renderer.render()
	
	setTimeout(loop, 0)
}

requestAnimationFrame(loop)