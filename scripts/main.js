const canvas = document.querySelector("#canvas")
const ctx = canvas.getContext("2d")

const renderer = new Renderer(ctx, canvas)

const input = new Input()

const player = new Player()
var players = {}

renderer.addScene("Game")
renderer.addScene("MainMenu", input)
renderer.addScene("MapEditor", input)
renderer.switchScene("MainMenu")

const preformanceMode = false

var ws
var map

function addPlayer(mes) {
	let np = new Player()

	np.weapon = {
		x: 0,
		y: 0,
		type: "rect",
		sizeX: 10,
		sizeY: 30,
		rotation: 0,
		color: "#bb3e03",
		z: 3,
		lastShotTick: -Infinity,
		disabled: !mes.alive
	}
	np.nametag = {
		x: 0,
		y: 0,
		type: "text",
		text: mes.name,
		font: "bold 20px system-ui",
		z: 50,
		disabled: !mes.alive
	}
	
	np.disabled = !mes.alive
	np.alive = mes.alive
	np.team = mes.team
	np.id = mes.id
	np.name = mes.name
	np.lmx = 0
	np.lmy = 0
	
	if (np.team != player.team) {
		np.weapon.color = "#94d2bd"
		np.color = "#0a9396"
	}

	players[mes.id] = np

	renderer.addToScene("Game", np)
	renderer.addToScene("Game", np.nametag)
	renderer.addToScene("Game", np.weapon)
}
 
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
var killFeed = []


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
	lastShotTick: -Infinity,
	disabled: true
}
player.nametag = {
	x: 0,
	y: 0,
	type: "text",
	text: "",
	font: "bold 20px system-ui",
	z: 50,
	disabled: true
}
player.alive = false
player.disabled = true

renderer.addToScene("Game", player.nametag)
renderer.addToScene("Game", player.weapon)
renderer.addToScene("Game", player)
renderer.addToScene("MainMenu", title)
renderer.addToScene("MainMenu", mapEditorButton)
renderer.addToScene("MainMenu", cancelStartButton)
renderer.addToScene("MainMenu", nameBox)
renderer.addToScene("Game", crosshair)
renderer.addToScene("MainMenu", playerWait)
renderer.addToScene("Game", endRoundMessage)

shooting = false

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

			Util.pointToObject(player.weapon, Util.uiToGamePosition(crosshair, renderer))
			Util.lerpObject(renderer.activeScene.cam, player, 0.05)

			ws.send(JSON.stringify({type: "update move", mes: {x: player.x, y: player.y, rot: player.weapon.rotation}}))
		} else {
			if (player.spectating) {
				Util.lerpObject(renderer.activeScene.cam, player.spectating, 0.05)
			}
		}

		if (input.keys[32] && !shooting) {
			shooting = true
			ws.send(JSON.stringify({type: "start shot"}))
		} 
		else if (!input.keys[32] && shooting) {
			shooting = false
			ws.send(JSON.stringify({type: "stop shot"}))
		}

		endRoundMessage.x = renderer.activeScene.cam.x - renderer.measureText(endRoundMessage).width/2
		endRoundMessage.y = -renderer.activeScene.cam.y - 40

		for (const uid in players) {
			if (players[uid] != player) {
				Util.lerpObject(players[uid], {x: players[uid].lmx, y: players[uid].lmy}, 0.4)
			}
			Util.lerpObject(players[uid].weapon, players[uid], 0.4)

			if (!players[uid].nametag) {continue}
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
	
	requestAnimationFrame(loop)
}

requestAnimationFrame(loop)