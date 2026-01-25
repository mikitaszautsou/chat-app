const API_URL = 'http://localhost:3001/api'

export const chatsAPI = {
  // Get all chats
  async getAll() {
    const response = await fetch(`${API_URL}/chats`)
    if (!response.ok) throw new Error('Failed to fetch chats')
    return response.json()
  },

  // Get a single chat by ID
  async getById(id) {
    const response = await fetch(`${API_URL}/chats/${id}`)
    if (!response.ok) throw new Error('Failed to fetch chat')
    return response.json()
  },

  // Save a chat (create or update)
  async save(chat) {
    const response = await fetch(`${API_URL}/chats/${chat.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chat),
    })
    if (!response.ok) throw new Error('Failed to save chat')
    return response.json()
  },

  // Delete a chat
  async delete(id) {
    const response = await fetch(`${API_URL}/chats/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete chat')
    return response.json()
  },
}
