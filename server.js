import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const CHATS_DIR = path.join(__dirname, 'chats')

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Ensure chats directory exists
await fs.mkdir(CHATS_DIR, { recursive: true })

// Get all chats
app.get('/api/chats', async (req, res) => {
  try {
    const files = await fs.readdir(CHATS_DIR)
    const chatFiles = files.filter(f => f.endsWith('.json'))

    const chats = await Promise.all(
      chatFiles.map(async (file) => {
        const content = await fs.readFile(path.join(CHATS_DIR, file), 'utf-8')
        return JSON.parse(content)
      })
    )

    // Sort by timestamp, newest first
    chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.json(chats)
  } catch (error) {
    console.error('Error reading chats:', error)
    res.status(500).json({ error: 'Failed to read chats' })
  }
})

// Get a single chat
app.get('/api/chats/:id', async (req, res) => {
  try {
    const filePath = path.join(CHATS_DIR, `${req.params.id}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    res.json(JSON.parse(content))
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Chat not found' })
    } else {
      console.error('Error reading chat:', error)
      res.status(500).json({ error: 'Failed to read chat' })
    }
  }
})

// Create or update a chat
app.put('/api/chats/:id', async (req, res) => {
  try {
    const filePath = path.join(CHATS_DIR, `${req.params.id}.json`)
    await fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf-8')
    res.json({ success: true })
  } catch (error) {
    console.error('Error saving chat:', error)
    res.status(500).json({ error: 'Failed to save chat' })
  }
})

// Delete a chat
app.delete('/api/chats/:id', async (req, res) => {
  try {
    const filePath = path.join(CHATS_DIR, `${req.params.id}.json`)
    await fs.unlink(filePath)
    res.json({ success: true })
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Chat not found' })
    } else {
      console.error('Error deleting chat:', error)
      res.status(500).json({ error: 'Failed to delete chat' })
    }
  }
})

app.listen(PORT, () => {
  console.log(`Chat API server running on http://localhost:${PORT}`)
})
