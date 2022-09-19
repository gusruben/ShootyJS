class Player {
	constructor() {
		this.x = 0
		this.y = 0
		this.sizeX = 20
		this.sizeY = 45
		this.type = "rect"
		
		this.color = "#ee9b00"
		
		this.xVel = 0
		this.yVel = 0
		
		this.accel = 3
		this.decel = 3
		this.maxSpeed = 10
		
		this.z = 1
	}
	
	handleMovement(input, dt) {
		if (input.keys[87]) {
			this.yVel += this.accel * dt
		}
		if (input.keys[83]) {
			this.yVel -= this.accel * dt
		}
		if (input.keys[68]) {
			this.xVel += this.accel * dt
		}
		if (input.keys[65]) {
			this.xVel -= this.accel * dt
		}
		if (input.keys[87] == input.keys[83]) {
			if (Math.abs(this.yVel) < this.decel * dt) {this.yVel = 0} else {
				this.yVel -= this.decel * Math.sign(this.yVel) * dt
			}
		}
		if (input.keys[68] == input.keys[65]){
			if (Math.abs(this.xVel) < this.decel * dt) {this.xVel = 0} else {
				this.xVel -= this.decel * Math.sign(this.xVel) * dt
			}
		}
		
		this.xVel = Math.min(Math.max(this.xVel, -this.maxSpeed), this.maxSpeed)
		this.yVel = Math.min(Math.max(this.yVel, -this.maxSpeed), this.maxSpeed)
		
		this.x += this.xVel * dt
		this.y += this.yVel * dt
	}
	
	handleCollision(obj) {
		if (Util.rectInRect(this, obj)) {
			let tDis = Math.abs((this.y-this.sizeY/2) - (obj.y+obj.sizeY/2))
			let bDis = Math.abs((this.y+this.sizeY/2) - (obj.y-obj.sizeY/2))
			let lDis = Math.abs((this.x+this.sizeX/2) - (obj.x-obj.sizeX/2))
			let rDis = Math.abs((this.x-this.sizeX/2) - (obj.x+obj.sizeX/2))
			
			let min = Math.min(tDis, bDis, lDis, rDis)
			
			if (min == tDis) {
				this.yVel = 0
				this.y = obj.y+obj.sizeY/2+this.sizeY/2
			}
			if (min == bDis) {
				this.yVel = 0
				this.y = obj.y-obj.sizeY/2-this.sizeY/2
			}
			if (min == lDis) {
				this.xVel = 0
				this.x = obj.x-obj.sizeX/2-this.sizeX/2
			}
			if (min == rDis) {
				this.xVel = 0
				this.x = obj.x+obj.sizeX/2+this.sizeX/2
			}
		}
	}
}