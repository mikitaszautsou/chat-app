import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Paper, Box, Typography, Badge } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StarIcon from '@mui/icons-material/Star';
import { getMessagePreview } from '../utils/treeUtils';

const TreeNode = memo(({ data }) => {
  const {
    role,
    content,
    timestamp,
    isInCurrentBranch,
    isCurrentNode,
    hasBranches,
    childCount,
  } = data;

  const preview = getMessagePreview(content, 30);
  const RoleIcon = role === 'user' ? PersonIcon : SmartToyIcon;

  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Handle type="target" position={Position.Top} />

      <Paper
        elevation={isCurrentNode ? 4 : 2}
        sx={{
          padding: 1.5,
          minWidth: 200,
          maxWidth: 250,
          border: isCurrentNode
            ? '2px solid'
            : isInCurrentBranch
            ? '2px solid'
            : '1px solid',
          borderColor: isCurrentNode
            ? 'primary.main'
            : isInCurrentBranch
            ? 'primary.light'
            : 'divider',
          backgroundColor: isCurrentNode ? 'primary.main' : 'background.paper',
          color: isCurrentNode ? 'primary.contrastText' : 'text.primary',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            elevation: 6,
            transform: 'translateY(-2px)',
          },
          position: 'relative',
        }}
      >
        {/* Current node indicator */}
        {isCurrentNode && (
          <StarIcon
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              fontSize: 16,
              color: 'primary.contrastText',
            }}
          />
        )}

        {/* Role icon and preview */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
          <RoleIcon
            sx={{
              fontSize: 18,
              flexShrink: 0,
              mt: 0.25,
              color: isCurrentNode ? 'primary.contrastText' : 'text.secondary',
            }}
          />
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              fontWeight: isInCurrentBranch ? 600 : 400,
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}
          >
            {preview || '[Empty message]'}
          </Typography>
        </Box>

        {/* Timestamp and branch indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              color: isCurrentNode ? 'primary.contrastText' : 'text.secondary',
              opacity: 0.8,
            }}
          >
            {formatTime(timestamp)}
          </Typography>

          {hasBranches && (
            <Badge
              badgeContent={childCount}
              color="secondary"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: 10,
                  height: 16,
                  minWidth: 16,
                  backgroundColor: isCurrentNode ? 'secondary.main' : 'secondary.light',
                },
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isCurrentNode
                    ? 'primary.contrastText'
                    : 'primary.main',
                }}
              />
            </Badge>
          )}
        </Box>
      </Paper>

      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

TreeNode.displayName = 'TreeNode';

export default TreeNode;
