import EventEmitter from './EventEmitter.js'

export default class KeyboardControls extends EventEmitter {
    constructor() {
        super()
        
        this.keys = {
            // Flechas
            up: false,
            down: false,
            left: false,
            right: false,
            // WASD
            w: false,
            a: false,
            s: false,
            d: false,
            // Espacio
            space: false,

            v:false
        }

        this.setListeners()
    }

    setListeners() {
        window.addEventListener('keydown', (event) => {
            // Flechas
            if (event.key === 'ArrowUp') this.keys.up = true
            if (event.key === 'ArrowDown') this.keys.down = true
            if (event.key === 'ArrowLeft') this.keys.left = true
            if (event.key === 'ArrowRight') this.keys.right = true
            
            // WASD - 🔧 CORREGIDO: usar this.keys.w en lugar de this.key.up
            if (event.key === 'w') this.keys.w = true
            if (event.key === 's') this.keys.s = true
            if (event.key === 'a') this.keys.a = true
            if (event.key === 'd') this.keys.d = true
            
            // Espacio
            if (event.code === 'Space') this.keys.space = true

            if (event.key === 'v') this.keys.v = true
            
            // Prevenir scroll con flechas y espacio
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
                event.preventDefault()
            }
            
            this.trigger('change', this.keys)
        })

        window.addEventListener('keyup', (event) => {
            // Flechas
            if (event.key === 'ArrowUp') this.keys.up = false
            if (event.key === 'ArrowDown') this.keys.down = false
            if (event.key === 'ArrowLeft') this.keys.left = false
            if (event.key === 'ArrowRight') this.keys.right = false
            
            // WASD - 🔧 CORREGIDO: usar this.keys correctamente
            if (event.key === 'w') this.keys.w = false
            if (event.key === 's') this.keys.s = false
            if (event.key === 'a') this.keys.a = false
            if (event.key === 'd') this.keys.d = false
            
            // Espacio
            if (event.code === 'Space') this.keys.space = false

            if (event.key === 'v') this.keys.v = false
            
            this.trigger('change', this.keys)
        })
    }

    getState() {
        return this.keys
    }
}