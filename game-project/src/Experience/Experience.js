import * as THREE from 'three'
import Debug from './Utils/Debug.js'
import Sizes from './Utils/Sizes.js'
import Time from './Utils/Time.js'
import VRIntegration from '../integrations/VRIntegration.js'
import Camera from './Camera.js'
import Renderer from './Renderer.js'
import ModalManager from './Utils/ModalManager.js'
import World from './World/World.js'
import Resources from './Utils/Resources.js'
import sources from './sources.js'
import Sounds from './World/Sound.js'
import Raycaster from './Utils/Raycaster.js'
import KeyboardControls from './Utils/KeyboardControls.js'
import GameTracker from './Utils/GameTracker.js'
import Physics from './Utils/Physics.js'
import cannonDebugger from 'cannon-es-debugger'
import CircularMenu from '../controls/CircularMenu.js'
import { Howler } from 'howler'
import uccLogo from '../../../ucc.png'

let instance = null

export default class Experience {
  constructor(_canvas) {
    if (instance) return instance
    instance = this

    // Global access
    window.experience = this
    this.canvas = _canvas

    // Flag de interacción
    window.userInteracted = false

    // Core setup
    this.debug = new Debug()
    this.sizes = new Sizes()
    this.time = new Time()
    this.scene = new THREE.Scene()
    this.physics = new Physics()
    this.debugger = cannonDebugger(this.scene, this.physics.world, { color: 0x00ff00 })
    this.keyboard = new KeyboardControls()

    this.scene.background = new THREE.Color('#87ceeb')

    // Recursos
    this.resources = new Resources(sources)

    // Cámara y renderer
    this.camera = new Camera(this)
    this.renderer = new Renderer(this)

    // Raycaster
    this.raycaster = new Raycaster(this)


    // Modal y VR
    this.modal = new ModalManager({ container: document.body })
    this.vr = new VRIntegration({
      renderer: this.renderer.instance,
      scene: this.scene,
      camera: this.camera.instance,
      modalManager: this.modal,
      experience: this
    })

    // Menú
    this.menu = new CircularMenu({
      container: document.body,
      vrIntegration: this.vr,
      onAudioToggle: () => this.world.toggleAudio(),
      onWalkMode: () => {
        this.resumeAudioContext()
        this.toggleWalkMode()
      },
      onFullscreen: () => {
        if (!document.fullscreenElement) {
          document.body.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      }
    })
    //Generar obstaculos
    this._startObstacleWaves()

    //Iniciar juego
    this.modal.show({
      icon: '🚀',
      image: uccLogo,
      message: 'Recoge todas las monedas\n¡y evita los obstáculos!',
      buttons: [
        {
          text: '▶️ Iniciar juego',
          onClick: () => this.startGame()
        }
      ]
    })

    // Activar tiempos
    if (this.tracker) {
      this.tracker.destroy()
    }

    this.tracker = new GameTracker({ 
      modal: this.modal, 
      menu: this.menu 
    })

    // Mundo
    this.world = new World(this)

    // Flag tercera persona
    this.isThirdPerson = false

    // Iniciar loop adecuado
    this.startLoop()

    // Resize
    this.sizes.on('resize', () => this.resize())

    // Sonidos
    this.sounds = new Sounds({ time: this.time, debug: this.debug })

    // Detectar gesto del usuario
    window.addEventListener('click', this.handleFirstInteraction, { once: true })
    window.addEventListener('touchstart', this.handleFirstInteraction, { once: true })
  }

  //Control de audio
  handleFirstInteraction() {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log('🔊 AudioContext reanudado por interacción del usuario.')
      }).catch((err) => {
        console.warn('⚠️ Error reanudando AudioContext:', err)
      })
    }
    window.userInteracted = true
  }

  resumeAudioContext() {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log('🔊 AudioContext reanudado manualmente')
      }).catch((err) => {
        console.warn('⚠️ Error reanudando AudioContext:', err)
      })
    }
  }

  toggleWalkMode() {
    this.isThirdPerson = !this.isThirdPerson

    const controls = this.camera.controls
    const cam = this.camera.instance

    if (this.isThirdPerson) {
      controls.enabled = false
      console.log('🟡 Tercera persona ON')
    } else {
      controls.enabled = true
      controls.enableRotate = true
      controls.enableZoom = true
      controls.enablePan = false
      controls.minPolarAngle = 0
      controls.maxPolarAngle = Math.PI * 0.9

      cam.position.set(12, 5, 10)
      cam.up.set(0, 1, 0)
      controls.target.set(0, 0, 0)
      cam.lookAt(controls.target)
      controls.update()

      console.log('🟢 Vista global restaurada')
    }
  }

  startLoop() {
    this.vr.setUpdateCallback((delta) => this.update(delta))

    this.time.on('tick', () => {
      if (!this.renderer.instance.xr.isPresenting) {
        const delta = this.time.delta * 0.001
        this.update(delta)
      }
    })
  }

  resize() {
    this.camera.resize()
    this.renderer.resize()
  }

  update(delta) {
    // Optimización: Solo actualizar lo necesario basado en el estado actual
    if (!this.isThirdPerson && !this.renderer.instance.xr.isPresenting) {
      this.camera.update()
    }

    if (this.renderer.instance.xr.isPresenting && this.world?.robot?.group) {
      this.adjustCameraForVR()
    }

    // Actualizar componentes principales solo si existen
    if (this.world) {
      this.world.update(delta)
    }
    
    if (this.renderer) {
      this.renderer.update()
    }
    
    if (this.physics) {
      this.physics.update(delta)
    }
  }

  adjustCameraForVR() {
    if (this.renderer.instance.xr.isPresenting && this.world.robot?.group) {
      const pos = this.world.robot.group.position
      this.camera.instance.position.copy(pos).add(new THREE.Vector3(0, 1.6, 0))
      this.camera.instance.lookAt(pos.clone().add(new THREE.Vector3(0, 1.6, -1)))
      // console.log('🎯 Cámara ajustada a robot en VR')
    }
  }

  //Generar olas de cubos
  _startObstacleWaves() {
    this.obstacleWaveCount = 10
    this.maxObstacles = 50
    this.currentObstacles = []
    const delay = 30000
  
    const spawnWave = () => {
      if (this.obstacleWavesDisabled) return
      
      // Optimización: Limpiar obstáculos viejos antes de crear nuevos
      this.cleanOldObstacles()
      
      // Solo generar nuevos si no excedemos el máximo
      const remainingSlots = this.maxObstacles - this.currentObstacles.length
      const obstaclestoCreate = Math.min(this.obstacleWaveCount, remainingSlots)
      
      for (let i = 0; i < obstaclestoCreate; i++) {
        const obstacle = this.raycaster.generateRandomObstacle?.()
        if (obstacle) {
          this.currentObstacles.push(obstacle)
        }
      }
  
      this.obstacleWaveCount = Math.min(this.obstacleWaveCount + 5, 30) // Limitar crecimiento
      this.obstacleWaveTimeout = setTimeout(spawnWave, delay)
    }
  
    this.obstacleWaveTimeout = setTimeout(spawnWave, 30000)
  }
  
  cleanOldObstacles() {
    // Remover obstáculos excedentes
    while (this.currentObstacles.length > this.maxObstacles) {
      const oldest = this.currentObstacles.shift()
      this.removeObstacle(oldest)
    }
    
    // Limpiar obstáculos inválidos
    this.currentObstacles = this.currentObstacles.filter(obstacle => {
      if (!obstacle?.mesh || !obstacle?.body) {
        this.removeObstacle(obstacle)
        return false
      }
      return true
    })
  }
  
  removeObstacle(obstacle) {
    if (!obstacle) return
    
    if (obstacle.body) {
      this.physics.world.removeBody(obstacle.body)
    }
    
    if (obstacle.mesh) {
      this.scene.remove(obstacle.mesh)
      
      if (obstacle.mesh.geometry) {
        obstacle.mesh.geometry.dispose()
      }
      
      if (Array.isArray(obstacle.mesh.material)) {
        obstacle.mesh.material.forEach(mat => {
          if (mat && mat.dispose) mat.dispose()
        })
      } else if (obstacle.mesh.material?.dispose) {
        obstacle.mesh.material.dispose()
      }
    }
  }

  destroy() {
    this.sizes.off('resize')
    this.time.off('tick')

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose && mat.dispose())
        } else {
          child.material.dispose?.()
        }

      }
    })

    this.camera.controls.dispose()
    this.renderer.instance.dispose()
    if (this.debug.active) this.debug.ui.destroy()
  }

  startGame() {
    console.log('🎮 Iniciando nueva partida...')
    
    // Asegurar que estamos en modo tercera persona
    this.isThirdPerson = true
    
    // Reiniciar obstáculos y oleadas
    this.obstacleWavesDisabled = false
    this._startObstacleWaves()
    
    // Mostrar el menú si existe
    if (this.menu && this.menu.toggleButton) {
        this.menu.toggleButton.style.display = 'block'
    }
    
    // Iniciar el tracker
    if (this.tracker) {
        this.tracker.start()
    }
    
    // Asegurar que la cámara esté en la posición correcta
    if (!this.renderer.instance.xr.isPresenting) {
        this.camera.instance.position.set(12, 5, 10)
        this.camera.instance.lookAt(0, 0, 0)
        if (this.camera.controls) {
            this.camera.controls.target.set(0, 0, 0)
            this.camera.controls.update()
        }
    }
    
    console.log('🎮 Partida iniciada correctamente')
  }



  resetGame() {
    console.log('♻️ Reiniciando juego...')
    
    // Reset game state flags
    this.isThirdPerson = true
    this.obstacleWavesDisabled = false
    
    // Limpiar oleadas de obstáculos
    clearTimeout(this.obstacleWaveTimeout)
    this.obstacleWaveCount = 10
    this.currentObstacles = []
    
    // Reset world state
    if (this.world) {
        // Reset robot position if exists
        if (this.world.robot) {
            this.world.robot.reset()
        }

        // Reset prizes through loader
        if (this.world.loader) {
            this.world.loader.resetPrizes()
        }

        // Reset all obstacles
        this.raycaster?.removeAllObstacles()
    }

    // Reset camera position
    if (!this.renderer.instance.xr.isPresenting) {
        this.camera.instance.position.set(12, 5, 10)
        this.camera.instance.lookAt(0, 0, 0)
        if (this.camera.controls) {
            this.camera.controls.target.set(0, 0, 0)
            this.camera.controls.update()
        }
    }

    // Reset and recreate tracker
    if (this.tracker) {
        this.tracker.reset()
        this.tracker.hideGameButtons()
    } else {
        this.tracker = new GameTracker({ 
            modal: this.modal, 
            menu: this.menu 
        })
    }

    // Iniciar nueva partida después del reset
    this.startGame()
  }

  showVictoryModal(time, coins) {
    this.modal.show({
      icon: '🏆',
      image: uccLogo,
      message: `¡VICTORIA!\n\n🕒 Tiempo: ${time}\n💰 Monedas: ${coins}`,
      buttons: [
        {
          text: '🔄 Jugar de nuevo',
          onClick: () => this.resetGame()
        }
      ],
      isEndGame: true
    })
  }

  showGameOverModal(time, coins) {
    this.modal.show({
      icon: '💥',
      image: uccLogo,
      message: `¡GAME OVER!\n\n🕒 Tiempo: ${time}\n💰 Monedas: ${coins}`,
      buttons: [
        {
          text: '🔄 Intentar de nuevo',
          onClick: () => this.resetGame()
        }
      ],
      isEndGame: true
    })
  }
}