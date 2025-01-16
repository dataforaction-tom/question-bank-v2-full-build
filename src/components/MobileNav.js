import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BottomNavigation, 
  BottomNavigationAction, 
  Paper,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { 
  ViewModule as CardsIcon,
  Leaderboard as EloIcon,
  Sort as ManualRankIcon,
  Dashboard as OverviewIcon,
  Public as PublicIcon,
  LocalOffer as TagIcon,
  People as PeopleIcon,
  CreditCard as BillingIcon,
  MoreVert as MoreIcon,
  ViewDay as SortIcon
} from '@mui/icons-material';
import TagManager from './TagManager';
import BillingPortal from './BillingPortal';
import { Snackbar, Alert } from '@mui/material';


const MobileNav = ({ 
  viewMode, 
  setViewMode,
  sortBy,
  toggleSortBy,
  onTogglePublicQuestions,
  showPublicQuestions,
  selectedOrganizationId,
  isAdmin,
  currentOrganization
}) => {
  const navigate = useNavigate();
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [showUnsupportedMessage, setShowUnsupportedMessage] = useState(false);

   // Check and redirect if on unsupported view
   useEffect(() => {
    if (['table', 'kanban'].includes(viewMode)) {
      setViewMode('cards');
      setShowUnsupportedMessage(true);
    }
  }, [viewMode, setViewMode]);

  // Primary navigation actions
  const primaryActions = [
    { label: 'Overview', value: 'overview', icon: <OverviewIcon /> },
    { label: 'Cards', value: 'cards', icon: <CardsIcon /> },
    { label: 'More', value: 'more', icon: <MoreIcon /> }
  ];

  // Speed dial actions (secondary menu)
  const speedDialActions = [
        {
      icon: <EloIcon />,
      name: 'Group Ranking',
      onClick: () => setViewMode('elo-ranking')
    },
    {
      icon: <ManualRankIcon />,
      name: 'Manual Ranking',
      onClick: () => setViewMode('manual-ranking')
    },
    {
      icon: <SortIcon />,
      name: `Sort: ${sortBy === 'manual_rank' ? 'Manual' : 'Continuous'}`,
      onClick: toggleSortBy
    },
    {
      icon: <PublicIcon />,
      name: `${showPublicQuestions ? 'Hide' : 'Show'} Public Questions`,
      onClick: onTogglePublicQuestions
    }
  ];

  // Admin-only actions
  const adminActions = [
    {
      icon: <TagIcon />,
      name: 'Manage Tags',
      onClick: () => setIsTagManagerOpen(true),
      adminOnly: true
    },
    {
      icon: <BillingIcon />,
      name: 'Billing',
      onClick: () => {
        // Handle billing portal navigation
      },
      adminOnly: true
    },
    {
      icon: <PeopleIcon />,
      name: 'Manage Members',
      onClick: () => navigate(`/group-members/${selectedOrganizationId}`),
      adminOnly: false
    }
  ];

  // Filter admin actions based on permissions
  const filteredAdminActions = adminActions.filter(action => 
    !action.adminOnly || (action.adminOnly && isAdmin)
  );

  // Combine all speed dial actions
  const allSpeedDialActions = [...speedDialActions, ...filteredAdminActions];

  return (
    <>
      {/* Primary Bottom Navigation */}
      <Paper 
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: 1000,
          display: { xs: 'block', md: 'none' } 
        }} 
        elevation={3}
        
      >
        <BottomNavigation
          value={viewMode}
          className="bg-gradient-to-r from-slate-950 to-sky-900 text-white"
          onChange={(event, newValue) => {
            if (newValue === 'more') {
              setIsSpeedDialOpen(true);
            } else {
              setViewMode(newValue);
            }
          }}
          showLabels
        >
          {primaryActions.map((action) => (
            <BottomNavigationAction 
              key={action.value}
              label={action.label}
              value={action.value}
              icon={action.icon}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: 'white'
                }
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>

      {/* Speed Dial for Secondary Actions */}
      <SpeedDial
        ariaLabel="Mobile Navigation SpeedDial"
        sx={{ 
          position: 'fixed', 
          bottom: 80, 
          right: 16,
          display: { xs: 'flex', md: 'none' },
          '& .MuiFab-primary': { // Main speed dial button
            background: 'linear-gradient(to right, rgb(15, 23, 42), rgb(3, 105, 161))'
          }
        }}
        icon={<SpeedDialIcon className="text-white" />}
        onClose={() => setIsSpeedDialOpen(false)}
        onOpen={() => setIsSpeedDialOpen(true)}
        open={isSpeedDialOpen}
        direction="up"
        classes={{
          actions: 'space-y-2'
        }}
      >
        {allSpeedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={<div className="text-slate-900">{action.icon}</div>}
            tooltipTitle={
              <div className="px-4 py-2 text-sm font-medium whitespace-nowrap bg-slate-900 text-white rounded shadow-lg">
                {action.name}
              </div>
            }
            tooltipOpen
            className="!bg-white hover:!bg-gray-50"
            onClick={() => {
              action.onClick();
              setIsSpeedDialOpen(false);
            }}
          />
        ))}
      </SpeedDial>

      {/* Tag Manager Dialog */}
      <Dialog 
        open={isTagManagerOpen} 
        onClose={() => setIsTagManagerOpen(false)}
        fullScreen // Full screen on mobile
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        <DialogTitle className="text-xl text-white font-bold text-center bg-gradient-to-r from-slate-950 to-sky-900">
          Manage Group Tags
        </DialogTitle>
        <DialogContent>
          <TagManager 
            organizationId={selectedOrganizationId}
            isAdmin={isAdmin} 
            mode="manage"
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsTagManagerOpen(false)}
            fullWidth
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={showUnsupportedMessage}
        autoHideDuration={6000}
        onClose={() => setShowUnsupportedMessage(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowUnsupportedMessage(false)} 
          severity="info"
          sx={{ width: '100%' }}
        >
          Table and Kanban views are only available on desktop devices
        </Alert>
      </Snackbar>
    </>
  );
};

export default MobileNav;
