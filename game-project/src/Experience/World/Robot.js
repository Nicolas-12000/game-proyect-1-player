import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Sound from './Sound.js'

export default class Robot {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.physics = this.experience.physics
        this.keyboard = this.experience.keyboard
        this.debug = this.experience.debug
        this.points = 0

        // Variables para bunny hop 
        this.bhopSpeed = 0
        this.lastJumpTime = 0
        this.onGround = false
        
        // Cooldown para colisiones - REDUCIDO
        this.lastCollisionTime = 0
        this.collisionCooldown = 200

        // Optimización de verificación de suelo
        this.lastGroundCheck = 0
        this.groundCheckInterval = 250 // Verificar cada 250ms
        this.lastKnownGroundState = false 

        // ⚖️ SISTEMA DE STUN/SLOW
        this.stunned = false
        this.stunEndTime = 0
        this.stunDuration = 1200 // 1.2 segundos
        this.slowEffect = false
        this.slowEndTime = 0
        this.slowDuration = 2500 // 2.5 segundos
        this.slowMultiplier = 0.25 // 25% velocidad
        this.lastStunTime = 0
        this.stunCooldown = 2500 // 2.5s entre stuns

        // NUEVO: Factores de reducción gradual para stun
        this.stunMovementFactor = 0.15 // 15% de movimiento durante stun
        this.stunTurnFactor = 0.3 // 30% de rotación durante stun

        this.collisionHandler = this.handleCollision.bind(this)

        this.setModel()
        this.setSounds()
        this.setPhysics()
        this.setAnimation()

        // Añade esta variable al constructor después de las variables existentes
        this.jumpKeyPressed = false
        window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        event.preventDefault();
    }
});

