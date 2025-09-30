// WhatsApp Leads Table - Display and management of WhatsApp export leads
// Handles lead display, selection, export, and status updates

import React, { useState } from 'react';
import { Download, MessageCircle, CheckSquare, Square, Users, Clock, Send, AlertCircle } from 'lucide-react';
import { WhatsappLead, WhatsappFilterTab, WhatsappExportData } from '../types/whatsappLeads';
import { WhatsappLeadService } from '../services/whatsappLeadService';
import { CsvUtils } from '../utils/csvUtils';
import { formatLeadCreatedAtDisplay } from '../utils/leadUtils';
import { useAuth } from '../contexts/AuthContext';

interface WhatsappLeadsTableProps {
  leads: WhatsappLead[];
  activeTab: WhatsappFilterTab;
  isLoading: boolean;
  onLeadsExported: () => void;
  onStatusUpdated: () => void;
}

const WhatsappLeadsTable: React.FC<WhatsappLeadsTableProps> = ({
  leads,
  activeTab,
  isLoading,
  onLeadsExported,
  onStatusUpdated,
}) => {
  const { user } = useAuth();
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [bulkUpdateModal, setBulkUpdateModal] = useState({
    isOpen: false,
    selectedCount: 0,
  });
  const [updateNotes, setUpdateNotes] = useState('');

  const isExportTab = activeTab !== 'exported_leads';
  const canExport = isExportTab && selectedLeadIds.size > 0;
  const canUpdateStatus = activeTab === 'exported_leads' && selectedLeadIds.size > 0;

  // Determine if a lead is eligible for export (used in Tab 4: filter_by_stage)
  const isExportEligible = (lead: WhatsappLead): boolean => {
    if (activeTab !== 'filter_by_stage') return true; // Tabs 1-3 already pre-filter eligible leads
    const isQualifiedCategory = !!lead.lead_category && ['bch', 'lum-l1', 'lum-l2'].includes(lead.lead_category);
    const hasWhatsappRecord = !!lead.whatsapp_id;
    const isNotExported = lead.whatsapp_status === 'not_exported';
    return isQualifiedCategory && hasWhatsappRecord && isNotExported;
  };

  // Eligible leads subset for select-all behavior (Tab 4 only)
  const eligibleLeads = activeTab === 'filter_by_stage' ? leads.filter(isExportEligible) : leads;

  // Function to check if a lead appears in other tabs (for overlap indicators)
  const getLeadOverlapTabs = (lead: WhatsappLead): string[] => {
    if (activeTab !== 'filter_by_stage') return [];
    
    const overlapTabs: string[] = [];
    
    // Check if lead appears in Tab 1: Call Not Booked
    if (lead.lead_category && ['bch', 'lum-l1', 'lum-l2'].includes(lead.lead_category) && 
        !lead.is_counselling_booked && lead.whatsapp_status === 'not_exported') {
      overlapTabs.push('Call Not Booked');
    }
    
    // Check if lead appears in Tab 2: Call Booked (≤5 days)
    if (lead.lead_category && ['bch', 'lum-l1', 'lum-l2'].includes(lead.lead_category) && 
        lead.is_counselling_booked && lead.selected_date && lead.created_at && 
        lead.whatsapp_status === 'not_exported') {
      const selectedDate = new Date(lead.selected_date);
      const createdDate = new Date(lead.created_at);
      const daysDifference = Math.ceil((selectedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference <= 5) {
        overlapTabs.push('Call Booked ≤5 days');
      } else if (daysDifference > 5) {
        overlapTabs.push('Call Booked >5 days');
      }
    }
    
    // Check if lead appears in Tab 5: Exported Leads
    if (lead.whatsapp_status === 'exported' || lead.whatsapp_status === 'message_sent') {
      overlapTabs.push('Exported Leads');
    }
    
    return overlapTabs;
  };
  const handleSelectLead = (sessionId: string, isSelected: boolean) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(sessionId);
      } else {
        newSet.delete(sessionId);
      }
      return newSet;
    });
  };

  const handleSelectAllLeads = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedLeadIds(new Set(eligibleLeads.map(lead => lead.session_id)));
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const handleExportSelected = async () => {
    if (!canExport || !user) return;

    setIsExporting(true);
    try {
      const selectedLeads = leads.filter(lead => selectedLeadIds.has(lead.session_id));
      
      // Update database status
      await WhatsappLeadService.exportSelectedLeads(
        Array.from(selectedLeadIds),
        user.id
      );

      // Generate CSV export
      const exportData: WhatsappExportData[] = selectedLeads.map(lead => ({
        session_id: lead.session_id,
        student_name: lead.student_name || '',
        phone_number: lead.phone_number || '',
        parent_name: lead.parent_name || '',
        parent_email: lead.parent_email || '',
        current_grade: lead.current_grade || '',
        curriculum_type: lead.curriculum_type || '',
        lead_category: lead.lead_category || '',
        selected_date: lead.selected_date || '',
        selected_slot: lead.selected_slot || '',
        created_at: lead.created_at,
      }));

      // Download CSV
      const filename = CsvUtils.generateTimestampedFilename(`whatsapp_${activeTab}_export`);
      CsvUtils.downloadCsv(exportData, filename);

      // Clear selections and refresh
      setSelectedLeadIds(new Set());
      onLeadsExported();

      console.log(`✅ Successfully exported ${selectedLeadIds.size} leads`);
    } catch (error) {
      console.error('Error exporting leads:', error);
      
      // Enhanced error handling with specific error messages
      let errorMessage = 'Failed to export leads. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('already exported')) {
          errorMessage = 'Some leads have already been exported. Please refresh and try again.';
        } else if (error.message.includes('don\'t have WhatsApp records')) {
          errorMessage = 'Some leads are missing WhatsApp records. Please contact support.';
        } else if (error.message.includes('invalid status')) {
          errorMessage = 'Some leads have invalid status. Please refresh and try again.';
        } else {
          errorMessage = `Export failed: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkStatusUpdate = () => {
    if (!canUpdateStatus) return;
    setBulkUpdateModal({
      isOpen: true,
      selectedCount: selectedLeadIds.size,
    });
  };

  const handleConfirmStatusUpdate = async () => {
    if (!canUpdateStatus || !user) return;

    setIsUpdatingStatus(true);
    try {
      await WhatsappLeadService.bulkUpdateWhatsappLeadStatus(
        Array.from(selectedLeadIds),
        'message_sent',
        updateNotes.trim() || undefined
      );

      // Clear selections and refresh
      setSelectedLeadIds(new Set());
      setBulkUpdateModal({ isOpen: false, selectedCount: 0 });
      setUpdateNotes('');
      onStatusUpdated();

      console.log(`✅ Successfully updated ${selectedLeadIds.size} lead statuses`);
    } catch (error) {
      console.error('Error updating lead statuses:', error);
      
      // Enhanced error handling with specific error messages
      let errorMessage = 'Failed to update lead statuses. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('don\'t have WhatsApp records')) {
          errorMessage = 'Some leads are missing WhatsApp records. Please contact support.';
        } else if (error.message.includes('Can only mark \'exported\' leads')) {
          errorMessage = 'Can only mark exported leads as message sent. Please check lead statuses.';
        } else if (error.message.includes('Invalid leads')) {
          errorMessage = 'Some leads have invalid status for this operation. Please refresh and try again.';
        } else {
          errorMessage = `Status update failed: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case 'call_not_booked':
        return 'Qualified leads who haven\'t booked counseling sessions. Use for conversion campaigns to encourage booking.';
      case 'call_booked_5_days':
        return 'Leads who booked counseling within 5 days of form submission. Send single congratulatory message.';
      case 'call_booked_more_5_days':
        return 'Leads who booked counseling more than 5 days after form submission. Send congratulatory + reminder sequence.';
      case 'filter_by_stage':
        return 'All leads across CRM stages. Select stages to filter. Only qualified, not-exported leads can be selected for export.';
      case 'exported_leads':
        return 'Leads that have been exported for WhatsApp campaigns. Update message status after sending campaigns.';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exported':
        return 'bg-blue-100 text-blue-800';
      case 'message_sent':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const allLeadsSelected = eligibleLeads.length > 0 && eligibleLeads.every(lead => selectedLeadIds.has(lead.session_id));
  const someLeadsSelected = eligibleLeads.some(lead => selectedLeadIds.has(lead.session_id));

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
          <p className="text-gray-600 mt-4">Loading WhatsApp leads...</p>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leads available</h3>
          <p className="text-gray-600">{getTabDescription()}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Header with description and actions */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {leads.length} Lead{leads.length !== 1 ? 's' : ''} Available
              </h3>
              <p className="text-sm text-gray-600">{getTabDescription()}</p>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-3">
              {selectedLeadIds.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedLeadIds.size} selected
                </span>
              )}
              
              {isExportTab && (
                <button
                  onClick={handleExportSelected}
                  disabled={!canExport || isExporting}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Export Selected</span>
                    </>
                  )}
                </button>
              )}

              {activeTab === 'exported_leads' && (
                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={!canUpdateStatus || isUpdatingStatus}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Mark as Sent</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table content */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <div 
                    onClick={() => handleSelectAllLeads(!allLeadsSelected)}
                    className={`cursor-pointer ${activeTab === 'filter_by_stage' && eligibleLeads.length === 0 ? 'pointer-events-none opacity-50' : ''}`}
                    title={activeTab === 'filter_by_stage' && eligibleLeads.length === 0 ? 'No export-eligible leads on this page' : ''}
                  >
                    {allLeadsSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : someLeadsSelected ? (
                      <div className="w-5 h-5 bg-blue-600 rounded border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-white"></div>
                      </div>
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Counseling Info
                </th>
                {activeTab === 'filter_by_stage' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Also Appears In
                  </th>
                )}
                {activeTab === 'exported_leads' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WhatsApp Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Export Info
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead, index) => (
                <tr
                  key={lead.session_id}
                  className={`transition-colors ${
                    selectedLeadIds.has(lead.session_id)
                      ? 'bg-blue-50'
                      : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="w-12 px-4 py-4">
                    <div 
                      onClick={() => {
                        if (!isExportEligible(lead)) return;
                        handleSelectLead(lead.session_id, !selectedLeadIds.has(lead.session_id));
                      }}
                      className={`cursor-pointer ${activeTab === 'filter_by_stage' && !isExportEligible(lead) ? 'pointer-events-none opacity-50' : ''}`}
                      title={activeTab === 'filter_by_stage' && !isExportEligible(lead) ? 'View only (not exportable)' : ''}
                    >
                      {selectedLeadIds.has(lead.session_id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">{lead.student_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-600">Grade: {lead.current_grade || '-'}</div>
                      <div className="text-sm text-gray-600">Curriculum: {lead.curriculum_type || '-'}</div>
                      <div className="text-sm text-gray-600">Category: {lead.lead_category || '-'}</div>
                      <div className="text-sm text-gray-600">Created: {formatLeadCreatedAtDisplay(lead.created_at).date}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">{lead.parent_name || 'Not provided'}</div>
                      <div className="text-sm text-gray-600">{lead.parent_email || 'No email'}</div>
                      <div className="text-sm text-gray-600">{lead.phone_number || 'No phone'}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className={`text-sm px-2 py-1 rounded ${
                        lead.is_counselling_booked 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.is_counselling_booked ? 'Booked' : 'Not booked'}
                      </div>
                      {lead.selected_date && (
                        <div className="text-sm text-gray-600">Date: {lead.selected_date}</div>
                      )}
                      {lead.selected_slot && (
                        <div className="text-sm text-gray-600">Slot: {lead.selected_slot}</div>
                      )}
                    </div>
                  </td>

                  {/* Overlap Indicators - Only show in filter_by_stage tab */}
                  {activeTab === 'filter_by_stage' && (
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {getLeadOverlapTabs(lead).map((tabName, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800 mr-1 mb-1"
                          >
                            {tabName}
                          </span>
                        ))}
                        {getLeadOverlapTabs(lead).length === 0 && (
                          <span className="text-sm text-gray-500 italic">Only in this view</span>
                        )}
                      </div>
                    </td>
                  )}
                  {activeTab === 'exported_leads' && (
                    <>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          getStatusColor(lead.whatsapp_status || 'not_exported')
                        }`}>
                          {lead.whatsapp_status?.replace('_', ' ').toUpperCase() || 'NOT EXPORTED'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">
                            Exported: {lead.export_date ? new Date(lead.export_date).toLocaleDateString() : 'Never'}
                          </div>
                          <div className="text-sm text-gray-600">
                            By: {lead.exported_by_name || 'Unknown'}
                          </div>
                          {lead.last_message_date && (
                            <div className="text-sm text-gray-600">
                              Sent: {new Date(lead.last_message_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Status Update Modal */}
      {bulkUpdateModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setBulkUpdateModal({ isOpen: false, selectedCount: 0 })}
          />
          
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Mark Messages as Sent
                </h3>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Mark {bulkUpdateModal.selectedCount} lead{bulkUpdateModal.selectedCount !== 1 ? 's' : ''} as "Message Sent"
                </p>
              </div>
              
              <div>
                <label htmlFor="update-notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Notes (Optional)
                </label>
                <textarea
                  id="update-notes"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add notes about this campaign..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
              <button
                type="button"
                onClick={() => setBulkUpdateModal({ isOpen: false, selectedCount: 0 })}
                disabled={isUpdatingStatus}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusUpdate}
                disabled={isUpdatingStatus}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
              >
                {isUpdatingStatus ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Mark as Sent</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WhatsappLeadsTable;