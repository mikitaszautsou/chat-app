import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
} from '@mui/material'
import { getAvailableProviders, createProvider } from '../providers'
import { hasValidApiKey, getProviderDisplayName } from '../utils/providerUtils'

function ProviderSettingsDialog({ open, onClose, onConfirm }) {
  const [selectedProvider, setSelectedProvider] = useState('anthropic')
  const [selectedModel, setSelectedModel] = useState('')
  const [availableModels, setAvailableModels] = useState([])
  const [providers, setProviders] = useState([])
  const [warnings, setWarnings] = useState([])

  useEffect(() => {
    // Load available providers
    const availableProviders = getAvailableProviders()
    setProviders(availableProviders)

    // Set default provider if not already set
    if (!selectedProvider && availableProviders.length > 0) {
      setSelectedProvider(availableProviders[0])
    }
  }, [])

  useEffect(() => {
    // Load models when provider changes
    if (selectedProvider) {
      loadModelsForProvider(selectedProvider)
      checkApiKey(selectedProvider)
    }
  }, [selectedProvider])

  const loadModelsForProvider = (providerName) => {
    try {
      // Create a temporary provider instance to get models
      // We use a dummy API key just to get the model list
      const provider = createProvider(providerName, 'dummy-key-for-model-list')
      const models = provider.getModels()
      setAvailableModels(models)

      // Set default model if not already set or if models changed
      if (models.length > 0 && (!selectedModel || !models.find(m => m.id === selectedModel))) {
        setSelectedModel(models[0].id)
      }
    } catch (error) {
      console.error('Error loading models:', error)
      setAvailableModels([])
      setSelectedModel('')
    }
  }

  const checkApiKey = (providerName) => {
    const newWarnings = []

    if (!hasValidApiKey(providerName)) {
      newWarnings.push(
        `No API key configured for ${getProviderDisplayName(providerName)}. ` +
        `Please add your API key to the .env file.`
      )
    }

    setWarnings(newWarnings)
  }

  const handleProviderChange = (event) => {
    setSelectedProvider(event.target.value)
  }

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value)
  }

  const handleConfirm = () => {
    if (!selectedProvider || !selectedModel) {
      return
    }

    onConfirm({
      provider: selectedProvider,
      model: selectedModel,
    })
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Chat Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {warnings.map((warning, idx) => (
                <div key={idx}>{warning}</div>
              ))}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="provider-select-label">Provider</InputLabel>
            <Select
              labelId="provider-select-label"
              id="provider-select"
              value={selectedProvider}
              label="Provider"
              onChange={handleProviderChange}
            >
              {providers.map((provider) => (
                <MenuItem key={provider} value={provider}>
                  {getProviderDisplayName(provider)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="model-select-label">Model</InputLabel>
            <Select
              labelId="model-select-label"
              id="model-select"
              value={selectedModel}
              label="Model"
              onChange={handleModelChange}
              disabled={availableModels.length === 0}
            >
              {availableModels.map((model) => (
                <MenuItem key={model.id} value={model.id}>
                  {model.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedProvider || !selectedModel || warnings.length > 0}
        >
          Create Chat
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProviderSettingsDialog
