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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import MoreVertIcon from '@mui/icons-material/MoreVert'

const STORAGE_KEY = 'ai-chat-app-chats'

function ChatsScreen({ onChatClick }) {
  const [chats, setChats] = useState([])

  useEffect(() => {
    const savedChats = localStorage.getItem(STORAGE_KEY)
    if (savedChats) {
      setChats(JSON.parse(savedChats))
    } else {
      const initialChats = [
        {
          id: Date.now(),
          title: 'My First Chat',
          provider: 'Anthropic',
          lastMessage: 'Start chatting...',
          timestamp: new Date().toISOString(),
          messages: [],
          model: 'claude-sonnet-4-5-20250929',
        },
      ]
      setChats(initialChats)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialChats))
    }
  }, [])

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
    }
  }, [chats])

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
    const newChat = {
      id: Date.now(),
      title: `New Chat ${chats.length + 1}`,
      provider: 'Anthropic',
      lastMessage: 'Start chatting...',
      timestamp: new Date().toISOString(),
      messages: [],
      model: 'claude-sonnet-4-5-20250929',
    }
    setChats([newChat, ...chats])
    if (onChatClick) {
      onChatClick(newChat.id)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <SmartToyIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AI Chat App
          </Typography>
          <IconButton color="inherit">
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ flex: 1, py: 2, overflow: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
          Your Chats
        </Typography>

        <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          {chats.map((chat, index) => (
            <Box key={chat.id}>
              {index > 0 && <Divider />}
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleChatClick(chat.id)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <SmartToyIcon />
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

        {chats.length === 0 && (
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
            <Typography variant="h6">No chats yet</Typography>
            <Typography variant="body2">
              Start a new chat to get started
            </Typography>
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
    </Box>
  )
}

export default ChatsScreen
