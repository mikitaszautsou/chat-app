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
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SendIcon from '@mui/icons-material/Send'
import PersonIcon from '@mui/icons-material/Person'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { createProvider } from '../providers'

const STORAGE_KEY = 'ai-chat-app-chats'

// Generate unique ID for messages
const generateId = () => {
  return crypto.randomUUID()
}

function ChatScreen({ chatId, onBack }) {
  const [chats, setChats] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState(null)
  const [branchMenuAnchor, setBranchMenuAnchor] = useState(null)
  const [selectedMessageForBranch, setSelectedMessageForBranch] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const savedChats = localStorage.getItem(STORAGE_KEY)
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats)
      const chat = parsedChats.find(c => c.id === chatId)
      if (chat) {
        const migratedChat = migrateChat(chat)
        setCurrentChat(migratedChat)
        setChats(parsedChats)

        // Save migrated chat back to storage if migration occurred
        if (!chat.messagesMap && migratedChat.messagesMap) {
          const updatedChats = parsedChats.map(c => c.id === chatId ? migratedChat : c)
          setChats(updatedChats)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChats))
        }
      }
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

  // Migrate old chats to new branching structure
  const migrateChat = (chat) => {
    if (!chat.messages || chat.messages.length === 0) {
      return { ...chat, messagesMap: {}, rootMessageIds: [], currentBranchPath: [] }
    }

    // Check if already migrated
    if (chat.messagesMap) {
      return chat
    }

    const messagesMap = {}
    const rootMessageIds = []
    const currentBranchPath = []

    chat.messages.forEach((msg, index) => {
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
      ...chat,
      messagesMap,
      rootMessageIds,
      currentBranchPath,
      messages: undefined, // Remove old flat array
    }
  }

  // Get messages in current branch path
  const getCurrentBranchMessages = () => {
    if (!currentChat || !currentChat.messagesMap) return []

    return currentChat.currentBranchPath.map(id => currentChat.messagesMap[id]).filter(Boolean)
  }

  // Get the last message ID in current branch
  const getLastMessageId = () => {
    if (!currentChat || !currentChat.currentBranchPath || currentChat.currentBranchPath.length === 0) {
      return null
    }
    return currentChat.currentBranchPath[currentChat.currentBranchPath.length - 1]
  }

  // Handle branching from a specific message
  const handleBranchFrom = (messageId) => {
    // Find the index of the message in current branch
    const messageIndex = currentChat.currentBranchPath.indexOf(messageId)
    if (messageIndex === -1) return

    // Create new branch path up to and including the selected message
    const newBranchPath = currentChat.currentBranchPath.slice(0, messageIndex + 1)

    const updatedChat = {
      ...currentChat,
      currentBranchPath: newBranchPath,
    }

    updateChat(updatedChat)
    setBranchMenuAnchor(null)
  }

  // Switch to a different branch (child)
  const handleSwitchToBranch = (childMessageId) => {
    const message = currentChat.messagesMap[childMessageId]
    if (!message) return

    // Build path from root to this message
    const newPath = []
    let currentId = childMessageId

    while (currentId) {
      newPath.unshift(currentId)
      currentId = currentChat.messagesMap[currentId].parentId
    }

    const updatedChat = {
      ...currentChat,
      currentBranchPath: newPath,
    }

    updateChat(updatedChat)
    setBranchMenuAnchor(null)
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentChat) return

    const userMessageId = generateId()
    const parentId = getLastMessageId()

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

    updateChat(updatedChat)
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

      const provider = createProvider('anthropic', import.meta.env.VITE_ANTHROPIC_API_KEY || 'dummy-key')

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

      const finalChat = {
        ...updatedChat,
        messagesMap: finalMessagesMap,
        currentBranchPath: finalBranchPath,
        lastMessage: assistantMessage.content.find(c => c.type === 'text')?.text || 'No response',
        timestamp: new Date().toISOString(),
      }
      updateChat(finalChat)
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

      updateChat({
        ...updatedChat,
        messagesMap: errorMessagesMap,
        currentBranchPath: errorBranchPath,
      })
    } finally {
      setIsLoading(false)
      setStreamingMessage(null)
    }
  }

  const renderMessageContent = (content) => {
    if (typeof content === 'string') {
      return (
        <Box sx={{ '& p': { margin: 0 }, '& pre': { bgcolor: 'grey.100', p: 1, borderRadius: 1, overflow: 'auto' } }}>
          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{content}</ReactMarkdown>
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
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{block.text}</ReactMarkdown>
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
          <Box sx={{ ml: 2 }}>
            <Typography variant="h6">{currentChat.title}</Typography>
            <Typography variant="caption">{currentChat.provider}</Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
        {getCurrentBranchMessages().map((message, index) => {
          const hasMultipleBranches = message.children && message.children.length > 1
          const currentChildId = currentChat.currentBranchPath[index + 1]

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
                      {renderMessageContent(message.content)}
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
        })}

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
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{streamingMessage.content}</ReactMarkdown>
                  </Box>
                )}
                <CircularProgress size={16} sx={{ mt: 1 }} />
              </Paper>
            </Box>
          </Box>
        )}

        <div ref={messagesEndRef} />
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
    </Box>
  )
}

export default ChatScreen
