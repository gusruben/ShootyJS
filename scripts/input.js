class Input {
    constructor() {
        this.keys = new Array(500).fill(false)
        this.mouse = {x: 0, y: 0, down: false}
        
        window.addEventListener("mousemove", (e) => {this.mouse.x = e.clientX, this.mouse.y = e.clientY})
        window.addEventListener("mousedown", (e) => {this.mouse.down = true});
        window.addEventListener("mouseup", (e) => {this.mouse.down = false});
        window.addEventListener("keydown", (e) => {this.keys[e.keyCode] = true})
        window.addEventListener("keyup", (e) => {this.keys[e.keyCode] = false})
    }
}