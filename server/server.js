const ws = require('ws')
const uuid = require('uuid')
const fs = require('fs');
const readline = require('readline')
const express = require('express')

const address = require('os').networkInterfaces()['Wi-Fi'].filter(a => a.family == "IPv4")[0].address

const app = express()
app.use("/", express.static(__dirname + "/../"))

app.listen(80, address, () => {
	console.log(`Listening on ${address}:${80}`)
})

const wss = new ws.WebSocketServer({ host: address, port: 3000 })
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})
rl.on('line', (input) => {
	let parsed = input.split(' ')
	let command = parsed[0]
	
	if (command == "map") {
		fs.readFile(`${__dirname}/maps/${parsed[1]}.tmf`, 'utf8', (err, data) => {
			map = data
			
			if (players.length == maxPlayers && map) {
				startGame()
			}
		})
	}
	if (command == "force_start") {
		startGame()
	}
})
function lineRectIntersect(line, rect) {		
	let xmax = rect.x+rect.sizeX/2
	let xmin = rect.x-rect.sizeX/2
	let ymax = rect.y+rect.sizeY/2
	let ymin = rect.y-rect.sizeY/2
	let x0 = line.x1
	let x1 = line.x2
	let y0 = line.y1
	let y1 = line.y2
	
	let computeOutCode = (x, y) => {
		let code = 0
		
		if (x < xmin) {
			code |= 1
		} 
		else if (x > xmax) {
			code |= 2
		}
		if (y < ymin) {
			code |= 4
		} 
		else if (y > ymax) {
			code |= 8
		}
		
		return code
	}

	let outcode0 = computeOutCode(x0, y0)
	let outcode1 = computeOutCode(x1, y1)
	let accept = false
	let normal = {x: 0, y: 0}

	while (true) {
		if (!(outcode0 | outcode1)) {
			accept = true;
			break;
		} else if (outcode0 & outcode1) {
			break;
		} else {
			let x, y
			let outcodeOut = outcode1 > outcode0 ? outcode1 : outcode0

			if (outcodeOut & 8) {
				x = x0 + (x1 - x0) * (ymax - y0) / (y1 - y0)
				y = ymax
			} else if (outcodeOut & 4) {
				x = x0 + (x1 - x0) * (ymin - y0) / (y1 - y0)
				y = ymin
			} else if (outcodeOut & 2) {
				y = y0 + (y1 - y0) * (xmax - x0) / (x1 - x0)
				x = xmax
			} else if (outcodeOut & 1) {
				y = y0 + (y1 - y0) * (xmin - x0) / (x1 - x0)
				x = xmin
			}

			if (outcodeOut == outcode0) {
				x0 = x
				y0 = y
				outcode0 = computeOutCode(x0, y0)
			} else {
				x1 = x
				y1 = y
				outcode1 = computeOutCode(x1, y1)
			}
		}
	}
	
	return {hit: accept, x1: x0, y1: y0, x2: x1, y2: y1}
}

var serverState = "waiting for players"
var players = []
var playersById = {}

var map

const maxPlayers = 12
var blues = 0
var reds = 0

function startGame() {
	console.log("Starting game!")
	
	let spawns = {}
	players.filter(a => a.team == "blue").map((a, index) => {spawns[a.id] = index})
	players.filter(a => a.team == "red").map((a, index) => {spawns[a.id] = index})

	for (const player of players) {
		player.x = 0
		player.y = 0
		player.sizeX = 20
		player.sizeY = 45
		player.rot = 0
		player.health = 100
		player.alive = true
		
		player.send(JSON.stringify({
			type: "start", 
			mes: {
				players: players.filter(a => a!=player).map( a => ({id: a.id, team: a.team, name: a.name}) ),
				map: map,
				spawns: spawns
			}
		}))
	}
	
	serverState = "playing"
}

