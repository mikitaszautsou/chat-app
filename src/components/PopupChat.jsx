import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Chip,
  Switch,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PersonIcon from '@mui/icons-material/Person'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import Draggable from 'react-draggable'
import { createProvider } from '../providers'
import { getApiKeyForProvider } from '../utils/providerUtils'
import { promptsAPI } from '../api/prompts'

const remarkPlugins = [remarkMath, remarkGfm]
const rehypePlugins = [rehypeHighlight, rehypeKatex]

const convertMathDelimiters = (text) => {
  if (typeof text !== 'string') return text
  let converted = text.replace(/^\s*\[\s*(.+?)\s*\]\s*$/gm, '$$$$1$$')
  converted = converted.replace(/\(\s+([^()]*(?:\([^()]*\)[^()]*)*?)\s+\)/g, (match, content) => {
    if (/[\\^_{}]|[α-ωΑ-Ω]/.test(content)) {
      return `$${content.trim()}$`
    }
    return match
  })
  return converted
}

const markdownSx = {
  '& p': { margin: 0, marginBottom: 1 },
  '& pre': { bgcolor: 'grey.100', p: 1, borderRadius: 1, overflow: 'auto', my: 1 },
  '& code': { bgcolor: 'grey.100', px: 0.5, py: 0.25, borderRadius: 0.5, fontSize: '0.9em' },
  '& pre code': { bgcolor: 'transparent', p: 0 },
  '& ul, & ol': { marginTop: 0.5, marginBottom: 0.5, paddingLeft: 3 },
  '& h1, & h2, & h3, & h4, & h5, & h6': { marginTop: 1, marginBottom: 0.5 },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    my: 1,
    border: '1px solid',
    borderColor: 'grey.300',
  },
  '& th, & td': {
    border: '1px solid',
    borderColor: 'grey.300',
    p: 1,
    textAlign: 'left',
  },
  '& th': { bgcolor: 'grey.100', fontWeight: 'bold' },
  '& tr:nth-of-type(even)': { bgcolor: 'grey.50' },
}

