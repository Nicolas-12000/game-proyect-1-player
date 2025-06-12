import * as CANNON from 'cannon-es'

export default class Physics {
    constructor() {
        // Crear el mundo físico
        this.world = new CANNON.World()
        this.world.gravity.set(0, -12, 0)
        
        // Broadphase eficiente
        this.world.broadphase = new CANNON.SAPBroadphase(this.world)
        this.world.allowSleep = true
        
        // 🔧 Configuración de solver más estable y suave
        this.world.solver.iterations = 12 // 🔧 Aumentado de 10 a 12 para más precisión
        this.world.solver.tolerance = 0.005 // 🔧 Más preciso: de 0.01 a 0.005
        
        // ✅ Material por defecto
        this.defaultMaterial = new CANNON.Material('default')
        const defaultContact = new CANNON.ContactMaterial(
            this.defaultMaterial,
            this.defaultMaterial,
            {
                friction: 0.25, // 🔧 Ligeramente más fricción: 0.2 → 0.25
                restitution: 0.0 // 🔧 Completamente sin rebote
            }
        )
        this.world.defaultContactMaterial = defaultContact
        this.world.addContactMaterial(defaultContact)
        
        // ✅ Materiales personalizados
        this.robotMaterial = new CANNON.Material('robot')
        this.obstacleMaterial = new CANNON.Material('obstacle')
        this.wallMaterial = new CANNON.Material('wall')
        
        // 🔧 Contacto robot vs obstáculos - Optimizado para deslizamiento
        const robotObstacleContact = new CANNON.ContactMaterial(
            this.robotMaterial,
            this.obstacleMaterial,
            {
                friction: 0.2,                         // 🔧 Menos fricción para deslizar: 0.35 → 0.2
                restitution: 0.0,                      // 🔧 Completamente sin rebote
                contactEquationStiffness: 2e5,         // 🔧 Extremadamente suave: reducido a 2e5
                contactEquationRelaxation: 30,         // 🔧 Muy gradual: aumentado a 30
                frictionEquationStiffness: 2e4,        // 🔧 Muy suave: reducido a 2e4
                frictionEquationRelaxation: 30         // 🔧 Muy gradual: aumentado a 30
            }
        )
        this.world.addContactMaterial(robotObstacleContact)
        
        // 🔧 Contacto robot vs muros - Optimizado para colisiones graduales
        const robotWallContact = new CANNON.ContactMaterial(
            this.robotMaterial,
            this.wallMaterial,            {
                friction: 0.3,                         // 🔧 Fricción reducida
                restitution: 0.0,                      // 🔧 Sin rebote
                contactEquationStiffness: 1e5,         // 🔧 Muy suave: reducido drásticamente
                contactEquationRelaxation: 50,         // 🔧 Muy gradual
                frictionEquationStiffness: 1e4,        // 🔧 Muy suave
                frictionEquationRelaxation: 50         // 🔧 Muy gradual
            }
        )
        this.world.addContactMaterial(robotWallContact)
        
        // 🔧 Contacto obstáculo vs obstáculo
        const obstacleContact = new CANNON.ContactMaterial(
            this.obstacleMaterial,
            this.obstacleMaterial,
            {
                friction: 0.25,                        // 🔧 Más fricción: 0.2 → 0.25
                restitution: 0.0,                      // 🔧 Sin rebote: 0.01 → 0.0
                contactEquationStiffness: 1e7,
                contactEquationRelaxation: 5
            }
        )
        this.world.addContactMaterial(obstacleContact)
        
        console.log('🔧 Physics configurada con colisiones ultra-suaves')
    }
    
    update(delta) {
        // 🔧 Paso de simulación más suave y estable
        const fixedTimeStep = 1 / 60
        const maxSubSteps = 4 // 🔧 Aumentado de 3 a 4 para más suavidad
        
        this.world.step(fixedTimeStep, delta, maxSubSteps)
    }
}