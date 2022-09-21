const ws = require('ws')
const uuid = require('uuid')
const fs = require('fs');
const readline = require('readline')

const wss = new ws.WebSocketServer({ host: "localhost", port: 3000 })
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
})

console.log(`${wss.options.host}:${wss.options.port}`)

var serverState = "waiting for players"
var players = []

var map

const maxPlayers = 4
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
		player.rot = 0
		
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
			for (const player of players) {
				player.send(JSON.stringify(parsed))
			}
		}
	})
	
	ws.on('close', () => {
		players.splice(players.indexOf(ws), 1)
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