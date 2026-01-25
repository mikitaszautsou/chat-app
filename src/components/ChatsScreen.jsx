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
import PaletteIcon from '@mui/icons-material/Palette'
import CheckIcon from '@mui/icons-material/Check'
import { chatsAPI } from '../api/chats'
import ProviderSettingsDialog from './ProviderSettingsDialog'

const COLOR_PRESETS = [
  { name: 'Blue', color: '#1976d2' },
  { name: 'Purple', color: '#9c27b0' },
  { name: 'Green', color: '#2e7d32' },
  { name: 'Orange', color: '#ed6c02' },
  { name: 'Red', color: '#d32f2f' },
  { name: 'Teal', color: '#00897b' },
  { name: 'Pink', color: '#c2185b' },
  { name: 'Indigo', color: '#3f51b5' },
]

function ChatsScreen({ onChatClick, themeMode, onToggleTheme, primaryColor, onColorChange }) {
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [selectedChat, setSelectedChat] = useState(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [colorMenuAnchor, setColorMenuAnchor] = useState(null)

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
    setSettingsDialogOpen(true)
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
    if (!searchQuery.trim()) {
      return chats
    }

    const searchResults = chats
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

    return searchResults
  }

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  const handleColorMenuOpen = (event) => {
    setColorMenuAnchor(event.currentTarget)
  }

  const handleColorMenuClose = () => {
    setColorMenuAnchor(null)
  }

  const handleColorSelect = (color) => {
    onColorChange(color)
    handleColorMenuClose()
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
          <IconButton color="inherit" onClick={handleColorMenuOpen} sx={{ mr: 1 }}>
            <PaletteIcon />
          </IconButton>
          <IconButton color="inherit">
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Color Picker Menu */}
      <Menu
        anchorEl={colorMenuAnchor}
        open={Boolean(colorMenuAnchor)}
        onClose={handleColorMenuClose}
      >
        {COLOR_PRESETS.map((preset) => (
          <MenuItem
            key={preset.color}
            onClick={() => handleColorSelect(preset.color)}
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                bgcolor: preset.color,
                borderRadius: 1,
                border: '2px solid',
                borderColor: 'divider',
              }}
            />
            <Typography>{preset.name}</Typography>
            {primaryColor === preset.color && (
              <CheckIcon fontSize="small" sx={{ ml: 'auto' }} />
            )}
          </MenuItem>
        ))}
      </Menu>

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
                  <IconButton
                    edge="end"
                    aria-label="more"
                    onClick={(e) => handleMenuOpen(e, chat)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                }
              >
                <ListItemButton onClick={() => handleChatClick(chat.id)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                      {chat.emoji || <SmartToyIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={chat.title}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: 'text.primary', display: 'inline' }}
                        >
                          {chat.provider}
                        </Typography>
                        {' — ' + chat.lastMessage}
                      </>
                    }
                    secondaryTypographyProps={{
                      sx: {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', ml: 2 }}
                  >
                    {formatTimestamp(chat.timestamp)}
                  </Typography>
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
            onKeyPress={(e) => {
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
    </Box>
  )
}

export default ChatsScreen
