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
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SendIcon from '@mui/icons-material/Send'
import PersonIcon from '@mui/icons-material/Person'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'
import { createProvider } from '../providers'
import { EmojiProvider } from '../providers'
import { chatsAPI } from '../api/chats'
import { getApiKeyForProvider } from '../utils/providerUtils'

// Generate unique ID for messages
const generateId = () => {
  return crypto.randomUUID()
}

function ChatScreen({ chatId, onBack, themeMode, onToggleTheme, onProviderChange }) {
  const [currentChat, setCurrentChat] = useState(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState(null)
  const [branchMenuAnchor, setBranchMenuAnchor] = useState(null)
  const [selectedMessageForBranch, setSelectedMessageForBranch] = useState(null)
  const [modelMenuAnchor, setModelMenuAnchor] = useState(null)
  const [availableModels, setAvailableModels] = useState([])
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editText, setEditText] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const [collapsedMessages, setCollapsedMessages] = useState(new Set())
  // messagesTopRef removed - no longer needed with reversed message order

  useEffect(() => {
    loadChat()
  }, [chatId])

  useEffect(() => {
    // Notify parent of provider change for theme color
    if (currentChat?.provider) {
      onProviderChange(currentChat.provider)
    }
  }, [currentChat?.provider, onProviderChange])

  const loadChat = async () => {
    try {
      console.log('📥 Loading chat:', chatId)
      const chat = await chatsAPI.getById(chatId)
      console.log('📥 Loaded from API:', {
        messagesMapKeys: Object.keys(chat.messagesMap || {}),
        currentBranchPath: chat.currentBranchPath
      })
      const migratedChat = migrateChat(chat)
      console.log('📥 After migration:', {
        messagesMapKeys: Object.keys(migratedChat.messagesMap || {}),
        currentBranchPath: migratedChat.currentBranchPath
      })
      setCurrentChat(migratedChat)

      // Save migrated chat back if migration occurred
      if (!chat.messagesMap && migratedChat.messagesMap) {
        await chatsAPI.save(migratedChat)
      }
    } catch (error) {
      console.error('Error loading chat:', error)
    }
  }

  // Auto-scroll removed - with reversed order, newest messages are already visible at top

  useEffect(() => {
    // Load available models when chat loads
    if (currentChat?.provider) {
      try {
        const providerName = currentChat.provider.toLowerCase()
        const provider = createProvider(providerName, 'dummy-key-for-models')
        const models = provider.getModels()
        setAvailableModels(models)
      } catch (error) {
        console.error('Error loading models:', error)
        setAvailableModels([])
      }
    }
  }, [currentChat?.provider])

  const updateChat = async (updatedChat) => {
    try {
      console.log('💾 Saving chat:', {
        chatId: updatedChat.id,
        currentBranchPath: updatedChat.currentBranchPath,
        messagesMapSize: Object.keys(updatedChat.messagesMap).length,
        messagesMapKeys: Object.keys(updatedChat.messagesMap)
      })
      await chatsAPI.save(updatedChat)
      setCurrentChat(updatedChat)
      console.log('✅ Chat saved successfully')
    } catch (error) {
      console.error('Error updating chat:', error)
    }
  }

  // Migrate old chats to new branching structure
  const migrateChat = (chat) => {
    let migratedChat = { ...chat }

    // Add default provider and model if missing
    if (!migratedChat.provider) {
      migratedChat.provider = 'Anthropic'
    }
    if (!migratedChat.model) {
      migratedChat.model = 'claude-sonnet-4-5-20250929'
    }

    // Check if already migrated to branching structure
    if (migratedChat.messagesMap) {
      return migratedChat
    }

    // Handle empty or no messages
    if (!migratedChat.messages || migratedChat.messages.length === 0) {
      return { ...migratedChat, messagesMap: {}, rootMessageIds: [], currentBranchPath: [] }
    }

    const messagesMap = {}
    const rootMessageIds = []
    const currentBranchPath = []

    migratedChat.messages.forEach((msg, index) => {
      const id = generateId()
      const parentId = index > 0 ? currentBranchPath[index - 1] : null

      messagesMap[id] = {
        id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        isError: msg.isError,
        parentId,
        children: [],
      }

      if (parentId) {
        messagesMap[parentId].children.push(id)
      } else {
        rootMessageIds.push(id)
      }

      currentBranchPath.push(id)
    })

    return {
      ...migratedChat,
      messagesMap,
      rootMessageIds,
      currentBranchPath,
      messages: undefined, // Remove old flat array
    }
  }

  // Get messages in current branch path
  const getCurrentBranchMessages = () => {
    if (!currentChat || !currentChat.messagesMap) return []

    console.log('📖 Getting current branch messages:', {
      branchPath: currentChat.currentBranchPath,
      messagesMapKeys: Object.keys(currentChat.messagesMap)
    })

    const messages = currentChat.currentBranchPath
      .map(id => {
        const msg = currentChat.messagesMap[id]
        if (!msg) {
          console.warn('Message not found in map:', id)
        }
        return msg
      })
      .filter(Boolean)

    console.log('📖 Returning messages:', messages.map(m => ({ id: m.id, role: m.role })))
    return messages
  }

  // Get the last message ID in current branch
  const getLastMessageId = () => {
    if (!currentChat || !currentChat.currentBranchPath || currentChat.currentBranchPath.length === 0) {
      return null
    }
    return currentChat.currentBranchPath[currentChat.currentBranchPath.length - 1]
  }

  // Handle branching from a specific message
  const handleBranchFrom = async (messageId) => {
    // Find the index of the message in current branch
    const messageIndex = currentChat.currentBranchPath.indexOf(messageId)
    if (messageIndex === -1) return

    // Create new branch path up to and including the selected message
    const newBranchPath = currentChat.currentBranchPath.slice(0, messageIndex + 1)

    const updatedChat = {
      ...currentChat,
      currentBranchPath: newBranchPath,
    }

    await updateChat(updatedChat)
    setBranchMenuAnchor(null)
  }

  // Switch to a different branch (child)
  const handleSwitchToBranch = async (childMessageId) => {
    console.log('=== SWITCHING TO BRANCH ===')
    console.log('Target message ID:', childMessageId)
    console.log('Current messagesMap keys:', Object.keys(currentChat.messagesMap))

    const message = currentChat.messagesMap[childMessageId]
    if (!message) {
      console.error('Message not found in messagesMap:', childMessageId)
      return
    }

    // Build path from root to this message
    const newPath = []
    let currentId = childMessageId

    // First, traverse up to root to build the path
    while (currentId) {
      newPath.unshift(currentId)
      const msg = currentChat.messagesMap[currentId]
      console.log('Adding to path (backward):', currentId, msg?.role)
      currentId = msg?.parentId
    }

    // Then, traverse down to the end of this branch
    // Follow the first child until we reach a message with no children or multiple children
    let lastId = childMessageId
    while (true) {
      const msg = currentChat.messagesMap[lastId]
      if (!msg || !msg.children || msg.children.length === 0) {
        // Reached end of branch (no children)
        break
      }
      if (msg.children.length > 1) {
        // Multiple branches - stop here
        break
      }
      // Only one child - continue to that child
      lastId = msg.children[0]
      newPath.push(lastId)
      console.log('Adding to path (forward):', lastId, currentChat.messagesMap[lastId]?.role)
    }

    console.log('New branch path:', newPath)

    const updatedChat = {
      ...currentChat,
      currentBranchPath: newPath,
    }

    await updateChat(updatedChat)
    console.log('Branch switched and saved')
    setBranchMenuAnchor(null)
  }

  const handleModelMenuOpen = (event) => {
    setModelMenuAnchor(event.currentTarget)
  }

  const handleModelMenuClose = () => {
    setModelMenuAnchor(null)
  }

  const handleModelChange = async (modelId) => {
    if (!currentChat) return

    const updatedChat = {
      ...currentChat,
      model: modelId,
    }

    await updateChat(updatedChat)
    handleModelMenuClose()
  }

  const handleEditMessage = (message) => {
    setEditingMessageId(message.id)
    // Extract text from message content
    const text = typeof message.content === 'string'
      ? message.content
      : message.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('\n')
    setEditText(text)
  }

  const handleSaveEdit = async () => {
    if (!currentChat || !editingMessageId || !editText.trim()) return

    const editedMessage = currentChat.messagesMap[editingMessageId]

    // Get all descendants of this message (responses to delete)
    const getDescendants = (msgId) => {
      const descendants = []
      const msg = currentChat.messagesMap[msgId]
      if (msg && msg.children) {
        msg.children.forEach(childId => {
          descendants.push(childId)
          descendants.push(...getDescendants(childId))
        })
      }
      return descendants
    }

    const toDelete = getDescendants(editingMessageId)

    // Remove all descendants from messagesMap
    const updatedMessagesMap = { ...currentChat.messagesMap }
    toDelete.forEach(id => {
      delete updatedMessagesMap[id]
    })

    // Update the edited message
    updatedMessagesMap[editingMessageId] = {
      ...editedMessage,
      content: editText.trim(),
      edited: true,
      editedAt: new Date().toISOString(),
      children: [], // Clear children since we deleted them
    }

    // Update currentBranchPath - remove all deleted messages
    const updatedBranchPath = currentChat.currentBranchPath.filter(
      id => !toDelete.includes(id)
    )

    const updatedChat = {
      ...currentChat,
      messagesMap: updatedMessagesMap,
      currentBranchPath: updatedBranchPath,
      lastMessage: editText.trim(),
      timestamp: new Date().toISOString(),
    }

    await updateChat(updatedChat)
    setEditingMessageId(null)
    setEditText('')

    // Trigger inference to generate new response
    setIsLoading(true)
    setStreamingMessage({ type: 'text', content: '', thinking: '' })

    try {
      // Reconstruct message history from current branch
      const branchMessages = updatedBranchPath
        .map(id => updatedMessagesMap[id])
        .filter(Boolean)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }))

      const providerName = currentChat.provider.toLowerCase()
      const apiKey = getApiKeyForProvider(providerName)

      if (!apiKey) {
        throw new Error(`No API key found for ${currentChat.provider}. Please add your API key to the .env file.`)
      }

      const provider = createProvider(providerName, apiKey)

      const assistantMessage = await provider.sendMessage(
        branchMessages,
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

      const assistantMessageId = generateId()
      const finalAssistantMessage = {
        id: assistantMessageId,
        ...assistantMessage,
        timestamp: new Date().toISOString(),
        parentId: editingMessageId,
        children: [],
      }

      // Add assistant message to map
      const finalMessagesMap = {
        ...updatedMessagesMap,
        [assistantMessageId]: finalAssistantMessage,
        [editingMessageId]: {
          ...updatedMessagesMap[editingMessageId],
          children: [assistantMessageId],
        },
      }

      // Update branch path
      const finalBranchPath = [...updatedBranchPath, assistantMessageId]

      const finalChat = {
        ...updatedChat,
        messagesMap: finalMessagesMap,
        currentBranchPath: finalBranchPath,
        lastMessage: assistantMessage.content.find(c => c.type === 'text')?.text || 'No response',
        timestamp: new Date().toISOString(),
      }

      await updateChat(finalChat)
    } catch (error) {
      console.error('Error generating response after edit:', error)

      const errorMessageId = generateId()
      const errorMessage = {
        id: errorMessageId,
        role: 'assistant',
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        timestamp: new Date().toISOString(),
        isError: true,
        parentId: editingMessageId,
        children: [],
      }

      const errorMessagesMap = {
        ...updatedMessagesMap,
        [errorMessageId]: errorMessage,
        [editingMessageId]: {
          ...updatedMessagesMap[editingMessageId],
          children: [errorMessageId],
        },
      }

      const errorBranchPath = [...updatedBranchPath, errorMessageId]

      const errorChat = {
        ...updatedChat,
        messagesMap: errorMessagesMap,
        currentBranchPath: errorBranchPath,
      }

      await updateChat(errorChat)
    } finally {
      setIsLoading(false)
      setStreamingMessage(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditText('')
  }

  const handleDeleteMessage = (message) => {
    setMessageToDelete(message)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!currentChat || !messageToDelete) return

    // Get all descendants of this message
    const getDescendants = (msgId) => {
      const descendants = [msgId]
      const msg = currentChat.messagesMap[msgId]
      if (msg && msg.children) {
        msg.children.forEach(childId => {
          descendants.push(...getDescendants(childId))
        })
      }
      return descendants
    }

    const toDelete = getDescendants(messageToDelete.id)

    // Remove all descendants from messagesMap
    const updatedMessagesMap = { ...currentChat.messagesMap }
    toDelete.forEach(id => {
      delete updatedMessagesMap[id]
    })

    // Update parent's children array
    if (messageToDelete.parentId) {
      const parent = updatedMessagesMap[messageToDelete.parentId]
      if (parent) {
        updatedMessagesMap[messageToDelete.parentId] = {
          ...parent,
          children: parent.children.filter(id => id !== messageToDelete.id)
        }
      }
    }

    // Update rootMessageIds if this is a root message
    const updatedRootMessageIds = currentChat.rootMessageIds.filter(
      id => id !== messageToDelete.id
    )

    // Update currentBranchPath - remove all deleted messages
    const updatedBranchPath = currentChat.currentBranchPath.filter(
      id => !toDelete.includes(id)
    )

    const updatedChat = {
      ...currentChat,
      messagesMap: updatedMessagesMap,
      rootMessageIds: updatedRootMessageIds,
      currentBranchPath: updatedBranchPath,
    }

    await updateChat(updatedChat)
    setDeleteDialogOpen(false)
    setMessageToDelete(null)
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setMessageToDelete(null)
  }

  const handleToggleCollapse = (messageId) => {
    setCollapsedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentChat) return

    const userMessageId = generateId()
    const parentId = getLastMessageId()
    const isFirstMessage = !parentId && Object.keys(currentChat.messagesMap).length === 0

    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      parentId,
      children: [],
    }

    // Add user message to messages map
    const updatedMessagesMap = {
      ...currentChat.messagesMap,
      [userMessageId]: userMessage,
    }

    // Update parent's children array if exists
    if (parentId && updatedMessagesMap[parentId]) {
      updatedMessagesMap[parentId] = {
        ...updatedMessagesMap[parentId],
        children: [...updatedMessagesMap[parentId].children, userMessageId],
      }
    }

    // Update root messages if this is a root message
    const updatedRootMessageIds = parentId
      ? currentChat.rootMessageIds
      : [...currentChat.rootMessageIds, userMessageId]

    // Update current branch path
    const updatedBranchPath = [...currentChat.currentBranchPath, userMessageId]

    const updatedChat = {
      ...currentChat,
      messagesMap: updatedMessagesMap,
      rootMessageIds: updatedRootMessageIds,
      currentBranchPath: updatedBranchPath,
      lastMessage: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    }

    await updateChat(updatedChat)
    setInputMessage('')
    setIsLoading(true)
    setStreamingMessage({ type: 'text', content: '', thinking: '' })

    try {
      // Reconstruct message history from current branch
      const branchMessages = updatedBranchPath
        .map(id => updatedMessagesMap[id])
        .filter(Boolean)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }))

      const providerName = currentChat.provider.toLowerCase()
      const apiKey = getApiKeyForProvider(providerName)

      if (!apiKey) {
        throw new Error(`No API key found for ${currentChat.provider}. Please add your API key to the .env file.`)
      }

      const provider = createProvider(providerName, apiKey)

      const assistantMessage = await provider.sendMessage(
        branchMessages,
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

      const assistantMessageId = generateId()
      const finalAssistantMessage = {
        id: assistantMessageId,
        ...assistantMessage,
        timestamp: new Date().toISOString(),
        parentId: userMessageId,
        children: [],
      }

      // Add assistant message to map
      const finalMessagesMap = {
        ...updatedMessagesMap,
        [assistantMessageId]: finalAssistantMessage,
        [userMessageId]: {
          ...updatedMessagesMap[userMessageId],
          children: [assistantMessageId],
        },
      }

      // Update branch path
      const finalBranchPath = [...updatedBranchPath, assistantMessageId]

      let finalChat = {
        ...updatedChat,
        messagesMap: finalMessagesMap,
        currentBranchPath: finalBranchPath,
        lastMessage: assistantMessage.content.find(c => c.type === 'text')?.text || 'No response',
        timestamp: new Date().toISOString(),
      }

      // Generate emoji and title for first message
      if (isFirstMessage) {
        try {
          const emojiProvider = new EmojiProvider(import.meta.env.VITE_ANTHROPIC_API_KEY || 'dummy-key')

          // Generate both emoji and title in parallel
          const [emoji, title] = await Promise.all([
            emojiProvider.generateEmoji(inputMessage.trim()),
            emojiProvider.generateTitle(inputMessage.trim())
          ])

          finalChat = {
            ...finalChat,
            emoji: emoji,
            title: title,
          }
        } catch (error) {
          console.error('Error generating emoji/title:', error)
        }
      }

      console.log('✉️ Final chat before save:', {
        messagesMapKeys: Object.keys(finalChat.messagesMap),
        finalBranchPath: finalChat.currentBranchPath
      })
      await updateChat(finalChat)
    } catch (error) {
      console.error('Error sending message:', error)

      const errorMessageId = generateId()
      const errorMessage = {
        id: errorMessageId,
        role: 'assistant',
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        timestamp: new Date().toISOString(),
        isError: true,
        parentId: userMessageId,
        children: [],
      }

      const errorMessagesMap = {
        ...updatedMessagesMap,
        [errorMessageId]: errorMessage,
        [userMessageId]: {
          ...updatedMessagesMap[userMessageId],
          children: [errorMessageId],
        },
      }

      const errorBranchPath = [...updatedBranchPath, errorMessageId]

      await updateChat({
        ...updatedChat,
        messagesMap: errorMessagesMap,
        currentBranchPath: errorBranchPath,
      })
    } finally {
      setIsLoading(false)
      setStreamingMessage(null)
    }
  }

  const getMessagePreview = (content, maxLength = 150) => {
    let text = ''
    if (typeof content === 'string') {
      text = content
    } else if (Array.isArray(content)) {
      const textBlocks = content.filter(block => block.type === 'text')
      text = textBlocks.map(block => block.text).join(' ')
    }

    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...'
    }
    return text
  }

  const renderMessageContent = (content, isCollapsed = false) => {
    if (isCollapsed) {
      const preview = getMessagePreview(content)
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
          {preview}
        </Typography>
      )
    }
    if (typeof content === 'string') {
      return (
        <Box sx={{ '& p': { margin: 0 }, '& pre': { bgcolor: 'grey.100', p: 1, borderRadius: 1, overflow: 'auto' } }}>
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeHighlight, rehypeKatex]}
          >
            {content}
          </ReactMarkdown>
        </Box>
      )
    }

    if (Array.isArray(content)) {
      const thinkingBlocks = content.filter(block => block.type === 'thinking')
      const textBlocks = content.filter(block => block.type === 'text')

      return (
        <>
          {/* Render thinking blocks first, but only once */}
          {thinkingBlocks.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {thinkingBlocks.map((block, index) => (
                <Box key={`thinking-${index}`} sx={{ mb: 1 }}>
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
              ))}
            </Box>
          )}

          {/* Render text blocks with markdown */}
          {textBlocks.map((block, index) => (
            <Box
              key={`text-${index}`}
              sx={{
                '& p': { margin: 0, marginBottom: 1 },
                '& pre': { bgcolor: 'grey.100', p: 1, borderRadius: 1, overflow: 'auto', my: 1 },
                '& code': { bgcolor: 'grey.100', px: 0.5, py: 0.25, borderRadius: 0.5, fontSize: '0.9em' },
                '& pre code': { bgcolor: 'transparent', p: 0 },
                '& ul, & ol': { marginTop: 0.5, marginBottom: 0.5, paddingLeft: 3 },
                '& h1, & h2, & h3, & h4, & h5, & h6': { marginTop: 1, marginBottom: 0.5 },
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeHighlight, rehypeKatex]}
              >
                {block.text}
              </ReactMarkdown>
            </Box>
          ))}
        </>
      )
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
          <Box sx={{ ml: 2, flexGrow: 1 }}>
            <Typography variant="h6">{currentChat.title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption">{currentChat.provider}</Typography>
              {currentChat.model && (
                <Chip
                  label={availableModels.find(m => m.id === currentChat.model)?.name || currentChat.model}
                  size="small"
                  onClick={handleModelMenuOpen}
                  sx={{
                    height: '20px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                />
              )}
            </Box>
          </Box>
          <IconButton color="inherit" onClick={onToggleTheme}>
            {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Model Selection Menu */}
      <Menu
        anchorEl={modelMenuAnchor}
        open={Boolean(modelMenuAnchor)}
        onClose={handleModelMenuClose}
      >
        {availableModels.map((model) => (
          <MenuItem
            key={model.id}
            onClick={() => handleModelChange(model.id)}
            selected={model.id === currentChat?.model}
          >
            {model.name}
          </MenuItem>
        ))}
      </Menu>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
        {streamingMessage && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
              <Avatar sx={{ bgcolor: 'secondary.main', mx: 1 }}>
                <SmartToyIcon />
              </Avatar>
              <Paper sx={{ p: 2, bgcolor: 'white' }}>
                {streamingMessage.thinking && (
                  <Box sx={{ mb: 2 }}>
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
                  <Box
                    sx={{
                      '& p': { margin: 0, marginBottom: 1 },
                      '& pre': { bgcolor: 'grey.100', p: 1, borderRadius: 1, overflow: 'auto', my: 1 },
                      '& code': { bgcolor: 'grey.100', px: 0.5, py: 0.25, borderRadius: 0.5, fontSize: '0.9em' },
                      '& pre code': { bgcolor: 'transparent', p: 0 },
                      '& ul, & ol': { marginTop: 0.5, marginBottom: 0.5, paddingLeft: 3 },
                      '& h1, & h2, & h3, & h4, & h5, & h6': { marginTop: 1, marginBottom: 0.5 },
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeHighlight, rehypeKatex]}
                    >
                      {streamingMessage.content}
                    </ReactMarkdown>
                  </Box>
                )}
                <CircularProgress size={16} sx={{ mt: 1 }} />
              </Paper>
            </Box>
          </Box>
        )}

        {(() => {
          const messages = getCurrentBranchMessages()
          return [...messages].reverse().map((message, index) => {
            const originalIndex = messages.length - 1 - index
            const hasMultipleBranches = message.children && message.children.length > 1
            const currentChildId = currentChat.currentBranchPath[originalIndex + 1]

          return (
            <Box key={message.id}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    width: '100%',
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
                  <Box>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: message.isError ? 'error.light' : message.role === 'user' ? 'primary.light' : 'white',
                      }}
                    >
                      {editingMessageId === message.id ? (
                        <Box>
                          <TextField
                            fullWidth
                            multiline
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            autoFocus
                            variant="outlined"
                            sx={{ mb: 1 }}
                          />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<SaveIcon />}
                              onClick={handleSaveEdit}
                            >
                              Save
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CancelIcon />}
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          {renderMessageContent(message.content, collapsedMessages.has(message.id))}
                          {message.edited && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                              (edited)
                            </Typography>
                          )}
                        </>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {hasMultipleBranches && (
                            <Tooltip title="Multiple branches">
                              <Chip
                                icon={<CallSplitIcon />}
                                label={message.children.length}
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={(e) => {
                                  setSelectedMessageForBranch(message)
                                  setBranchMenuAnchor(e.currentTarget)
                                }}
                                sx={{ cursor: 'pointer' }}
                              />
                            </Tooltip>
                          )}
                          <Tooltip title="Branch from here">
                            <IconButton
                              size="small"
                              onClick={() => handleBranchFrom(message.id)}
                              sx={{ ml: 0.5 }}
                            >
                              <CallSplitIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {editingMessageId !== message.id && (
                            <Tooltip title={collapsedMessages.has(message.id) ? "Expand message" : "Collapse message"}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleCollapse(message.id)}
                                sx={{ ml: 0.5 }}
                              >
                                {collapsedMessages.has(message.id) ? (
                                  <ExpandMoreIcon fontSize="small" />
                                ) : (
                                  <ExpandLessIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                          {message.role === 'user' && editingMessageId !== message.id && (
                            <Tooltip title="Edit message">
                              <IconButton
                                size="small"
                                onClick={() => handleEditMessage(message)}
                                sx={{ ml: 0.5 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {editingMessageId !== message.id && (
                            <Tooltip title="Delete message">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteMessage(message)}
                                sx={{ ml: 0.5 }}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              </Box>

              {/* Branch indicator - show when there are multiple branches */}
              {hasMultipleBranches && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    mb: 2,
                    ml: message.role === 'user' ? 0 : 7,
                    mr: message.role === 'user' ? 7 : 0,
                  }}
                >
                  <Chip
                    icon={<CallSplitIcon />}
                    label={`Branch ${message.children.indexOf(currentChildId) + 1} of ${message.children.length}`}
                    size="small"
                    color="info"
                    variant="filled"
                    onClick={(e) => {
                      setSelectedMessageForBranch(message)
                      setBranchMenuAnchor(e.currentTarget)
                    }}
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              )}
            </Box>
          )
        })
        })()}
      </Box>

      {/* Branch selection menu */}
      <Menu
        anchorEl={branchMenuAnchor}
        open={Boolean(branchMenuAnchor)}
        onClose={() => {
          setBranchMenuAnchor(null)
          setSelectedMessageForBranch(null)
        }}
      >
        {selectedMessageForBranch?.children.map((childId, index) => {
          const childMessage = currentChat.messagesMap[childId]
          const isCurrentBranch = currentChat.currentBranchPath.includes(childId)
          const previewContent = typeof childMessage?.content === 'string'
            ? childMessage.content.substring(0, 50)
            : Array.isArray(childMessage?.content)
            ? childMessage.content.find(c => c.type === 'text')?.text?.substring(0, 50) || 'Branch'
            : 'Branch'

          return (
            <MenuItem
              key={childId}
              onClick={() => handleSwitchToBranch(childId)}
              selected={isCurrentBranch}
            >
              <Box>
                <Typography variant="body2" fontWeight={isCurrentBranch ? 'bold' : 'normal'}>
                  Branch {index + 1} {isCurrentBranch && '(Current)'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {previewContent}...
                </Typography>
              </Box>
            </MenuItem>
          )
        })}
      </Menu>

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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this message? This will also delete all replies to this message. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ChatScreen
