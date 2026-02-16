import { useState, useEffect } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Fab,
  IconButton,
  Divider,
  Container,
  CircularProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import { chatsAPI } from '../api/chats'
import ProviderSettingsDialog from './ProviderSettingsDialog'
import PromptsDialog from './PromptsDialog'

function ChatsScreen({ onChatClick, themeMode, onToggleTheme }) {
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [selectedChat, setSelectedChat] = useState(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [promptsDialogOpen, setPromptsDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    try {
      const loadedChats = await chatsAPI.getAll()
      if (loadedChats.length === 0) {
        // Create initial chat if none exist
        const initialChat = {
          id: Date.now(),
          title: 'My First Chat',
          provider: 'Anthropic',
          lastMessage: 'Start chatting...',
          timestamp: new Date().toISOString(),
          messagesMap: {},
          rootMessageIds: [],
          currentBranchPath: [],
          model: 'claude-sonnet-4-5-20250929',
          emoji: '💬', // Default emoji
        }
        await chatsAPI.save(initialChat)
        setChats([initialChat])
      } else {
        setChats(loadedChats)
      }
    } catch (error) {
      console.error('Error loading chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const handleChatClick = (chatId) => {
    if (onChatClick) {
      onChatClick(chatId)
    }
  }

  const handleNewChat = () => {
    setPromptsDialogOpen(true)
  }

  const handleSelectPrompt = async (prompt) => {
    const newChat = {
      id: Date.now(),
      title: `New Chat ${chats.length + 1}`,
      provider: prompt.provider,
      lastMessage: 'Start chatting...',
      timestamp: new Date().toISOString(),
      messagesMap: {},
      rootMessageIds: [],
      currentBranchPath: [],
      model: prompt.model,
      emoji: prompt.icon,
      systemPrompt: prompt.systemPrompt, // Store system prompt for API calls
    }

    try {
      await chatsAPI.save(newChat)
      setChats([newChat, ...chats])
      setPromptsDialogOpen(false)
      if (onChatClick) {
        onChatClick(newChat.id)
      }
    } catch (error) {
      console.error('Error creating new chat:', error)
    }
  }

  const handleSettingsConfirm = async (settings) => {
    const { provider, model } = settings

    const newChat = {
      id: Date.now(),
      title: `New Chat ${chats.length + 1}`,
      provider: provider.charAt(0).toUpperCase() + provider.slice(1),
      lastMessage: 'Start chatting...',
      timestamp: new Date().toISOString(),
      messagesMap: {},
      rootMessageIds: [],
      currentBranchPath: [],
      model: model,
      emoji: '💬', // Default emoji until first message
    }

    try {
      await chatsAPI.save(newChat)
      setChats([newChat, ...chats])
      setSettingsDialogOpen(false)
      if (onChatClick) {
        onChatClick(newChat.id)
      }
    } catch (error) {
      console.error('Error creating new chat:', error)
    }
  }

  const handleMenuOpen = (event, chat) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setSelectedChat(chat)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedChat(null)
  }

  const handleRenameClick = () => {
    setNewTitle(selectedChat.title)
    setRenameDialogOpen(true)
    setMenuAnchor(null) // Close menu but keep selectedChat
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
    setMenuAnchor(null) // Close menu but keep selectedChat
  }

  const handleRenameConfirm = async () => {
    if (!newTitle.trim() || !selectedChat) return

    try {
      const updatedChat = {
        ...selectedChat,
        title: newTitle.trim(),
      }
      await chatsAPI.save(updatedChat)
      setChats(chats.map(chat =>
        chat.id === selectedChat.id ? updatedChat : chat
      ))
      setRenameDialogOpen(false)
      setSelectedChat(null)
      setNewTitle('')
    } catch (error) {
      console.error('Error renaming chat:', error)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedChat) return

    try {
      await chatsAPI.delete(selectedChat.id)
      setChats(chats.filter(chat => chat.id !== selectedChat.id))
      setDeleteDialogOpen(false)
      setSelectedChat(null)
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  const handleTogglePin = async (event, chat) => {
    event.stopPropagation()

    try {
      const updatedChat = {
        ...chat,
        isPinned: !chat.isPinned
      }
      await chatsAPI.save(updatedChat)
      setChats(chats.map(c => c.id === chat.id ? updatedChat : c))
      setMenuAnchor(null)
      setSelectedChat(null)
    } catch (error) {
      console.error('Error toggling pin:', error)
    }
  }

  const fuzzyMatch = (str, query) => {
    if (!query) return true
    const lowerStr = str.toLowerCase()
    const lowerQuery = query.toLowerCase()

    // Simple contains check (can be made more sophisticated)
    return lowerStr.includes(lowerQuery)
  }

  const getMessageText = (content) => {
    if (typeof content === 'string') {
      return content
    }
    if (Array.isArray(content)) {
      return content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join(' ')
    }
    return ''
  }

  const searchInChat = (chat, query) => {
    if (!query.trim()) return { matches: true, matchType: 'none' }

    // Check title first (higher priority)
    if (fuzzyMatch(chat.title, query)) {
      return { matches: true, matchType: 'title' }
    }

    // Check message content (lower priority)
    if (chat.messagesMap) {
      const messageTexts = Object.values(chat.messagesMap).map(msg =>
        getMessageText(msg.content)
      ).join(' ')

      if (fuzzyMatch(messageTexts, query)) {
        return { matches: true, matchType: 'content' }
      }
    }

    return { matches: false, matchType: 'none' }
  }

  const getFilteredAndSortedChats = () => {
    let filteredChats = chats

    // Apply search filter if query exists
    if (searchQuery.trim()) {
      filteredChats = chats
        .map(chat => ({
          chat,
          ...searchInChat(chat, searchQuery)
        }))
        .filter(result => result.matches)
        .sort((a, b) => {
          // Title matches come first
          if (a.matchType === 'title' && b.matchType !== 'title') return -1
          if (a.matchType !== 'title' && b.matchType === 'title') return 1
          // Otherwise maintain original order
          return 0
        })
        .map(result => result.chat)
    }

    // Sort by pinned status (pinned chats first)
    return filteredChats.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      // If both pinned or both not pinned, maintain timestamp order
      return new Date(b.timestamp) - new Date(a.timestamp)
    })
  }

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  if (loading) {
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
          <SmartToyIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AI Chat App
          </Typography>
          <IconButton color="inherit" onClick={onToggleTheme} sx={{ mr: 1 }}>
            {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <IconButton color="inherit">
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ flex: 1, py: 2, overflow: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
          Your Chats
        </Typography>

        {/* Search Field */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: searchQuery && (
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  edge="end"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ),
            }}
          />
        </Box>

        <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          {getFilteredAndSortedChats().map((chat, index) => (
            <Box key={chat.id}>
              {index > 0 && <Divider />}
              <ListItem
                disablePadding
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <IconButton
                      onClick={(e) => handleTogglePin(e, chat)}
                      sx={{
                        color: chat.isPinned ? 'primary.main' : 'action.disabled',
                      }}
                    >
                      {chat.isPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="more"
                      onClick={(e) => handleMenuOpen(e, chat)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemButton onClick={() => handleChatClick(chat.id)} sx={{ pr: 12 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                      {chat.emoji || <SmartToyIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                        <Typography variant="body1" noWrap>
                          {chat.title}
                        </Typography>
                        {chat.isPinned && (
                          <PushPinIcon
                            sx={{
                              fontSize: '1rem',
                              color: 'primary.main',
                              transform: 'rotate(45deg)',
                              flexShrink: 0
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', ml: 2, flexShrink: 0 }}
                      >
                        {formatTimestamp(chat.timestamp)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'text.secondary'
                      }}
                    >
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{ color: 'text.primary' }}
                      >
                        {chat.provider}
                      </Typography>
                      {' — ' + chat.lastMessage}
                    </Typography>
                  </Box>
                </ListItemButton>
              </ListItem>
            </Box>
          ))}
        </List>

        {getFilteredAndSortedChats().length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              color: 'text.secondary',
            }}
          >
            <SmartToyIcon sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
            {searchQuery ? (
              <>
                <Typography variant="h6">No chats found</Typography>
                <Typography variant="body2">
                  Try a different search query
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h6">No chats yet</Typography>
                <Typography variant="body2">
                  Start a new chat to get started
                </Typography>
              </>
            )}
          </Box>
        )}
      </Container>

      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={handleNewChat}
      >
        <AddIcon />
      </Fab>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={(e) => {
          handleTogglePin(e, selectedChat)
        }}>
          {selectedChat?.isPinned ? (
            <>
              <PushPinOutlinedIcon sx={{ mr: 1 }} fontSize="small" />
              Unpin
            </>
          ) : (
            <>
              <PushPinIcon sx={{ mr: 1 }} fontSize="small" />
              Pin
            </>
          )}
        </MenuItem>
        <MenuItem onClick={handleRenameClick}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Rename
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => {
          setRenameDialogOpen(false)
          setSelectedChat(null)
          setNewTitle('')
        }}
      >
        <DialogTitle>Rename Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Chat Title"
            type="text"
            fullWidth
            variant="outlined"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameConfirm()
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRenameDialogOpen(false)
              setSelectedChat(null)
              setNewTitle('')
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleRenameConfirm} variant="contained">
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setSelectedChat(null)
        }}
      >
        <DialogTitle>Delete Chat</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedChat?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false)
              setSelectedChat(null)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Provider Settings Dialog */}
      <ProviderSettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        onConfirm={handleSettingsConfirm}
      />

      {/* Prompts Dialog */}
      <PromptsDialog
        open={promptsDialogOpen}
        onClose={() => setPromptsDialogOpen(false)}
        onSelectPrompt={handleSelectPrompt}
      />
    </Box>
  )
}

export default ChatsScreen
