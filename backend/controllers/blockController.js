const Block = require('../models/Block')

// Obtener bloques sin _id
exports.getBlocks = async (req, res) => {
    const blocks = await Block.find({}, { name: 1, x: 1, y: 1, z: 1, _id: 0 })

    res.json(blocks)
}

// Agregar un nuevo bloque
exports.addBlock = async (req, res) => {
    const { name, x, y, z } = req.body
    const newBlock = new Block({ name, x, y, z })
    await newBlock.save()
    res.status(201).json({ message: 'Bloque guardado', block: newBlock })
}

// Cargar lote desde JSON (para inicialización desde Blender)
exports.addMultipleBlocks = async (req, res) => {
    const blocks = req.body // array [{ x, y, z }, ...]
    await Block.insertMany(blocks)
    res.status(201).json({ message: 'Bloques guardados', count: blocks.length })
}