window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
        event.preventDefault();
        this.jumpKeyPressed = false;
    }
});
    }

    setModel() {
        this.model = this.resources.items.robotModel.scene
        this.model.scale.set(0.3, 0.3, 0.3)
        this.model.position.set(0, -0.4, 0)

        this.group = new THREE.Group()
        this.group.add(this.model)
        this.scene.add(this.group)

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }

    setPhysics() {
        const shape = new CANNON.Sphere(0.4)

        this.body = new CANNON.Body({
            mass: 2,
            shape: shape,
            position: new CANNON.Vec3(0, 1, 0),
            linearDamping: 0.3,    // Reducido de 0.5 a 0.3
            angularDamping: 0.7    // Reducido de 0.9 a 0.7
        })

        this.body.angularFactor.set(0, 1, 0)
        this.body.velocity.setZero()
        this.body.angularVelocity.setZero()
        this.body.sleep()
        this.body.material = this.physics.robotMaterial

        // Restitución mínima para eliminar rebotes
        this.physics.robotMaterial.restitution = 0.01

        this.body.removeEventListener('collide', this.collisionHandler) // Remover listener existente
        this.body.addEventListener('collide', this.collisionHandler)
        this.physics.world.addBody(this.body)

        setTimeout(() => {
            this.body.wakeUp()
        }, 100)
    }

    reset() {
        // Limpiar estado previo
        this.body.removeEventListener('collide', this.collisionHandler)
        
        // Reset position and velocity
        this.body.position.set(0, 1, 0)
        this.body.velocity.setZero()
        this.body.angularVelocity.setZero()
        this.body.force.setZero()  // Importante: resetear fuerzas acumuladas
        this.body.torque.setZero() // Importante: resetear torques acumulados

        // Reset rotation
        this.group.rotation.set(0, 0, 0)
        this.body.quaternion.setFromEuler(0, 0, 0)

        // Reset state
        this.bhopSpeed = 0
        this.lastJumpTime = 0
        this.onGround = false
        this.lastCollisionTime = 0
        this.stunned = false
        this.stunEndTime = 0
        this.slowEffect = false
        this.slowEndTime = 0
        this.points = 0

        // Restaurar efectos visuales
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material && child.material.userData.originalColor) {
                child.material.color.copy(child.material.userData.originalColor)
            }
        })

        // Reset animation to idle
        if (this.animation?.actions) {
            this.animation.play('idle')
        }

        // Reañadir listener de colisiones
        this.body.addEventListener('collide', this.collisionHandler)
    }

    // ⚖️ SISTEMA DE EFECTOS REBALANCEADO
    applyStun(duration = this.stunDuration) {
        const currentTime = Date.now()
        
        // Verificar cooldown
        if (currentTime - this.lastStunTime < this.stunCooldown) {
            return false
        }
        
        this.stunned = true
        this.stunEndTime = currentTime + duration
        this.lastStunTime = currentTime
        
        // STUN MENOS EXTREMO - Reducir velocidad en lugar de detener completamente
        this.body.velocity.x *= this.stunMovementFactor
        this.body.velocity.z *= this.stunMovementFactor
        this.body.velocity.y = Math.max(this.body.velocity.y * 0.7, this.body.velocity.y)
        this.body.angularVelocity.set(0, 0, 0)
        
        // Reducir bhop speed significativamente pero no eliminar
        this.bhopSpeed *= 0.3
        
        console.log('😵 Robot STUNNED (reducido) por', duration, 'ms')
        
        this.applyStunVisualEffect()
        return true
    }

    applySlow(duration = this.slowDuration, multiplier = this.slowMultiplier) {
        const currentTime = Date.now()
        this.slowEffect = true
        // Si ya hay slow activo, extender la duración
        this.slowEndTime = Math.max(this.slowEndTime, currentTime + duration)
        this.slowMultiplier = multiplier
        
        console.log('🐌 Robot SLOWED por', duration, 'ms (velocidad:', (multiplier * 100).toFixed(0) + '%)')
        
        this.applySlowVisualEffect()
    }

    applyStunVisualEffect() {
        // Efecto visual más sutil para stun reducido
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                if (!child.material.userData.originalColor) {
                    child.material.userData.originalColor = child.material.color.clone()
                }
                // Tint rojo menos intenso
                child.material.color.setHex(0xff6666)
            }
        })
        
        setTimeout(() => {
            this.model.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material && child.material.userData.originalColor) {
                    child.material.color.copy(child.material.userData.originalColor)
                }
            })
        }, this.stunDuration)
    }

    applySlowVisualEffect() {
        // Efecto visual más intenso para slow más potente
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                if (!child.material.userData.originalColor) {
                    child.material.userData.originalColor = child.material.color.clone()
                }
                // Tint azul más intenso
                child.material.color.setHex(0x2222ff)
            }
        })
        
        setTimeout(() => {
            this.model.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material && child.material.userData.originalColor) {
                    child.material.color.copy(child.material.userData.originalColor)
                }
            })
        }, this.slowDuration)
    }

    updateStatusEffects() {
        const currentTime = Date.now()
        
        // Actualizar stun
        if (this.stunned && currentTime >= this.stunEndTime) {
            this.stunned = false
            console.log('✅ Stun terminado')
        }
        
        // Actualizar slow
        if (this.slowEffect && currentTime >= this.slowEndTime) {
            this.slowEffect = false
            console.log('✅ Slow terminado')
        }
    }    handleCollision(event) {
        const contact = event.contact
        const currentTime = Date.now()
        
        // Cooldown básico
        if (currentTime - this.lastCollisionTime < this.collisionCooldown) {
            return
        }

        if (contact.bi === this.body || contact.bj === this.body) {
            const normal = contact.bi === this.body ? contact.ni : contact.nj
            const otherBody = contact.bi === this.body ? contact.bj : contact.bi
            
            // 1. DETECCIÓN DE SUELO (prioridad máxima)
            if (normal.y > 0.7) {
                this.onGround = true
                return
            }
            
            // 2. COLISIONES LATERALES CON EFECTOS
            const isLateralCollision = Math.abs(normal.x) > 0.4 || Math.abs(normal.z) > 0.4
            if (isLateralCollision) {
                const velocity = Math.sqrt(this.body.velocity.x**2 + this.body.velocity.z**2)
                
                // Aplicar efectos según velocidad
                if (velocity > 5.5) {
                    this.applyStun()
                } else if (velocity > 1.8) {
                    this.applySlow()
                }
                
                // Rebote simple
                const bounceForce = Math.min(velocity * 0.8, 4.0)
                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)
                
                this.body.velocity.x += -forward.x * bounceForce
                this.body.velocity.z += -forward.z * bounceForce
                this.body.velocity.x *= 0.7
                this.body.velocity.z *= 0.7
            }
            
            // 3. COLISIONES DESDE ARRIBA
            if (normal.y > 0.3 && this.body.velocity.y < -1) {
                this.body.velocity.y = Math.max(this.body.velocity.y * 0.3, -1.0)
                this.body.velocity.x *= 0.2
                this.body.velocity.z *= 0.2
            }
            
            this.lastCollisionTime = currentTime
        }
    }checkGroundContact() {
        const currentTime = Date.now()
        
        // Usar el último estado conocido si no ha pasado suficiente tiempo
        if (currentTime - this.lastGroundCheck < this.groundCheckInterval) {
            this.onGround = this.lastKnownGroundState
            return
        }
        
        this.lastGroundCheck = currentTime
        const wasOnGround = this.onGround
        
        // Raycast hacia abajo para detectar superficies
        const rayStart = new CANNON.Vec3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        )
        const rayEnd = new CANNON.Vec3(
            this.body.position.x,
            this.body.position.y - 0.6, // Distancia del raycast
            this.body.position.z
        )
        
        const raycastResult = new CANNON.RaycastResult()
        this.physics.world.raycastClosest(rayStart, rayEnd, {
            collisionFilterMask: -1 // Colisionar con todo
        }, raycastResult)
        
        // Verificar si hay una superficie cerca
        if (raycastResult.hasHit) {
            const verticalVelocity = Math.abs(this.body.velocity.y)
            const isStable = verticalVelocity < 0.5 // Velocidad vertical baja
            
            if (raycastResult.distance < 0.6 && isStable) {
                this.onGround = true
                this.lastKnownGroundState = true
                
                // Debug
                if (this.debug && this.debug.active) {
                    console.log('🦶 En superficie:', raycastResult.distance.toFixed(2))
                }
                return
            }
        }
        
        // Si no se detectó ninguna superficie
        this.onGround = false
        this.lastKnownGroundState = false
    }

    setSounds() {
        this.walkSound = new Sound('/sounds/robot/walking.mp3', { loop: true, volume: 0.5 })
        this.jumpSound = new Sound('/sounds/robot/jump.mp3', { volume: 0.8 })
    }

    setAnimation() {
        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        this.animation.actions = {}
        this.animation.actions.dance = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[0])
        this.animation.actions.death = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[1])
        this.animation.actions.idle = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[2])
        this.animation.actions.jump = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[3])
        this.animation.actions.walking = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[10])

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        this.animation.actions.jump.setLoop(THREE.LoopOnce)
        this.animation.actions.jump.clampWhenFinished = true
        this.animation.actions.jump.onFinished = () => {
            this.animation.play('idle')
        }

        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.actions.current

            newAction.reset()
            newAction.play()
            newAction.crossFadeFrom(oldAction, 0.3)
            this.animation.actions.current = newAction

            if (name === 'walking') {
                this.walkSound.play()
            } else {
                this.walkSound.stop()
            }

            if (name === 'jump') {
                this.jumpSound.play()
            }
        }
    }

    cleanupResources() {
        // Limpiar materiales
        if (this.model) {
            this.model.traverse((child) => {
                if (child.isMesh) {
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => {
                                material.dispose()
                            })
                        } else {
                            child.material.dispose()
                        }
                    }
                    if (child.geometry) {
                        child.geometry.dispose()
                    }
                }
            })
        }

        // Limpiar animaciones
        if (this.animation) {
            if (this.animation.actions) {
                Object.values(this.animation.actions).forEach(action => {
                    if (action && action.stop) {
                        action.stop()
                    }
                })
            }
            if (this.animation.mixer) {
                this.animation.mixer.stopAllAction()
                this.animation.mixer.uncacheRoot(this.model)
            }
        }
    }    dispose() {
        // 1. Remover event listeners del cuerpo físico
        if (this.body) {
            this.body.removeEventListener('collide', this.collisionHandler)
            this.physics.world.removeBody(this.body)
        }
        
        // 2. Remover event listeners de ventana
        window.removeEventListener('keydown', this.handleKeyDown)
        window.removeEventListener('keyup', this.handleKeyUp)
        
        // 3. Detener sonidos
        if (this.walkSound) {
            this.walkSound.stop()
            this.walkSound.dispose?.()
        }
        if (this.jumpSound) {
            this.jumpSound.stop()
            this.jumpSound.dispose?.()
        }
        
        // 4. Limpiar animaciones
        if (this.animation?.mixer) {
            this.animation.mixer.stopAllAction()
            this.animation.mixer.uncacheRoot(this.model)
            this.animation.mixer = null
        }
        
        // 5. Limpiar recursos 3D
        this.cleanupResources()
        
        // 6. Remover del scene
        if (this.group && this.scene) {
            this.scene.remove(this.group)
        }
        
        // 7. Limpiar referencias
        this.body = null
        this.model = null
        this.group = null
        this.animation = null
        this.collisionHandler = null
        
        console.log('🧹 Robot resources disposed')
    }

    update() {
        const delta = this.time.delta * 0.001
        
        // Optimización: Solo actualizar el mixer si hay una animación activa
        if (this.animation.actions.current && this.animation.actions.current.isRunning()) {
            this.animation.mixer.update(delta)
        }

        // Limpieza periódica de fuerzas cuando no son necesarias
        if (this.onGround && Math.abs(this.body.velocity.y) < 0.1) {
            this.body.force.y = 0
        }

        // Reset de fuerzas angulares cuando no está rotando
        if (!this.keyboard.getState().left && !this.keyboard.getState().right) {
            this.body.torque.setZero()
        }

        this.updateStatusEffects()

        // Limpieza periódica de fuerzas residuales
        if (this.onGround && Math.abs(this.body.velocity.y) < 0.1) {
            this.body.force.y = 0
        }

        // Reset de fuerzas angulares si no hay rotación activa
        if (!this.keyboard.getState().left && !this.keyboard.getState().right &&
            !this.keyboard.getState().a && !this.keyboard.getState().d) {
            this.body.torque.setZero()
        }

        const keys = this.keyboard.getState()
        let moveForce = 50  // REDUCIDO: Era 65 - Velocidad más modesta
        const turnSpeed = 2.5 // REDUCIDO: Era 2.8 - Rotación más controlada
        let isMoving = false

        // ⚖️ APLICAR EFECTOS REBALANCEADOS
        if (this.slowEffect) {
            moveForce *= this.slowMultiplier
        }
        
        // STUN permite movimiento reducido
        if (this.stunned) {
            moveForce *= this.stunMovementFactor
        }

        const wasOnGround = this.onGround
        this.onGround = false
        this.checkGroundContact()
        
        if (!wasOnGround && this.onGround) {
            this.bhopSpeed *= 0.9 // Más pérdida para balance con velocidad reducida
        }

        // ⚖️ LÍMITES DE VELOCIDAD OPTIMIZADOS PARA MAYOR DINAMISMO
        let maxSpeed = 6.8 // AUMENTADO: Era 6.0 - Más dinámico pero controlado
        
        if (this.slowEffect) {
            maxSpeed *= this.slowMultiplier
        }
        
        if (this.stunned) {
            maxSpeed *= this.stunMovementFactor
        }
        
        const currentSpeed = Math.sqrt(this.body.velocity.x**2 + this.body.velocity.z**2)
        
        if (currentSpeed > maxSpeed) {
            const reductionFactor = maxSpeed / currentSpeed
            this.body.velocity.x *= reductionFactor
            this.body.velocity.z *= reductionFactor
        }

        // ⚖️ SISTEMA DE SALTO AJUSTADO PARA VELOCIDAD MÁS BAJA
        if (keys.space && !this.jumpKeyPressed && (!this.stunned || this.stunMovementFactor > 0)) {
            this.jumpKeyPressed = true
            const currentTime = Date.now()
            
            if (this.onGround) {
                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)
                
                let jumpForceX = 0.65
                let jumpForceY = 10  // AUMENTADO: Era 0.58 - Más altura de salto
                let jumpForceZ = 0.90 // AUMENTADO: Era 0.75 - Más impulso hacia adelante para dinamismo
                
                // Aplicar efectos a salto
                if (this.slowEffect) {
                    jumpForceX *= this.slowMultiplier
                    jumpForceY *= Math.max(this.slowMultiplier, 0.4)
                    jumpForceZ *= this.slowMultiplier
                }
                
                if (this.stunned) {
                    jumpForceX *= this.stunMovementFactor
                    jumpForceY *= Math.max(this.stunMovementFactor, 0.2)
                    jumpForceZ *= this.stunMovementFactor
                }
                
                this.body.applyImpulse(new CANNON.Vec3(forward.x * jumpForceX, jumpForceY, forward.z * jumpForceZ))
                
                const bhopIncrement = 1.6 // AUMENTADO: Era 1.4 - Más acumulación para dinamismo
                const bhopMaxSpeed = 10 // AUMENTADO: Era 9 - Límite más alto para bunny hop
                
                this.bhopSpeed = Math.min(this.bhopSpeed + bhopIncrement, bhopMaxSpeed)
                this.lastJumpTime = currentTime
                this.animation.play('jump')
                
            } else if (currentTime - this.lastJumpTime > 300) { // AUMENTADO: Era 280ms - Más controlado
                const currentVel = Math.sqrt(this.body.velocity.x**2 + this.body.velocity.z**2)
                const minVelocityForBhop = 1.8 // REDUCIDO: Era 2.0 - Activación con menor velocidad
                
                if (currentVel > minVelocityForBhop) {
                    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)
                    
                    let bhopBaseForce = 0.42 // AUMENTADO: Era 0.35 - Más impulso base para dinamismo
                    let bhopSpeedMultiplier = 0.26 // AUMENTADO: Era 0.22 - Multiplicador más dinámico
                    let bhopAirJumpHeight = 0.015 // MANTENIDO: Altura perfecta
                    
                    // Aplicar efectos al bunny hop
                    if (this.slowEffect) {
                        bhopBaseForce *= this.slowMultiplier
                        bhopSpeedMultiplier *= this.slowMultiplier
                        bhopAirJumpHeight *= this.slowMultiplier
                    }
                    
                    if (this.stunned) {
                        bhopBaseForce *= this.stunMovementFactor
                        bhopSpeedMultiplier *= this.stunMovementFactor
                        bhopAirJumpHeight *= this.stunMovementFactor
                    }
                    
                    this.body.applyImpulse(new CANNON.Vec3(
                        forward.x * (bhopBaseForce + this.bhopSpeed * bhopSpeedMultiplier),
                        bhopAirJumpHeight,
                        forward.z * (bhopBaseForce + this.bhopSpeed * bhopSpeedMultiplier)
                    ))
                    
                    const bhopAirIncrement = 1.15 // AUMENTADO: Era 1.0 - Más acumulación en aire
                    const bhopAirMaxSpeed = 14 // AUMENTADO: Era 13 - Límite aéreo más dinámico
                    
                    this.bhopSpeed = Math.min(this.bhopSpeed + bhopAirIncrement, bhopAirMaxSpeed)
                    this.lastJumpTime = currentTime
                }
            }
        } else if (!keys.space) {
            this.jumpKeyPressed = false
        }

        // Decay de bhop speed más gradual para mayor dinamismo
        if (this.onGround && !keys.space) {
            this.bhopSpeed *= 0.97 // AUMENTADO: Era 0.90 - Menos pérdida para mantener dinamismo
        }

        // Reubicación por caída
        if (this.body.position.y > 8) {
            this.body.position.set(0, 1, 0)
            this.body.velocity.set(0, 0, 0)
            this.body.angularVelocity.set(0, 0, 0)
        }

        if (this.body.position.y < -3) {
            this.body.position.set(0, 1, 0)
            this.body.velocity.set(0, 0, 0)
            this.body.angularVelocity.set(0, 0, 0)
        }

        // ⚖️ MOVIMIENTO WASD CON STUN REDUCIDO
        const canMove = !this.stunned || this.stunMovementFactor > 0
        
        if (canMove) {
            if (keys.up || keys.w) {
                const forward = new THREE.Vector3(0, 0, 1)
                forward.applyQuaternion(this.group.quaternion)
                this.body.applyForce(
                    new CANNON.Vec3(forward.x * moveForce, 0, forward.z * moveForce),
                    this.body.position
                )
                isMoving = true
            }

            if (keys.down || keys.s) {
                const backward = new THREE.Vector3(0, 0, -1)
                backward.applyQuaternion(this.group.quaternion)
                this.body.applyForce(
                    new CANNON.Vec3(backward.x * moveForce, 0, backward.z * moveForce),
                    this.body.position
                )
                isMoving = true
            }

            // Rotación reducida durante stun
            let effectiveTurnSpeed = turnSpeed
            if (this.stunned) {
                effectiveTurnSpeed *= this.stunTurnFactor
            }

            if (keys.left || keys.a) {
                this.group.rotation.y += effectiveTurnSpeed * delta
                this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
            }

            if (keys.right || keys.d) {
                this.group.rotation.y -= effectiveTurnSpeed * delta
                this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
            }
        }

        // Animaciones
        if (this.stunned && this.stunMovementFactor <= 0.1) {
            // Solo idle si el stun es muy fuerte
            if (this.animation.actions.current !== this.animation.actions.idle) {
                this.animation.play('idle')
            }
        } else if (isMoving) {
            if (this.animation.actions.current !== this.animation.actions.walking) {
                this.animation.play('walking')
            }
        } else {
            if (this.animation.actions.current !== this.animation.actions.idle) {
                this.animation.play('idle')
            }
        }

        this.group.position.copy(this.body.position)
        
        if (this.debug?.active && Date.now() % 1000 < 50) { // Solo debug cada segundo
            const debugInfo = []
            if (this.bhopSpeed > 0) debugInfo.push(`🐰 Bhop: ${this.bhopSpeed.toFixed(1)}`)
            if (this.stunned) debugInfo.push(`😵 STUN: ${((this.stunEndTime - Date.now()) / 1000).toFixed(1)}s`)
            if (this.slowEffect) debugInfo.push(`🐌 SLOW: ${((this.slowEndTime - Date.now()) / 1000).toFixed(1)}s`)
            
            if (debugInfo.length > 0) {
                console.log(debugInfo.join(' | '))
            }
        }
    }

    moveInDirection(dir, speed) {
        if (!window.userInteracted || !this.experience.renderer.instance.xr.isPresenting) {
            return
        }

        // Permitir movimiento móvil reducido durante stun
        const canMove = !this.stunned || this.stunMovementFactor > 0
        if (!canMove) {
            return
        }

        const mobile = window.experience?.mobileControls
        if (mobile?.intensity > 0) {
            const dir2D = mobile.directionVector
            const dir3D = new THREE.Vector3(dir2D.x, 0, dir2D.y).normalize()

            let adjustedSpeed = 150 // REDUCIDO: Era 190 - Velocidad móvil más modesta
            
            if (this.slowEffect) {
                adjustedSpeed *= this.slowMultiplier
            }

            if (this.stunned) {
                adjustedSpeed *= this.stunMovementFactor
            }
            
            const force = new CANNON.Vec3(dir3D.x * adjustedSpeed, 0, dir3D.z * adjustedSpeed)

            this.body.applyForce(force, this.body.position)

            if (this.animation.actions.current !== this.animation.actions.walking) {
                this.animation.play('walking')
            }

            const angle = Math.atan2(dir3D.x, dir3D.z)
            this.group.rotation.y = angle
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }
    }
}