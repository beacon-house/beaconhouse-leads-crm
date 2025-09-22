// WhatsApp Operations View - Main container for WhatsApp lead management
// Provides top-level orchestration for WhatsApp export functionality

import React, { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle } from 'lucide-react';
import WhatsappFilterTabs from './WhatsappFilterTabs';
import WhatsappLeadsTable from './WhatsappLeadsTable';
import { WhatsappLead, WhatsappFilterTab, WhatsappLeadCounts } from '../types/whatsappLeads';
import { WhatsappLeadService } from '../services/whatsappLeadService';

const WhatsappOperationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WhatsappFilterTab>('call_not_booked');
  const [leads, setLeads] = useState<WhatsappLead[]>([]);
  const [leadCounts, setLeadCounts] = useState<WhatsappLeadCounts>({
    call_not_booked: 0,
    call_booked_5_days: 0,
    call_booked_more_5_days: 0,
    exported_leads: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize WhatsApp leads on component mount
  useEffect(() => {
    initializeWhatsappLeads();
  }, []);

  // Fetch leads when active tab changes
  useEffect(() => {
    if (!isInitializing) {
      fetchWhatsappLeads();
    }
  }, [activeTab, isInitializing]);

  const initializeWhatsappLeads = async () => {
    console.log('🔄 Initializing WhatsApp operations view...');
    setIsInitializing(true);
    setError(null);
    
    try {
      await WhatsappLeadService.initializeWhatsappLeads();
      await fetchWhatsappLeads();
    } catch (error) {
      console.error('Error initializing WhatsApp leads:', error);
      setError('Failed to initialize WhatsApp leads. Please try refreshing the page.');
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchWhatsappLeads = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, counts } = await WhatsappLeadService.getWhatsappLeads(activeTab);
      setLeads(data);
      setLeadCounts(counts);
    } catch (error) {
      console.error('Error fetching WhatsApp leads:', error);
      setError('Failed to fetch WhatsApp leads. Please try again.');
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: WhatsappFilterTab) => {
    setActiveTab(tab);
  };

  const handleLeadsExported = async () => {
    console.log('♻️ Refreshing leads after export...');
    await fetchWhatsappLeads();
  };

  const handleStatusUpdated = async () => {
    console.log('♻️ Refreshing leads after status update...');
    await fetchWhatsappLeads();
  };

  if (isInitializing) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Initializing WhatsApp Operations</h3>
          <p className="text-gray-600">Setting up qualified leads for WhatsApp export...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading WhatsApp Operations</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={initializeWhatsappLeads}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">WhatsApp Operations</h2>
              <p className="text-sm text-gray-600">Export qualified leads for manual WhatsApp campaigns via Interakt</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white sticky top-16 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
          <WhatsappFilterTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            leadCounts={leadCounts}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full">
          <WhatsappLeadsTable
            leads={leads}
            activeTab={activeTab}
            isLoading={isLoading}
            onLeadsExported={handleLeadsExported}
            onStatusUpdated={handleStatusUpdated}
          />
        </div>
      </div>
    </div>
  );
};

export default WhatsappOperationsView;