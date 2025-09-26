import React, { useState, useEffect } from 'react';
import { Users, LogOut, MessageSquare, Settings } from 'lucide-react';

import FilterTabs from './components/FilterTabs';
import LeadsTable from './components/LeadsTable';
import CommentModal from './components/CommentModal';
import LeadDetailsModal from './components/LeadDetailsModal';
import WhatsappOperationsView from './components/WhatsappOperationsView';
import AdminRulesManagementView from './components/AdminRulesManagementView';
import { Lead, FilterTab } from './types/leads';
import { LeadService } from './services/leadService';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import { supabase } from './lib/supabase';

type AppView = 'lead_management' | 'whatsapp_operations' | 'admin_rules';

function App() {
  const { user, session, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('lead_management');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    sessionId: string;
    currentStatus: string;
    newStatus: string;
  }>({
    isOpen: false,
    sessionId: '',
    currentStatus: '',
    newStatus: ''
  });
  const [leadCounts, setLeadCounts] = useState({
    all: 0,
    form_completions: 0,
    qualified: 0,
    counseling_booked: 0,
    unassigned: 0
  });
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
  }>({
    isOpen: false,
    sessionId: null,
  });

  // Fetch user role when session changes
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!session?.user?.id) {
        setUserRole(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('counselors')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        } else {
          setUserRole(data?.role || null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [session]);

  // Fetch leads from Supabase (joins form_sessions with crm_leads and counselors)
  useEffect(() => {
    if (!session) return; // Don't fetch data if not authenticated
    
    const fetchLeads = async () => {
      setIsLoadingData(true);
      try {
        const { data, counts } = await LeadService.getLeads(activeTab);
        setLeads(data);
        setLeadCounts(counts);
      } catch (error) {
        console.error('Error fetching leads:', error);
        setLeads([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchLeads();
  }, [activeTab, session]);

  const handleStatusChangeRequest = (sessionId: string, newStatus: string) => {
    if (!user) {
      alert('You must be logged in to update lead status');
      return;
    }

    // Find current status
    const lead = leads.find(l => l.session_id === sessionId);
    const currentStatus = lead?.lead_status || '01_yet_to_contact';

    // Don't show modal if status is the same
    if (currentStatus === newStatus) {
      return;
    }

    // Open comment modal
    setCommentModal({
      isOpen: true,
      sessionId,
      currentStatus,
      newStatus
    });
  };

  const handleCounselorChangeRequest = async (sessionId: string, counselorId: string | null, counselorName: string, comment: string) => {
    if (!user) {
      alert('You must be logged in to assign counselors');
      return;
    }

    console.log(`🚀 STARTING COUNSELOR ASSIGNMENT: session=${sessionId}, counselor=${counselorName} (${counselorId})`);
    setIsLoadingData(true);
    
    try {
      await LeadService.assignLead(sessionId, counselorId, comment);
      
      console.log('🔄 REFRESHING LEADS DATA...');
      // Refresh leads
      const { data, counts } = await LeadService.getLeads(activeTab);
      console.log('📊 NEW COUNTS AFTER ASSIGNMENT:', counts);
      console.log('📋 NEW LEADS DATA AFTER ASSIGNMENT:', data.length, 'leads');
      if (activeTab === 'unassigned') {
        console.log('🔍 UNASSIGNED TAB: Should show', counts.unassigned, 'leads');
      }
      setLeads(data);
      setLeadCounts(counts);
      
      console.log(`Counselor updated for session ${sessionId}: ${counselorName}`);
      console.log(`✅ UI UPDATED: session ${sessionId} ${counselorId ? `assigned to ${counselorName}` : 'unassigned'}`);
    } catch (error) {
      console.error('Error updating counselor assignment:', error);
      alert(`Error updating assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleBulkAssign = async (sessionIds: string[], counselorId: string | null, counselorName: string, comment: string) => {
    if (!user) {
      alert('You must be logged in to assign counselors');
      return;
    }

    console.log(`🚀 STARTING BULK ASSIGNMENT: ${sessionIds.length} leads to ${counselorName} (${counselorId})`);
    setIsLoadingData(true);
    
    try {
      // Process assignments sequentially to avoid overwhelming the database
      for (const sessionId of sessionIds) {
        await LeadService.assignLead(sessionId, counselorId, comment);
      }
      
      console.log('🔄 REFRESHING LEADS DATA AFTER BULK ASSIGNMENT...');
      // Refresh leads
      const { data, counts } = await LeadService.getLeads(activeTab);
      console.log('📊 NEW COUNTS AFTER BULK ASSIGNMENT:', counts);
      setLeads(data);
      setLeadCounts(counts);
      
      console.log(`✅ BULK ASSIGNMENT COMPLETE: ${sessionIds.length} leads assigned to ${counselorName}`);
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      alert(`Error in bulk assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error; // Re-throw to let the modal handle the error state
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleStatusChange = async (comment: string) => {
    const { sessionId, newStatus } = commentModal;
    
    setIsLoadingData(true);
    
    try {
      // Use the authenticated user's ID as the counselor ID
      const counselorId = user.id;
      
      await LeadService.updateLeadStatus(sessionId, newStatus as any, counselorId, comment);
      
      // Refresh leads
      const { data, counts } = await LeadService.getLeads(activeTab);
      setLeads(data);
      setLeadCounts(counts);
      
      // Close modal
      setCommentModal({
        isOpen: false,
        sessionId: '',
        currentStatus: '',
        newStatus: ''
      });
      
      console.log(`Status updated for session ${sessionId}: ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`Error updating status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCloseCommentModal = () => {
    setCommentModal({
      isOpen: false,
      sessionId: '',
      currentStatus: '',
      newStatus: ''
    });
  };

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    // This will trigger the useEffect to fetch filtered data
  };

  const handleRowClick = (sessionId: string) => {
    setDetailsModal({
      isOpen: true,
      sessionId,
    });
  };

  const handleCloseDetailsModal = () => {
    setDetailsModal({
      isOpen: false,
      sessionId: null,
    });
  };
  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth form if not authenticated
  if (!session) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-16">
            <div className="flex items-center min-w-0 flex-1">
              <Users className="w-8 h-8 text-blue-600 mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg lg:text-xl font-semibold text-gray-900 truncate">
                  Beacon House CRM
                </h1>
                <p className="text-xs lg:text-sm text-gray-600 truncate">
                  {currentView === 'lead_management' ? 'Lead Management System' : 'WhatsApp Operations'}
                </p>
              </div>
            </div>

            {/* View Toggle - Desktop */}
            <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-lg p-1 mr-4">
              <button
                onClick={() => setCurrentView('lead_management')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'lead_management'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1" />
                Lead Management
              </button>
              <button
                onClick={() => setCurrentView('whatsapp_operations')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'whatsapp_operations'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="w-4 h-4 inline mr-1" />
                WhatsApp
              </button>
              {userRole === 'admin' && (
                <button
                  onClick={() => setCurrentView('admin_rules')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'admin_rules'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Settings className="w-4 h-4 inline mr-1" />
                  Rules
                </button>
              )}
            </div>
            
            {/* Desktop User Info */}
            <div className="hidden sm:flex items-center space-x-4 flex-shrink-0">
              <span className="text-sm text-gray-600">
                Welcome, {user?.email?.split('@')[0] || 'User'}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user?.email?.charAt(0) || 'U').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Mobile User Avatar Only */}
            <div className="sm:hidden flex-shrink-0">
              <div className="flex items-center space-x-2">
                {/* Mobile View Toggle */}
                <div className="flex space-x-1">
                  <button
                    onClick={() => setCurrentView('lead_management')}
                    className={`p-2 rounded-md transition-colors ${
                      currentView === 'lead_management'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    title="Lead Management"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentView('whatsapp_operations')}
                    className={`p-2 rounded-md transition-colors ${
                      currentView === 'whatsapp_operations'
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    title="WhatsApp Operations"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(user?.email?.charAt(0) || 'U').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Conditional Content Based on Current View */}
        {currentView === 'lead_management' ? (
          <>
            {/* Sticky Filter Tabs */}
            <div className="bg-white sticky top-16 z-10 border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
                <FilterTabs 
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  leadCounts={leadCounts}
                />
              </div>
            </div>

            {/* Scrollable Content Area - Now with more space */}
            <div className="flex-1 bg-gray-50" style={{ height: 'calc(100vh - 128px)' }}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full">
                <LeadsTable 
                  leads={leads}
                  isLoading={isLoadingData}
                  onStatusChange={handleStatusChangeRequest}
                  onCounselorChange={handleCounselorChangeRequest}
                  onBulkAssign={handleBulkAssign}
                  onRowClick={handleRowClick}
                />
              </div>
            </div>
          </>
        ) : currentView === 'whatsapp_operations' ? (
          <>
            {/* WhatsApp Operations View */}
            <div className="flex-1 bg-gray-50">
              <WhatsappOperationsView />
            </div>
          </>
        )}
      </div>

      {/* Comment Modal */}
      <CommentModal
        isOpen={commentModal.isOpen}
        onClose={handleCloseCommentModal}
        onSubmit={handleStatusChange}
        currentStatus={commentModal.currentStatus}
        newStatus={commentModal.newStatus}
        isLoading={isLoadingData}
      />

      {/* Lead Details Modal */}
      <LeadDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={handleCloseDetailsModal}
        sessionId={detailsModal.sessionId}
        onStatusChange={async (sessionId, newStatus, comment) => {
          const counselorId = user!.id;
          await LeadService.updateLeadStatus(sessionId, newStatus, counselorId, comment);
          // Refresh leads data
          const { data, counts } = await LeadService.getLeads(activeTab);
          setLeads(data);
          setLeadCounts(counts);
        }}
        onCounselorChange={async (sessionId, counselorId, counselorName, comment) => {
          await LeadService.assignLead(sessionId, counselorId, comment);
          // Refresh leads data
          const { data, counts } = await LeadService.getLeads(activeTab);
          setLeads(data);
          setLeadCounts(counts);
        }}
      />
    </div>
  );
}

export default App;