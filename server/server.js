const ws = require('ws')
const uuid = require('uuid')
const readline = require('readline')

const wss = new ws.WebSocketServer({ host: "localhost", port: 3000 })
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})
rl.on('line', (input) => {
	let parsed = input.split(' ')
	let command = parsed[0]
	
	if (command == "loadmap") {
		
	}
})

console.log(`${wss.options.host}:${wss.options.port}`)

var serverState = "waiting for players"
var players = []

var map

const maxPlayers = 4
var blues = 0
var reds = 0

wss.on('connection', (ws) => {
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
			ws.send(JSON.stringify({type: "uuid", mes: {id: ws.id, team: ws.team}}))
		} else {
			ws.close()
			return
		}
		
		if (players.length == maxPlayers) {
			for (const player of players) {
				player.x = 0
				player.y = 0
				player.rot = 0

				player.send(JSON.stringify({type: "start", mes: players.filter(a => a!=player).map(a => ({id: a.id, team: a.team, map: map}))}))
			}
			
			serverState = "playing"
		} else if (players.length < maxPlayers) {
			for (const player of players) {
				player.send(JSON.stringify({type: "player joined", mes: players.length}))
			}
		} else if (!map) {
			for (const player of players) {
				player.send(JSON.stringify({type: "waiting for map"}))
			}
		}
	} else {
		ws.close()
		return
	}
	
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
		else if (type == "shot") {
			for (const player of players) {
				player.send(JSON.stringify(parsed))
			}
		}
	})
	
	ws.on('close', (raw) => {
		players.splice(players.indexOf(ws), 1)
		ws.team == "red" ? reds-- : blues--
		
		if (players.length < maxPlayers) {
			serverState = "waiting for players"
			for (const player of players) {
				player.send(JSON.stringify({type: "player left", mes: players.length}))
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