function PopupChat({ onClose, providerName, model, systemPrompt, contextMessages }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState(null)
  const [contextAware, setContextAware] = useState(
    Array.isArray(contextMessages) && contextMessages.length > 0
  )

  // Active prompt config (initialized from parent, switchable via prompt selector)
  const [activeProvider, setActiveProvider] = useState(providerName)
  const [activeModel, setActiveModel] = useState(model)
  const [activeSystemPrompt, setActiveSystemPrompt] = useState(systemPrompt)
  const [activePromptTitle, setActivePromptTitle] = useState(null)

  const [prompts, setPrompts] = useState([])
  const [promptMenuAnchor, setPromptMenuAnchor] = useState(null)

  const isMountedRef = useRef(true)
  const messagesEndRef = useRef(null)
  const nodeRef = useRef(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    promptsAPI.getAll().then(setPrompts)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  const handleSelectPrompt = useCallback((prompt) => {
    setActiveProvider(prompt.provider.toLowerCase())
    setActiveModel(prompt.model)
    setActiveSystemPrompt(prompt.systemPrompt || '')
    setActivePromptTitle(prompt.title)
    setPromptMenuAnchor(null)
  }, [])

  const handleSend = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputMessage('')
    setIsLoading(true)
    setStreamingMessage({ content: '', thinking: '' })

    try {
      // Build API messages: if context-aware, prepend parent context
      let apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }))
      if (contextAware && Array.isArray(contextMessages) && contextMessages.length > 0) {
        apiMessages = [...contextMessages, ...apiMessages]
      }

      const apiKey = getApiKeyForProvider(activeProvider)
      if (!apiKey) {
        throw new Error(`No API key found for ${activeProvider}. Please add your API key to the .env file.`)
      }

      const provider = createProvider(activeProvider, apiKey)
      const assistantMessage = await provider.sendMessage(
        apiMessages,
        (chunk) => {
          if (!isMountedRef.current) return
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
          model: activeModel || 'claude-sonnet-4-5-20250929',
          thinking: true,
          system: activeSystemPrompt,
        }
      )

      if (!isMountedRef.current) return

      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantMessage.content,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (error) {
      if (!isMountedRef.current) return
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ])
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
        setStreamingMessage(null)
      }
    }
  }, [inputMessage, isLoading, messages, contextAware, contextMessages, activeProvider, activeModel, activeSystemPrompt])

  const renderContent = (content) => {
    if (typeof content === 'string') {
      return (
        <Box sx={markdownSx}>
          <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
            {convertMathDelimiters(content)}
          </ReactMarkdown>
        </Box>
      )
    }
    if (Array.isArray(content)) {
      const thinkingBlocks = content.filter(b => b.type === 'thinking')
      const textBlocks = content.filter(b => b.type === 'text')
      return (
        <>
          {thinkingBlocks.length > 0 && (
            <Box sx={{ mb: 1 }}>
              {thinkingBlocks.map((block, i) => (
                <Box key={i} sx={{ mb: 0.5 }}>
                  <Chip label="Thinking" size="small" color="primary" variant="outlined" sx={{ mb: 0.5 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontStyle: 'italic',
                      whiteSpace: 'pre-wrap',
                      pl: 1,
                      borderLeft: '2px solid',
                      borderColor: 'primary.main',
                      fontSize: '0.8rem',
                    }}
                  >
                    {block.thinking}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          {textBlocks.map((block, i) => (
            <Box key={i} sx={markdownSx}>
              <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
                {convertMathDelimiters(block.text)}
              </ReactMarkdown>
            </Box>
          ))}
        </>
      )
    }
    return null
  }

  // Display label for current prompt config
  const promptLabel = activePromptTitle || `${activeProvider} / ${activeModel}`

  return (
    <Draggable handle=".popup-drag-handle" nodeRef={nodeRef}>
      <Paper
        ref={nodeRef}
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 24,
          width: 420,
          height: 500,
          zIndex: 1300,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        {/* Header */}
        <Box
          className="popup-drag-handle"
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 1,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
            userSelect: 'none',
          }}
        >
          <DragIndicatorIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="subtitle2" sx={{ mr: 1 }}>
            Quick Chat
          </Typography>
          <Chip
            label={promptLabel}
            size="small"
            onClick={(e) => setPromptMenuAnchor(e.currentTarget)}
            sx={{
              height: 20,
              fontSize: '0.65rem',
              maxWidth: 150,
              cursor: 'pointer',
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'inherit',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              flexShrink: 1,
              overflow: 'hidden',
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title={contextAware ? 'Context-aware mode' : 'Standalone mode'}>
            <Switch
              size="small"
              checked={contextAware}
              onChange={(e) => setContextAware(e.target.checked)}
              sx={{
                '& .MuiSwitch-thumb': { bgcolor: 'white' },
                '& .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            />
          </Tooltip>
          <IconButton size="small" onClick={onClose} sx={{ color: 'inherit', ml: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Prompt selection menu */}
        <Menu
          anchorEl={promptMenuAnchor}
          open={Boolean(promptMenuAnchor)}
          onClose={() => setPromptMenuAnchor(null)}
        >
          {prompts.map((p) => (
            <MenuItem
              key={p.id}
              onClick={() => handleSelectPrompt(p)}
              selected={activePromptTitle === p.title}
              sx={{ py: 0.75 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.85rem', bgcolor: 'primary.main' }}>
                  {p.icon}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={p.title}
                secondary={`${p.provider} - ${p.model}`}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption', fontSize: '0.65rem' }}
              />
            </MenuItem>
          ))}
        </Menu>

        {/* Context indicator */}
        {contextAware && Array.isArray(contextMessages) && contextMessages.length > 0 && (
          <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'info.light' }}>
            <Typography variant="caption" sx={{ color: 'info.contrastText' }}>
              With context ({contextMessages.length} messages)
            </Typography>
          </Box>
        )}

        {/* Messages area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, bgcolor: 'grey.50' }}>
          {messages.length === 0 && !streamingMessage && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                Ask a quick question...
              </Typography>
            </Box>
          )}

          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 1,
              }}
            >
              <Box
                sx={{
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.5,
                  }}
                >
                  {msg.role === 'user'
                    ? <PersonIcon sx={{ fontSize: 14, color: 'white' }} />
                    : <SmartToyIcon sx={{ fontSize: 14, color: 'white' }} />
                  }
                </Box>
                <Paper
                  sx={{
                    p: 1,
                    bgcolor: msg.isError ? 'error.light' : msg.role === 'user' ? 'primary.light' : 'white',
                    fontSize: '0.875rem',
                  }}
                >
                  {renderContent(msg.content)}
                </Paper>
              </Box>
            </Box>
          ))}

          {/* Streaming message */}
          {streamingMessage && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
              <Box sx={{ maxWidth: '85%', display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.5,
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 14, color: 'white' }} />
                </Box>
                <Paper sx={{ p: 1, bgcolor: 'white', fontSize: '0.875rem' }}>
                  {streamingMessage.thinking && (
                    <Box sx={{ mb: 0.5 }}>
                      <Chip label="Thinking" size="small" color="primary" variant="outlined" sx={{ mb: 0.5 }} />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          fontStyle: 'italic',
                          whiteSpace: 'pre-wrap',
                          pl: 1,
                          borderLeft: '2px solid',
                          borderColor: 'primary.main',
                          fontSize: '0.75rem',
                        }}
                      >
                        {streamingMessage.thinking}
                      </Typography>
                    </Box>
                  )}
                  {streamingMessage.content && (
                    <Box sx={markdownSx}>
                      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
                        {convertMathDelimiters(streamingMessage.content)}
                      </ReactMarkdown>
                    </Box>
                  )}
                  <CircularProgress size={12} sx={{ mt: 0.5 }} />
                </Paper>
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Input area */}
        <Box sx={{ display: 'flex', gap: 0.5, p: 1, borderTop: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            multiline
            maxRows={3}
            autoFocus
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!inputMessage.trim() || isLoading}
            size="small"
          >
            {isLoading ? <CircularProgress size={20} /> : <SendIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Paper>
    </Draggable>
  )
}

export default PopupChat
