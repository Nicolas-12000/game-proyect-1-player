// src/Utils/ModalManager.js
export default class ModalManager {
  constructor({ container = document.body } = {}) {
    this.container = container
    this._createModal()
  }

  _createModal() {
    // Overlay
    this.overlay = document.createElement('div')
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.5)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    })
    this.container.appendChild(this.overlay)

    // Modal box
    this.box = document.createElement('div')
    Object.assign(this.box.style, {
      background: '#222',
      color: '#fff',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '320px',
      textAlign: 'center',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px'
    })
    this.overlay.appendChild(this.box)

    // Imagen primero
    this.imageContainer = document.createElement('div')
    Object.assign(this.imageContainer.style, {
      width: '100%',
      maxWidth: '200px',
      marginBottom: '10px'
    })
    this.box.appendChild(this.imageContainer)

    // Icono después de la imagen
    this.icon = document.createElement('div')
    Object.assign(this.icon.style, {
      fontSize: '48px',
      marginBottom: '10px',
      animation: 'float 2s ease-in-out infinite'
    })
    this.box.appendChild(this.icon)

    // Agregar animación del cohete
    const style = document.createElement('style')
    style.textContent = `
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }
    `
    document.head.appendChild(style)

    // Texto
    this.text = document.createElement('div')
    Object.assign(this.text.style, {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '20px',
      whiteSpace: 'pre-line',
      color: '#ffffff'
    })
    this.box.appendChild(this.text)

    // Botones con estilo mejorado
    this.buttonsContainer = document.createElement('div')
    Object.assign(this.buttonsContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      width: '100%'
    })
    this.box.appendChild(this.buttonsContainer)

    // Close button con estilo mejorado
    this.closeBtn = document.createElement('button')
    this.closeBtn.innerText = 'Cerrar'
    Object.assign(this.closeBtn.style, {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '25px',
      background: '#00fff7',
      color: '#000',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '16px',
      transition: 'transform 0.2s',
      width: '100%'
    })
    this.closeBtn.onmouseover = () => {
      this.closeBtn.style.transform = 'scale(1.05)'
    }
    this.closeBtn.onmouseout = () => {
      this.closeBtn.style.transform = 'scale(1)'
    }
    this.closeBtn.onclick = () => this.hide()
    this.box.appendChild(this.closeBtn)
  }

  show({ icon = '🚀', image = '', message = '', buttons = [], isEndGame = false } = {}) {
    this.icon.innerText = icon

    // Manejar la imagen
    this.imageContainer.innerHTML = ''
    if (image) {
      const img = document.createElement('img')
      Object.assign(img.style, {
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
        display: 'block',
        margin: '0 auto',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      })
      img.crossOrigin = "anonymous"
      img.src = image
      this.imageContainer.appendChild(img)
    }

    this.text.innerText = message
    this.overlay.style.display = 'flex'

    // Limpiar botones anteriores
    this.buttonsContainer.innerHTML = ''

    // Agregar botones personalizados si se proporcionan
    if (Array.isArray(buttons) && buttons.length > 0) {
      buttons.forEach(btn => {
        const button = document.createElement('button')
        button.innerText = btn.text || 'Aceptar'
        Object.assign(button.style, {
          padding: '12px 24px',
          background: '#00fff7',
          color: '#000',
          border: 'none',
          borderRadius: '25px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '16px',
          width: '100%',
          transition: 'transform 0.2s'
        })
        button.onmouseover = () => {
          button.style.transform = 'scale(1.05)'
        }
        button.onmouseout = () => {
          button.style.transform = 'scale(1)'
        }
        button.onclick = () => {
          btn.onClick?.()
          this.hide()
        }
        this.buttonsContainer.appendChild(button)
      })
      this.closeBtn.style.display = 'none'
    } else {
      this.closeBtn.style.display = 'block'
    }

    // Estilos especiales para el modal de fin de juego
    if (isEndGame) {
      Object.assign(this.box.style, {
        background: '#222',
        border: '3px solid #00fff7',
        boxShadow: '0 0 20px rgba(0,255,247,0.3)',
        maxWidth: '400px'
      })

      Object.assign(this.text.style, {
        fontSize: '24px',
        color: '#00fff7',
        textShadow: '0 0 10px rgba(0,255,247,0.5)'
      })

      // Estilo especial para los botones de fin de juego
      buttons.forEach(btn => {
        Object.assign(button.style, {
          background: '#00fff7',
          color: '#000',
          transform: 'scale(1.1)',
          boxShadow: '0 0 15px rgba(0,255,247,0.5)'
        })
      })
    }
  }

  hide() {
    this.overlay.style.display = 'none'
  }
}
