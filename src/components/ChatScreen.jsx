import { useState, useEffect, useRef } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  TextField,
  Paper,
  Avatar,
  CircularProgress,
  Chip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SendIcon from '@mui/icons-material/Send'
import PersonIcon from '@mui/icons-material/Person'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { createProvider } from '../providers'

const STORAGE_KEY = 'ai-chat-app-chats'

function ChatScreen({ chatId, onBack }) {
  const [chats, setChats] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const savedChats = localStorage.getItem(STORAGE_KEY)
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats)
      setChats(parsedChats)
      const chat = parsedChats.find(c => c.id === chatId)
      setCurrentChat(chat)
    }
  }, [chatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentChat?.messages, streamingMessage])

  const updateChat = (updatedChat) => {
    const updatedChats = chats.map(c => c.id === updatedChat.id ? updatedChat : c)
    setChats(updatedChats)
    setCurrentChat(updatedChat)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChats))
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentChat) return

    const userMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...(currentChat.messages || []), userMessage]
    const updatedChat = {
      ...currentChat,
      messages: updatedMessages,
      lastMessage: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    }
    updateChat(updatedChat)
    setInputMessage('')
    setIsLoading(true)
    setStreamingMessage({ type: 'text', content: '', thinking: '' })

    try {
      // For now, using a dummy API key - in production, this should come from settings
      const provider = createProvider('anthropic', import.meta.env.VITE_ANTHROPIC_API_KEY || 'dummy-key')

      const assistantMessage = await provider.sendMessage(
        updatedMessages,
        (chunk) => {
          setStreamingMessage(prev => {
            if (chunk.type === 'thinking') {
              return { ...prev, thinking: chunk.content }
            } else if (chunk.type === 'text') {
              return { ...prev, content: chunk.content }
            }
            return prev
          })
        },
        {
          model: currentChat.model || 'claude-sonnet-4-5-20250929',
          thinking: true,
        }
      )

      const finalMessage = {
        ...assistantMessage,
        timestamp: new Date().toISOString(),
      }

      const finalMessages = [...updatedMessages, finalMessage]
      const finalChat = {
        ...updatedChat,
        messages: finalMessages,
        lastMessage: assistantMessage.content.find(c => c.type === 'text')?.text || 'No response',
        timestamp: new Date().toISOString(),
      }
      updateChat(finalChat)
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        timestamp: new Date().toISOString(),
        isError: true,
      }
      const errorMessages = [...updatedMessages, errorMessage]
      updateChat({ ...updatedChat, messages: errorMessages })
    } finally {
      setIsLoading(false)
      setStreamingMessage(null)
    }
  }

  const renderMessageContent = (content) => {
    if (typeof content === 'string') {
      return <Typography variant="body1">{content}</Typography>
    }

    if (Array.isArray(content)) {
      return content.map((block, index) => {
        if (block.type === 'text') {
          return (
            <Typography key={index} variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {block.text}
            </Typography>
          )
        } else if (block.type === 'thinking') {
          return (
            <Box key={index} sx={{ mb: 1 }}>
              <Chip
                label="Thinking"
                size="small"
                sx={{ mb: 1 }}
                color="primary"
                variant="outlined"
              />
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  whiteSpace: 'pre-wrap',
                  pl: 2,
                  borderLeft: '2px solid',
                  borderColor: 'primary.main',
                }}
              >
                {block.thinking}
              </Typography>
            </Box>
          )
        }
        return null
      })
    }

    return null
  }

  if (!currentChat) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ ml: 2 }}>
            <Typography variant="h6">{currentChat.title}</Typography>
            <Typography variant="caption">{currentChat.provider}</Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
        {currentChat.messages?.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                maxWidth: '80%',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                  mx: 1,
                }}
              >
                {message.role === 'user' ? <PersonIcon /> : <SmartToyIcon />}
              </Avatar>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: message.isError ? 'error.light' : message.role === 'user' ? 'primary.light' : 'white',
                }}
              >
                {renderMessageContent(message.content)}
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Typography>
              </Paper>
            </Box>
          </Box>
        ))}

        {streamingMessage && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', maxWidth: '80%' }}>
              <Avatar sx={{ bgcolor: 'secondary.main', mx: 1 }}>
                <SmartToyIcon />
              </Avatar>
              <Paper sx={{ p: 2, bgcolor: 'white' }}>
                {streamingMessage.thinking && (
                  <Box sx={{ mb: 1 }}>
                    <Chip label="Thinking" size="small" sx={{ mb: 1 }} color="primary" variant="outlined" />
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        whiteSpace: 'pre-wrap',
                        pl: 2,
                        borderLeft: '2px solid',
                        borderColor: 'primary.main',
                      }}
                    >
                      {streamingMessage.thinking}
                    </Typography>
                  </Box>
                )}
                {streamingMessage.content && (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {streamingMessage.content}
                  </Typography>
                )}
                <CircularProgress size={16} sx={{ mt: 1 }} />
              </Paper>
            </Box>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      <Paper sx={{ p: 2, borderRadius: 0 }} elevation={3}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            disabled={isLoading}
            multiline
            maxRows={4}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
          </IconButton>
        </Box>
      </Paper>
    </Box>
  )
}

export default ChatScreen
