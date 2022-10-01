const ws = require('ws')
const uuid = require('uuid')
const fs = require('fs');
const readline = require('readline')
const express = require('express');
const { time } = require('console');

const address = "0.0.0.0"
const port = 3001

const app = express()
app.use("/", express.static(__dirname + "/../"))

app.listen(port, address, () => {
	console.log(`Listening on http://${address}:${port}`)
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
			mapString = data
			map = JSON.parse(LZWdecompress(data.split(","))).filter(a => a.mapType == "block")
			
			if (players.length > 1 && mapString) {
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

function LZWdecompress(compressed)
{
	let dictionary = {};
	for (let i = 0; i < 256; i++)
	{
		dictionary[i] = String.fromCharCode(i);
	}
	
	let word = String.fromCharCode(compressed[0]);
	let result = word;
	let entry = '';
	let dictSize = 256;
	
	for (let i = 1, len = compressed.length; i < len; i++)
	{
		let curNumber = compressed[i];
		
		if (dictionary[curNumber] !== undefined)
		{
			entry = dictionary[curNumber];
		}
		else
		{
			if (curNumber === dictSize)
			{
				entry = word + word[0];
			}
			else
			{
				throw 'Error in processing';
				return null;
			}
		}
		
		result += entry;
		
		dictionary[dictSize++] = word + entry[0];
		
		word = entry;
	}
	
	return result;
}

var serverState = "waiting for players"
var players = []
var playersById = {}

var mapString
var map
fs.readFile(`${__dirname}/maps/dust2.tmf`, 'utf8', (err, data) => {
	mapString = data
	map = JSON.parse(LZWdecompress(data.split(","))).filter(a => a.mapType == "block")
})

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
		player.shooting = false
		player.lastShotTick = 0
		
		player.send(JSON.stringify({
			type: "start", 
			mes: {
				players: players.filter(a => a!=player).map( a => ({id: a.id, team: a.team, name: a.name}) ),
				map: mapString,
				spawns: spawns
			}
		}))
	}
	
	serverState = "playing"
}

function doShot(player) {
	let hitPlayer
	let hit
	let hitDis = Infinity

	let rot = player.rot + (Math.random()-0.5)/8
	let ray = {x1: player.x, y1: player.y, x2: Math.sin(rot)*1000+player.x, y2: Math.cos(rot)*1000+player.y}
	
	for (const obj of map) {
		let res = lineRectIntersect(ray, obj)
		
		if (res.hit) {
			let dis = Math.sqrt((ray.x1 - res.x1)**2 + (ray.y1 - res.y1)**2)
			if (dis < hitDis) {
				hit = res
				hitDis = dis
			}
		}
	}
	for (const enemy of players.filter(a => a.team != player.team && a.alive)) {
		let res = lineRectIntersect(ray, enemy)
		
		if (res.hit) {
			let dis = Math.sqrt((ray.x1 - res.x1)**2 + (ray.y1 - res.y1)**2)
			if (dis < hitDis) {
				hit = res
				hitDis = dis
				hitPlayer = enemy
			}
		}
	}
	
	if (hit) {
		ray.x2 = hit.x1
		ray.y2 = hit.y1
	} if (hitPlayer) {
		hitPlayer.health -= 22
		if (hitPlayer.health <= 0) {
			hitPlayer.alive = false
			for (const conn of players) {
				conn.send(JSON.stringify({type: "died", mes: {killed: hitPlayer.id, killer: player.id}}))
			}

			if (players.filter(a => a.team == "red" && a.alive).length <= 0) {
				for (const conn of players) {
					conn.send(JSON.stringify({type: "begin end round", mes: {winner: "blue"}}))
				}

				setTimeout(startGame, 2000)
			}
			if (players.filter(a => a.team == "blue" && a.alive).length <= 0) {
				for (const conn of players) {
					conn.send(JSON.stringify({type: "begin end round", mes: {winner: "red"}}))
				}

				setTimeout(startGame, 5000)
			}

		} else {
			hitPlayer.send(JSON.stringify({type: "hit", mes: {health: hitPlayer.health}}))
		}
	}

	for (const conn of players) {
		conn.send(JSON.stringify({type: "shot", mes: {hit: ray, id: player.id, hitId: hitPlayer ? hitPlayer.id : undefined}}))
	}
}

wss.on('connection', (ws) => {
	ws.on('message', (raw) => {
		let parsed
		try {
			parsed = JSON.parse(raw)
		} catch {
			console.log(`Invalid Json from (${ws.name})`)
			return
		}
		let type = parsed.type
		let mes = parsed.mes
		
		if (type == "update move") {
			ws.x = mes.x
			ws.y = mes.y
			ws.rot = mes.rot
		}
		else if (type == "start shot") {
			ws.shooting = true
		}
		else if (type == "stop shot") {
			ws.shooting = false
		}
		else if (type == "join") {
			if (players.includes(ws)) {
				return
			}

			if (!mapString) {
				ws.close()
				console.log("Player attempted to join but was kicked because no map was loaded")
				return
			}
			
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
			ws.alive = false
			playersById[ws.id] = ws
			ws.send(JSON.stringify({type: "uuid", mes: {id: ws.id, team: ws.team, map: mapString, name: ws.name, players: players.filter(a => a != ws).map(a => ({id: a.id, team: a.team, name: a.name, alive: a.alive}))}}))


			console.log(`(${mes.name}) Connected`)
		
			for (const player of players) {
				if (player == ws) {continue}
				player.send(JSON.stringify({type: "player joined", mes: {id: ws.id, team: ws.team, name: ws.name, alive: ws.alive}}))
			}

			if (players.length > 1 && mapString && serverState == "waiting for players") {
				startGame()
			} else if (players.length > 1 && !mapString) {
				for (const player of players) {
					player.send(JSON.stringify({type: "waiting for map"}))
				}

				console.log("All players connected, waiting to load map...")
			}
		}
	})
	
	ws.on('close', () => {
		players.splice(players.indexOf(ws), 1)
		delete playersById[ws.id]
		ws.team == "red" ? reds-- : blues--
		
		console.log(`(${ws.name}) Left the game`)

		for (const player of players) {
			player.send(JSON.stringify({type: "player left", mes: {id: ws.id}}))
		}
		
		if (players.length < 2) {
			if (serverState == "playing") {
				console.log("Ending game due to loss of required players")
			}
			serverState = "waiting for players"
		}
	})
})
let tick = 0
function loop() {
	if (serverState == "playing") {
		for (const player of players) {
			for (const playerB of players.filter(a => a.alive)) {
				if (player == playerB) {continue}
				player.send(JSON.stringify({type: "player update", mes: {x: playerB.x, y: playerB.y, rot: playerB.rot, id: playerB.id, team: playerB.team}}))
			}
			if (player.shooting) {
				if (player.alive && Math.abs(tick - player.lastShotTick) > 1) {
					doShot(player)
					player.lastShotTick = tick
				}
			}
		}
	}
	
	tick++ 
	setTimeout(loop, 80)
}

setTimeout(loop, 80)
