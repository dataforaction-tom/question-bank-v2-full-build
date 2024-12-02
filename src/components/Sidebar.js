import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CustomButton from './Button';
import TagManager from './TagManager';
import BillingPortal from './BillingPortal';
import { CreditCard } from '@mui/icons-material';
import PublicIcon from '@mui/icons-material/Public';
import DashboardIcon from '@mui/icons-material/Dashboard';

const Sidebar = ({ 
  sidebarOpen, 
  toggleSidebar, 
  sortBy, 
  toggleSortBy, 
  viewMode, 
  setViewMode, 
  selectedOrganizationId,
  isAdmin,
  currentOrganization,
  onTogglePublicQuestions,
  showPublicQuestions
}) => {
  const navigate = useNavigate();
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  const goToMembersPage = () => {
    if (selectedOrganizationId) {
      navigate(`/group-members/${selectedOrganizationId}`);
    }
  };

  const handleManageTags = () => {
    setIsTagManagerOpen(true);
  };

  return (
    <>
      <div className={`bg-gray-100 h-screen fixed left-0 top-0 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="flex justify-between items-center p-4">
          {sidebarOpen && <Typography variant="h6">Group view options</Typography>}
          <button onClick={toggleSidebar} className="p-2 rounded-full hover:bg-gray-200">
            {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </button>
        </div>
        <div className={`flex flex-col space-y-2 ${sidebarOpen ? 'px-4' : 'px-2'}`}>
          <CustomButton 
            type="ChangeView"
            onClick={() => setViewMode('overview')}
            active={viewMode === 'overview'}
            className="w-full"
          >
            {sidebarOpen ? (
              <div className="flex items-center">
                <DashboardIcon className="mr-2" />
                Overview
              </div>
            ) : (
              <DashboardIcon />
            )}
          </CustomButton>
          <CustomButton 
            type="ChangeView"
            onClick={toggleSortBy}
            className="w-full"
          >
            {sidebarOpen ? (sortBy === 'manual_rank' ? 'Manual Ranking' : 'Continuously Updated') : 'S'}
          </CustomButton>
          <CustomButton 
            type="ChangeView"
            onClick={() => setViewMode('table')}
            active={viewMode === 'table'}
            className="w-full"
          >
            {sidebarOpen ? 'Table View' : 'T'}
          </CustomButton>
          <CustomButton 
            type="ChangeView"
            onClick={() => setViewMode('cards')}
            active={viewMode === 'cards'}
            className="w-full"
          >
            {sidebarOpen ? 'Card View' : 'C'}
          </CustomButton>
          <CustomButton 
            type="ChangeView"
            onClick={() => setViewMode('kanban')}
            active={viewMode === 'kanban'}
            className="w-full"
          >
            {sidebarOpen ? 'Kanban View' : 'K'}
          </CustomButton>
          <CustomButton 
            type="ChangeView"
            onClick={() => setViewMode('elo-ranking')}
            active={viewMode === 'elo-ranking'}
            className="w-full"
          >
            {sidebarOpen ? 'ELO Ranking' : 'E'}
          </CustomButton>
          <CustomButton 
            type="ChangeView"
            onClick={() => setViewMode('manual-ranking')}
            active={viewMode === 'manual-ranking'}
            className="w-full"
          >
            {sidebarOpen ? 'Manual Ranking' : 'M'}
          </CustomButton>
          
          {/* Add a spacer */}
          <div className="flex-grow"></div>
          
          {/* Add this button before the existing management buttons */}
          <CustomButton
            type="Action"
            onClick={onTogglePublicQuestions}
            className="w-full"
          >
            {sidebarOpen ? (
              <div className="flex items-center">
                <PublicIcon className="mr-2" />
                {showPublicQuestions ? 'Hide Public Questions' : 'Show Public Questions'}
              </div>
            ) : (
              <PublicIcon />
            )}
          </CustomButton>
          
          {/* Manage Tags button */}
          <CustomButton 
            type="Action"
            onClick={handleManageTags}
            className="w-full"
            disabled={!selectedOrganizationId || !isAdmin}
          >
            {sidebarOpen ? (
              <div className="flex items-center">
                <LocalOfferIcon className="mr-2" />
                Manage Tags
              </div>
            ) : (
              <LocalOfferIcon />
            )}
          </CustomButton>
          
          {/* Billing Portal Button */}
          {sidebarOpen ? (
            
            <BillingPortal 
              organizationId={selectedOrganizationId}
              disabled={!selectedOrganizationId || !isAdmin}
            />
          ) : (
            <CustomButton
              type="Action"
              onClick={() => {}}
              disabled={!selectedOrganizationId || !isAdmin}
              className="w-full"
            >
              <CreditCard />
            </CustomButton>
          )}
          
          {/* Manage Members button */}
          <CustomButton 
            type="Action"
            onClick={goToMembersPage}
            className="w-full"
            disabled={!selectedOrganizationId}
          >
            {sidebarOpen ? (
              <div className="flex items-center">
                <PeopleIcon className="mr-2" />
                Manage Members
              </div>
            ) : (
              <PeopleIcon />
            )}
          </CustomButton>
        </div>
      </div>

      {/* TagManager Dialog */}
      <Dialog 
        open={isTagManagerOpen} 
        onClose={() => setIsTagManagerOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Manage Organization Tags</DialogTitle>
        <DialogContent>
          <TagManager 
            organizationId={selectedOrganizationId}
            isAdmin={isAdmin}
            mode="manage"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTagManagerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar;
