import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Box,
  TextField,
  Typography,
  Divider,
  MenuItem,
  Select,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import { promptsAPI } from '../api/prompts'
import { createProvider, EmojiProvider } from '../providers'

function PromptsDialog({ open, onClose, onSelectPrompt }) {
  const [prompts, setPrompts] = useState([])
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [isTemporary, setIsTemporary] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    icon: '💬',
    provider: 'Anthropic',
    model: 'claude-sonnet-4-5-20250929',
    systemPrompt: ''
  })
  const [availableModels, setAvailableModels] = useState([])

  useEffect(() => {
    if (open) {
      loadPrompts()
    }
  }, [open])

  useEffect(() => {
    // Load available models when provider changes
    if (formData.provider) {
      try {
        const provider = createProvider(formData.provider.toLowerCase(), 'dummy-key')
        const models = provider.getModels()
        setAvailableModels(models)

        // Set default model if current model is not available for this provider
        if (!models.find(m => m.id === formData.model)) {
          setFormData(prev => ({ ...prev, model: models[0]?.id || '' }))
        }
      } catch (error) {
        console.error('Error loading models:', error)
        setAvailableModels([])
      }
    }
  }, [formData.provider])

  const loadPrompts = async () => {
    const loaded = await promptsAPI.getAll()
    setPrompts(loaded)
  }

  const handleNewPrompt = () => {
    setEditingPrompt({ id: Date.now() })
    setFormData({
      title: '',
      icon: '💬',
      provider: 'Anthropic',
      model: 'claude-sonnet-4-5-20250929',
      systemPrompt: ''
    })
  }

  const handleEditPrompt = (prompt) => {
    setEditingPrompt(prompt)
    setFormData({
      title: prompt.title,
      icon: prompt.icon,
      provider: prompt.provider,
      model: prompt.model,
      systemPrompt: prompt.systemPrompt || ''
    })
  }

  const handleSavePrompt = async () => {
    if (!formData.title.trim()) return

    let iconToUse = formData.icon

    // Generate AI icon if using default icon
    if (formData.icon === '💬') {
      try {
        const emojiProvider = new EmojiProvider(import.meta.env.VITE_ANTHROPIC_API_KEY || 'dummy-key')
        // Use system prompt if available, otherwise use title
        const textForEmoji = formData.systemPrompt.trim() || formData.title.trim()
        iconToUse = await emojiProvider.generateEmoji(textForEmoji)
      } catch (error) {
        console.error('Error generating emoji:', error)
        // Keep default icon if generation fails
      }
    }

    const prompt = {
      ...editingPrompt,
      ...formData,
      icon: iconToUse,
      timestamp: new Date().toISOString()
    }

    await promptsAPI.save(prompt)
    await loadPrompts()
    setEditingPrompt(null)
  }

  const handleDeletePrompt = async (promptId) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      await promptsAPI.delete(promptId)
      await loadPrompts()
    }
  }

  const handleSelectPrompt = (prompt) => {
    if (onSelectPrompt) {
      onSelectPrompt({ ...prompt, isTemporary })
    }
    setIsTemporary(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Prompt Templates</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {editingPrompt ? (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              {editingPrompt.id ? 'Edit Prompt' : 'New Prompt'}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Icon (Emoji)"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  sx={{ width: '100px' }}
                  inputProps={{ maxLength: 2 }}
                />
                <TextField
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  fullWidth
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={formData.provider}
                  label="Provider"
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                >
                  <MenuItem value="Anthropic">Anthropic</MenuItem>
                  <MenuItem value="Gemini">Gemini</MenuItem>
                  <MenuItem value="DeepSeek">DeepSeek</MenuItem>
                  <MenuItem value="Kimi">Kimi</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Model</InputLabel>
                <Select
                  value={formData.model}
                  label="Model"
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                >
                  {availableModels.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="System Prompt (Optional)"
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                multiline
                rows={4}
                fullWidth
                helperText="Sets the AI's behavior and context. Example: 'You are a helpful coding assistant'"
                placeholder="You are a helpful assistant..."
              />

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={() => setEditingPrompt(null)}>Cancel</Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSavePrompt}
                  disabled={!formData.title.trim()}
                >
                  Save
                </Button>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Select a prompt template to start a new chat
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleNewPrompt}
                size="small"
              >
                New Prompt
              </Button>
            </Box>

            <List>
              {prompts.map((prompt, index) => (
                <Box key={prompt.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <Box>
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditPrompt(prompt)
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePrompt(prompt.id)
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                    disablePadding
                  >
                    <ListItemButton onClick={() => handleSelectPrompt(prompt)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                          {prompt.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={prompt.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {prompt.provider}
                            </Typography>
                            {prompt.systemPrompt && (
                              <Typography component="span" variant="body2" sx={{ display: 'block' }}>
                                {prompt.systemPrompt.substring(0, 60)}
                                {prompt.systemPrompt.length > 60 ? '...' : ''}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </Box>
              ))}
            </List>

            <Divider sx={{ my: 1 }} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isTemporary}
                  onChange={(e) => setIsTemporary(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Temporary chat (deleted on close)
                </Typography>
              }
              sx={{ ml: 0.5 }}
            />

            {prompts.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No prompts yet. Create your first prompt template!
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default PromptsDialog
