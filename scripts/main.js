const canvas = document.querySelector("#canvas")
const ctx = canvas.getContext("2d")

const renderer = new Renderer(ctx, canvas)

const input = new Input()

const maxPlayers = 4

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

const title = {
	type: "text",
	x: 100,
	y: 100,
	text: "Placeholder Name", 
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
const testBox = new TextBox(100, 320, 50, "testdnaskda!!!", renderer)
const mapEditorButton = new Button(100, 260, 50, "Map Editor", renderer, () => {
	renderer.switchScene("MapEditor")
})
const cancelStartButton = new Button(100, 260, 50, "Cancel", renderer, () => {
	ws.close()
})
cancelStartButton.disabled = true
cancelStartButton.label.disabled = true
const startButton = new Button(100, 200, 50, "Start", renderer, () => {
	ws = new WebSocket("ws://localhost:3000")
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
				x1: mes.x2,
				y1: mes.y2,
				x2: mes.x1,
				y2: mes.y1,
				width: 3,
				type: "line",
				ticks: 6,
				fade: true,
				z: 2
			}
			
			if (!preformanceMode) {
				tracer.listColor = [233, 216, 166, 80]
				
				for (let i=0; i<7; i++) {
					let rot = Math.random()*5
					
					players[mes.id].weapon.x += -Math.sin(players[mes.id].weapon.rotation)*2
					players[mes.id].weapon.y -= Math.cos(players[mes.id].weapon.rotation)*2
					
					renderer.addToScene("Game", {
						x2: mes.x2,
						y2: mes.y2,
						x1: (Math.sin(rot))*(Math.random()*10+20)+mes.x2,
						y1: (Math.cos(rot))*(Math.random()*10+20)+mes.y2,
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
			} else {
				tracer.color = "rgba(223, 216, 166, 80%)"
			}
			
			renderer.addToScene("Game", tracer)
		}
		else if (type == "player joined") {
			playerWait.text = `${mes}/${maxPlayers} Waiting for Players...`
		}
		else if (type == "start") {
			for (let i=0; i<maxPlayers-1; i++) {
				players[mes[i].id] = unasignedPlayers[i]
				unasignedPlayers[i].id = mes[i].id
				unasignedPlayers[i].team = mes[i].team
				
				if (unasignedPlayers[i].team != player.team) {
					unasignedPlayers[i].weapon.color = "#94d2bd"
					unasignedPlayers[i].color = "#0a9396"
				}
				
				renderer.addToScene("Game", players[mes[i].id])
			}
			renderer.switchScene("Game")
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
	
	renderer.addToScene("Game", unaPlayer.weapon)
}

renderer.addToScene("Game", player.weapon)
renderer.addToScene("Game", player)
renderer.addToScene("MainMenu", title)
renderer.addToScene("MainMenu", startButton)
renderer.addToScene("MainMenu", mapEditorButton)
renderer.addToScene("MainMenu", cancelStartButton)
renderer.addToScene("MainMenu", testBox)
renderer.addToScene("Game", crosshair)
renderer.addToScene("MainMenu", playerWait)

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

const map = [
	{
		x: 30,
		y: 30,
		sizeX: 100,
		sizeY: 100,
		z: 0,
		type: "rect",
		color: "#00374d"
	}
]

for (const obj of map) {
	renderer.addToScene("Game", obj)
}

var lastEditorDownPos = {x: 0, y: 0}
var editorDown = false
var dragging = false
var mapEditorElements = []
var mapEditorSelected
var placingBlockHighlight = {type: "rect", x: 0, y: 0, sizeX: 0, sizeY: 0, color: "#00374d77", disabled: true, z: 10}
renderer.addToScene("MapEditor", placingBlockHighlight)
const snap = 50

renderer.addToScene("MapEditor", new Button(10, 10, 30, "Back", renderer, () => {
	renderer.switchScene("MainMenu")
}))

window.addEventListener("mousedown", (e) => {
	if (renderer.scene == "MapEditor") {
		lastEditorDownPos = {x: Util.snap(e.clientX, snap), y: Util.snap(e.clientY, snap)}
		editorDown = true
		dragging = false
		mapEditorSelected ? mapEditorSelected.color = "#00374d" : 0
		mapEditorSelected = undefined
	}
})
window.addEventListener("mousemove", (e) => {
	if (renderer.scene == "MapEditor") {
		if (editorDown && !dragging && Math.sqrt((e.clientX-lastEditorDownPos.x)**2+(e.clientY-lastEditorDownPos.y)**2) > snap/2) {
			dragging = true
			placingBlockHighlight.disabled = false
		}
		if (editorDown && dragging) {
			let sizeX = Math.abs(Util.snap(e.clientX, snap) - lastEditorDownPos.x)
			let sizeY = Math.abs(Util.snap(e.clientY, snap) - lastEditorDownPos.y)
			let pos = Util.uiToGamePosition({x: Math.min(lastEditorDownPos.x, Util.snap(e.clientX, snap)) + sizeX/2, y: -Math.min(lastEditorDownPos.y, Util.snap(e.clientY, snap)) - sizeY/2}, renderer)
			
			placingBlockHighlight.x = pos.x
			placingBlockHighlight.y = pos.y
			placingBlockHighlight.sizeX = sizeX
			placingBlockHighlight.sizeY = sizeY
		}
	}
})
window.addEventListener("mouseup", (e) => {
	if (renderer.scene == "MapEditor") {
		if (!dragging) {
			mapEditorSelected ? mapEditorSelected.color = "#00374d" : 0
			mapEditorSelected = undefined
			for (const obj of mapEditorElements) {
				if (Util.pointInRect(Util.uiToGamePosition({x: e.clientX, y: -e.clientY}, renderer), obj)) {
					mapEditorSelected = obj
					obj.color = "#77374d"
					break
				}
			}
		} else {
			let sizeX = Math.abs(Util.snap(e.clientX, snap) - lastEditorDownPos.x)
			let sizeY = Math.abs(Util.snap(e.clientY, snap) - lastEditorDownPos.y)
			let pos = Util.uiToGamePosition({x: Math.min(lastEditorDownPos.x, Util.snap(e.clientX, snap)) + sizeX/2, y: -Math.min(lastEditorDownPos.y, Util.snap(e.clientY, snap)) - sizeY/2}, renderer)
			
			let block = {
				type: "rect",
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
		if (e.keyCode = 8 || e.keyCode == 46) {
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
		
		player.handleMovement(input, renderer.dt)
		for (const obj of map) {
			player.handleCollision(obj)
		}
		ws.send(JSON.stringify({type: "update move", mes: {x: player.x, y: player.y, rot: player.weapon.rotation}}))
		
		for (const uid in players) {
			Util.lerpObject(players[uid].weapon, players[uid], 0.3)
		}
		
		Util.pointToObject(player.weapon, Util.uiToGamePosition(crosshair, renderer))
		Util.lerpObject(renderer.activeScene.cam, player, 0.02)
		
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
		
		document.body.style.cursor = "none"
	}
	
	renderer.render()
	
	setTimeout(loop, 0)
}

requestAnimationFrame(loop)