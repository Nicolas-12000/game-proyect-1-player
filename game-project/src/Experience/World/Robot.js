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

        // Variables para bunny hop - OPTIMIZADAS
        this.bhopSpeed = 0
        this.lastJumpTime = 0
        this.onGround = false
        
        // Cooldown para colisiones - REDUCIDO
        this.lastCollisionTime = 0
        this.collisionCooldown = 400 // 400ms entre empujes

        // Optimización de verificación de suelo
        this.lastGroundCheck = 0
        this.groundCheckInterval = 250 // Verificar cada 250ms
        this.lastKnownGroundState = false 

        // ⚖️ SISTEMA DE STUN/SLOW REBALANCEADO
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
    }

    handleCollision(event) {
        const contact = event.contact
        const currentTime = Date.now()
        
        if (currentTime - this.lastCollisionTime < this.collisionCooldown) {
            return
        }

        if (contact.bi === this.body || contact.bj === this.body) {
            const normal = contact.bi === this.body ? contact.ni : contact.nj
            const otherBody = contact.bi === this.body ? contact.bj : contact.bi
            
            // Detectar suelo y no aplicar efectos
            if (normal.y > 0.7) {
                this.onGround = true
                return
            }
            
            if (normal.y > 0.3 && this.body.velocity.y < 0) {
                return // Aterrizaje
            }

            // Aplicar efectos solo en colisiones válidas
            const isLateralCollision = Math.abs(normal.x) > 0.4 || Math.abs(normal.z) > 0.4
            const isWallCollision = otherBody && (
                otherBody.material === this.physics.wallMaterial || 
                otherBody.material === this.physics.obstacleMaterial
            )
            
            if (isLateralCollision || isWallCollision) {
                const currentVel = this.body.velocity
                const velocityMagnitude = Math.sqrt(currentVel.x**2 + currentVel.z**2)
                
                // 🎯 UMBRALES AJUSTADOS PARA MAYOR DINAMISMO
                // Velocidad de caminata normal: ~1.5-3
                // Velocidad de bunny hop: ~4-12+
                
                if (velocityMagnitude > 5.5) { // AUMENTADO: Era 5.0 - Permite más velocidad antes del stun
                    const stunSuccess = this.applyStun(1200)
                    if (stunSuccess) {
                        console.log('💥 COLISIÓN A ALTA VELOCIDAD (bunny hop) - Stun aplicado! Vel:', velocityMagnitude.toFixed(1))
                    }
                }
                else if (velocityMagnitude > 1.8) { // SLOW AZUL: Reducido de 2.0 para velocidades más bajas
                    this.applySlow(2500, 0.25)
                    console.log('⚡ COLISIÓN A VELOCIDAD NORMAL (caminata) - Slow aplicado! Vel:', velocityMagnitude.toFixed(1))
                }
                else {
                    // Sin efectos para velocidades muy bajas
                    console.log('🚶 Colisión muy lenta - Sin efectos. Vel:', velocityMagnitude.toFixed(1))
                }
            }
            
            // Manejo de colisiones desde arriba
            if (normal.y > 0.3 && this.body.velocity.y < -1) {
                this.body.velocity.y = Math.max(this.body.velocity.y * 0.2, -0.6)
                
                const slideForce = Math.min(Math.abs(this.body.velocity.y) * 0.3, 2.0) // Reducido slide
                const slideDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)
                
                this.body.velocity.x += slideDirection.x * slideForce * 0.5
                this.body.velocity.z += slideDirection.z * slideForce * 0.5
                
                this.lastCollisionTime = currentTime
                return
            }
            
            // Colisiones laterales más fluidas
            if (Math.abs(normal.x) > 0.5 || Math.abs(normal.z) > 0.5) {
                const velocityMagnitude = Math.sqrt(this.body.velocity.x**2 + this.body.velocity.z**2)
                if (velocityMagnitude > 1.5) { // Reducido de 1.8
                    const reductionFactor = Math.max(0.7, 1 - (velocityMagnitude / 10)) // Más conservador
                    this.body.velocity.x *= reductionFactor
                    this.body.velocity.z *= reductionFactor
                }
                
                if (velocityMagnitude < 1.0) { // Reducido de 1.3
                    const gentlePush = 0.08 // Reducido de 0.1
                    const pushDirection = new CANNON.Vec3(
                        -normal.x * gentlePush,
                        0,
                        -normal.z * gentlePush
                    )
                    this.body.applyImpulse(pushDirection)
                }
            }
            
            if (normal.y < -0.3 && this.body.velocity.y > 0) {
                this.body.velocity.y *= 0.15
            }

            this.lastCollisionTime = currentTime
        }
    } 

    checkGroundContact() {
        const currentTime = Date.now()
        
        // Usar el último estado conocido si no ha pasado suficiente tiempo
        if (currentTime - this.lastGroundCheck < this.groundCheckInterval) {
            this.onGround = this.lastKnownGroundState
            return
        }
        
        this.lastGroundCheck = currentTime
        
        const groundLevel = 0.4
        const tolerance = 0.1
        const wasOnGround = this.onGround
        
        if (this.body.position.y <= groundLevel + tolerance) {
            this.onGround = true
            this.lastKnownGroundState = true
        } else {
            const isNearGround = this.body.position.y <= groundLevel + (tolerance * 2)
            const hasLowVerticalVelocity = Math.abs(this.body.velocity.y) < 0.5
            
            if (isNearGround && hasLowVerticalVelocity) {
                this.onGround = true
                this.lastKnownGroundState = true
            } else {
                this.onGround = false
                this.lastKnownGroundState = false
            }
        }
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
    }

    dispose() {
        // Remover event listeners
        this.body.removeEventListener('collide', this.collisionHandler)
        
        // Limpiar recursos
        this.cleanupResources()
        
        // Limpiar física
        this.body.force.setZero()
        this.body.torque.setZero()
        this.body.velocity.setZero()
        this.body.angularVelocity.setZero()
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
        if (keys.space && (!this.stunned || this.stunMovementFactor > 0)) {
            const currentTime = Date.now()
            
            if (this.onGround) {
                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)
                
                let jumpForceX = 0.65 // AUMENTADO: Era 0.55 - Más distancia de salto
                let jumpForceY = 0.58 // MANTENIDO: Altura perfecta como está
                let jumpForceZ = 0.85 // AUMENTADO: Era 0.75 - Más impulso hacia adelante para dinamismo
                
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

        if (this.debug && this.debug.active) {
            if (this.bhopSpeed > 0) {
                console.log(`🐰 Bhop Speed: ${this.bhopSpeed.toFixed(1)}`)
            }
            if (this.stunned) {
                console.log(`😵 STUNNED (${(this.stunMovementFactor * 100).toFixed(0)}% movimiento) - ${((this.stunEndTime - Date.now()) / 1000).toFixed(1)}s`)
            }
            if (this.slowEffect) {
                console.log(`🐌 SLOW (${(this.slowMultiplier * 100).toFixed(0)}%) - ${((this.slowEndTime - Date.now()) / 1000).toFixed(1)}s`)
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