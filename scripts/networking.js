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
			players[mes.id].lmx = mes.x
			players[mes.id].lmy = mes.y
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
			addPlayer(mes)
		}
		else if (type == "player left") {
			renderer.removeFromScene(players[mes.id])
			renderer.removeFromScene(players[mes.id].weapon)
			renderer.removeFromScene(players[mes.id].nametag)
			delete players[mes.id]

			if (Object.values(players).length < 2) {
				playerWait.text = "Waiting for player to join..."
				renderer.switchScene("MainMenu")
			}
		}
		else if (type == "start") {
			map = JSON.parse(Util.LZWdecompress(mes.map.split(",")))
			for (const obj of map) {
				if (obj.mapType == "block") {
					renderer.addToScene("Game", obj)
				}
			}

			for (const id in players) {
				let spawn = map.filter(a => a.mapType == `${players[id].team} spawn`)[mes.spawns[id]]
				players[id].x = spawn.x
				players[id].y = spawn.y
				players[id].lmx = spawn.x
				players[id].lmy = spawn.y
				players[id].alive = true
				players[id].disabled = false
				players[id].nametag.disabled = false
				players[id].weapon.disabled = false
			}
			
			endRoundMessage.disabled = true
			if (renderer.scene !== "Game") {
				renderer.switchScene("Game")
			}
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

				for (const kill of killFeed) {
					kill.y += 28
					kill.label.y += 28
				}

				let bounder = {
					type: "rect",
					x: 20,
					y: 20,
					isUI: true,
					sizeX: 0,
					sizeY: 24,
					color: "#ffffff77",
					borderRadius: 4,
					z: 60,
					stroke: player == players[mes.killer] ? "green" : (player == players[mes.killed] ? "red" : undefined),
					strokeWidth: 3,
					ticks: 400,
					label: {
						type: "text",
						text: `${players[mes.killer].name} 💀 ${players[mes.killed].name}`,
						x: 25,
						y: 22,
						isUI: true,
						font: "bold 20px system-ui",
						z: 61,
						ticks: 400
					}
				}
				bounder.sizeX = renderer.measureText(bounder.label).width + 10

				renderer.addToScene("Game", bounder)
				renderer.addToScene("Game", bounder.label)

				killFeed.push(bounder)
			}
		} else if (type == "begin end round") {
			endRoundMessage.disabled = false
			endRoundMessage.text = mes.winner == player.team ? "Round Won" : "Round Lost"
		}
		else if (type == "uuid") {
			players[mes.id] = player
			player.id = mes.id
			player.team = mes.team
			player.name = mes.name

			for (const ply of mes.players) {
				addPlayer(ply)
			}

			if (mes.players < 2) {
				playerWait.text = "Waiting for player to join..."
			} else {
				map = JSON.parse(Util.LZWdecompress(mes.map.split(",")))
				for (const obj of map) {
					if (obj.mapType == "block") {
						renderer.addToScene("Game", obj)
					}
				}

				renderer.switchScene("Game")
				let plrs = Object.values(players).filter(a => a.alive)
				player.spectating = plrs[Math.floor(Math.random()*plrs.length)]
			}
		} else if (type == "waiting for map") {
			playerWait.text = `Waiting for Server to Load Map...`
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

        players = {}
	})
})
renderer.addToScene("MainMenu", startButton)