wss.on('connection', (ws) => {
	ws.on('message', (raw) => {
		parsed = JSON.parse(raw)
		let type = parsed.type
		let mes = parsed.mes
		
		parsed.mes.id = ws.id
		
		if (type == "update move") {
			ws.x = mes.x
			ws.y = mes.y
			ws.rot = mes.rot
		}
		else if (type == "join") {			
			if (serverState == "waiting for players") {
				if (players.length < maxPlayers) {
					players.push(ws)
					
					if (reds > blues) {
						ws.team = "blue"
						blues++
					} else {
						ws.team = "red"
						reds++
					}
					
					ws.id = uuid.v4()
					ws.name = mes.name
					playersById[ws.id] = ws
					ws.send(JSON.stringify({type: "uuid", mes: {id: ws.id, team: ws.team}}))
					
					console.log(`(${mes.name}) Connected`)
				} else {
					ws.close()
					return
				}
				
				if (players.length == maxPlayers && map) {
					startGame()
				} else if (players.length < maxPlayers) {
					for (const player of players) {
						player.send(JSON.stringify({type: "player joined", mes: players.length}))
					}
				} else if (!map) {
					for (const player of players) {
						player.send(JSON.stringify({type: "waiting for map"}))
					}
					
					console.log("All players connected, waiting to load map...")
				}
			} else {
				ws.close()
				return
			}
		}
		else if (type == "shot") {
			let hitPlayerID
			let hit
			let hitDis = Infinity
			
			for (const player of players.filter(a => a.team != playersById[mes.id].team && a.alive)) {
				let res = lineRectIntersect(mes, player)
				
				if (res.hit) {
					let dis = Math.sqrt((mes.x1 - res.x1)**2 + (mes.y1 - res.y1)**2)
					if (dis < hitDis) {
						hit = res
						hitDis = dis
						hitPlayerID = player.id
					}
				}
			}
			
			if (hit) {
				mes.x2 = hit.x1
				mes.y2 = hit.y1

				playersById[hitPlayerID].health -= 22
				if (playersById[hitPlayerID].health <= 0) {
					playersById[hitPlayerID].alive = false
					for (const player of players) {
						player.send(JSON.stringify({type: "died", mes: {killed: playersById[hitPlayerID].id, killer: ws.id}}))
					}

					if (players.filter(a => a.team == "red" && a.alive).length <= 0) {
						for (const player of players) {
							player.send(JSON.stringify({type: "begin end round", mes: {winner: "blue"}}))
						}

						setTimeout(startGame, 2000)
					}
					if (players.filter(a => a.team == "blue" && a.alive).length <= 0) {
						for (const player of players) {
							player.send(JSON.stringify({type: "begin end round", mes: {winner: "red"}}))
						}

						setTimeout(startGame, 5000)
					}

				} else {
					playersById[hitPlayerID].send(JSON.stringify({type: "hit", mes: {health: playersById[hitPlayerID].health}}))
				}
			}

			for (const player of players) {
				player.send(JSON.stringify({type: "shot", mes: {hit: mes, id: mes.id, hitId: hitPlayerID}}))
			}
		}
	})
	
	ws.on('close', () => {
		players.splice(players.indexOf(ws), 1)
		delete playersById[ws.id]
		ws.team == "red" ? reds-- : blues--
		
		console.log(`(${ws.name}) Left the game`)
		
		if (players.length < maxPlayers) {
			serverState = "waiting for players"
			for (const player of players) {
				player.send(JSON.stringify({type: "player left", mes: players.length}))
			}
			if (serverState == "playing") {
				console.log("Ending game due to loss of required players")
			}
		}
	})
})

function loop() {
	if (serverState == "playing") {
		for (const player of players) {
			for (const playerB of players) {
				if (player == playerB) {continue}
				player.send(JSON.stringify({type: "player update", mes: {x: playerB.x, y: playerB.y, rot: playerB.rot, id: playerB.id, team: playerB.team}}))
			}
		}
	}
	
	setTimeout(loop, 0)
}

setTimeout(loop, 20)