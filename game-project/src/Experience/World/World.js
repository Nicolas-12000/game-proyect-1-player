import * as THREE from 'three'

import Environment from './Environment.js'
import Fox from './Fox.js'
import Robot from './Robot.js'
import ToyCarLoader from '../../loaders/ToyCarLoader.js'
import Floor from './Floor.js'
import ThirdPersonCamera from './ThirdPersonCamera.js'
import Sound from './Sound.js'
import AmbientSound from './AmbientSound.js'
import MobileControls from '../../controls/MobileControls.js'


export default class World {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources

        // Sonidos
        this.coinSound = new Sound('/sounds/coin.ogg')
        this.ambientSound = new AmbientSound('/sounds/ambiente.mp3')
        this.winner = new Sound('/sounds/winner.mp3')

        this.allowPrizePickup = false
        this.hasMoved = false


        // Permitimos recoger premios tras 2s
        setTimeout(() => {
            this.allowPrizePickup = true
            console.log('✅ Ahora se pueden recoger premios')
        }, 2000)

        // Cuando todo esté cargado...
        this.resources.on('ready', async () => {
            // 1️⃣ Mundo base
            this.floor = new Floor(this.experience)
            this.environment = new Environment(this.experience)

            this.loader = new ToyCarLoader(this.experience)  // Asegurarnos de pasar experience aquí
            await this.loader.loadFromAPI()

            // Set total coins in tracker after loading
            if (this.experience.tracker && this.loader.prizes) {
                this.experience.tracker.setTotalCoins(this.loader.prizes.length)
                console.log(`🎮 Setting total coins: ${this.loader.prizes.length}`)
            }

            // 2️⃣ Personajes
            this.fox = new Fox(this.experience)
            this.robot = new Robot(this.experience)


            this.experience.tracker.showCancelButton()
            //Registrando experiencia VR con el robot
            this.experience.vr.bindCharacter(this.robot)
            this.thirdPersonCamera = new ThirdPersonCamera(this.experience, this.robot.group)

            // 3️⃣ Cámara
            this.thirdPersonCamera = new ThirdPersonCamera(this.experience, this.robot.group)

            // 4️⃣ Controles móviles (tras crear robot)
            this.mobileControls = new MobileControls({
                onUp: (pressed) => { this.experience.keyboard.keys.up = pressed },
                onDown: (pressed) => { this.experience.keyboard.keys.down = pressed },
                onLeft: (pressed) => { this.experience.keyboard.keys.left = pressed },
                onRight: (pressed) => { this.experience.keyboard.keys.right = pressed }
            })


        })

    }

    toggleAudio() {
        this.ambientSound.toggle()
    }

    update(delta) {
        // Optimización: Solo actualizar si los componentes existen
        if (this.fox && this.fox.update) {
            this.fox.update()
        }
        
        if (this.robot && this.robot.update) {
            this.robot.update()
        }

        // Optimización: Verificar condiciones antes de actualizar cámara
        if (this.thirdPersonCamera && 
            this.experience.isThirdPerson && 
            !this.experience.renderer.instance.xr.isPresenting) {
            this.thirdPersonCamera.update()
        }

        // Optimización: Actualizar premios solo si es necesario
        if (this.allowPrizePickup && this.loader?.prizes?.length > 0 && this.robot) {
            const pos = this.robot.body.position
            const speed = this.robot.body.velocity.length()
            const moved = speed > 0.5

            // Usar un bucle for para mejor rendimiento y poder remover elementos
            for (let i = this.loader.prizes.length - 1; i >= 0; i--) {
                const prize = this.loader.prizes[i]
                if (!prize.collected && prize.pivot) {
                    const dist = prize.pivot.position.distanceTo(pos)
                    if (dist < 1.2 && moved) {
                        prize.collect()
                        
                        // Optimización: Agrupar operaciones de limpieza
                        if (this.experience.raycaster?.removeRandomObstacles) {
                            const reduction = 0.2 + Math.random() * 0.1
                            this.experience.raycaster.removeRandomObstacles(reduction)
                        }
                        
                        // Remover premio y reproducir sonido
                        this.loader.prizes.splice(i, 1)
                        this.coinSound.play()
                    }
                }
            }
        }

        // Solo actualizar premios restantes si existen
        if (this.loader?.prizes?.length > 0) {
            this.loader.prizes.forEach(p => {
                if (p && p.update) p.update(delta)
            })
        }
    }

}
