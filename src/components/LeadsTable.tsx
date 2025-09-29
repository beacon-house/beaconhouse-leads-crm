import React, { useState } from 'react';
import { ChevronUp, ChevronDown, User, GraduationCap, Heart, Phone, Calendar, Settings, TrendingUp, ChevronRight, ChevronLeft, CheckSquare, Square, Users as Users2, X } from 'lucide-react';
// Fully responsive leads table with mobile card layout and desktop table view
// Switches between layouts based on screen size for optimal user experience

import { Lead, SortColumn, SortDirection, TableSort, PaginationMetadata } from '../types/leads';
import StatusDropdown from './StatusDropdown';
import CounselorAssignment from './CounselorDropdown';
import ReassignmentModal from './ReassignmentModal';
import BulkAssignmentModal from './BulkAssignmentModal';
import { formatLeadCreatedAtDisplay } from '../utils/leadUtils';

interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  currentPage: number;
  pageSize: number;
  paginationMetadata: PaginationMetadata;
  onPageChange: (page: number) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onCounselorChange: (sessionId: string, counselorId: string | null, counselorName: string, comment: string) => void;
  onBulkAssign?: (sessionIds: string[], counselorId: string | null, counselorName: string, comment: string) => void;
  onRowClick?: (sessionId: string) => void;
}

// Mobile Card Component
const MobileLeadCard: React.FC<{
  lead: Lead;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onReassignClick: (sessionId: string, currentCounselorId: string | null, currentCounselorName: string | null, leadStudentName: string | null) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelectLead: (leadId: string, isSelected: boolean) => void;
}> = ({ lead, onStatusChange, onReassignClick, isSelectionMode, isSelected, onSelectLead }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardClick = () => {
    if (isSelectionMode) {
      onSelectLead(lead.session_id, !isSelected);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectLead(lead.session_id, !isSelected);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border mb-4 overflow-hidden transition-all ${
      isSelectionMode && isSelected 
        ? 'border-blue-300 ring-2 ring-blue-100' 
        : 'border-gray-200'
    }`}>
      {/* Card Header - Always Visible */}
      <div 
        className={`p-4 transition-colors ${
          isSelectionMode 
            ? 'cursor-pointer hover:bg-blue-50' 
            : 'cursor-pointer hover:bg-gray-50'
        }`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Selection Checkbox - Only show in selection mode */}
            {isSelectionMode && (
              <div onClick={handleCheckboxClick} className="flex-shrink-0">
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                )}
              </div>
            )}
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {lead.student_name || 'Unknown Student'}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-600">
                  Grade {lead.current_grade || 'N/A'}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600">
                  {lead.curriculum_type || 'No curriculum'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Qualification Badge */}
            {!isSelectionMode && (
              <>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  lead.is_qualified_lead 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {lead.is_qualified_lead ? 'Qualified' : 'Unqualified'}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Info - Always Visible (hide in selection mode) */}
        {!isSelectionMode && (
          <div className="mt-3 space-y-3">
          <div className="w-full">
            <span className="text-xs text-gray-500">Lead Status</span>
            <div className="mt-1" onClick={handleStatusClick}>
              <StatusDropdown
                currentStatus={lead.lead_status}
                leadId={lead.session_id}
                onStatusChange={onStatusChange}
                onOpen={() => setIsExpanded(true)}
              />
            </div>
          </div>
          <div className="w-full">
            <span className="text-xs text-gray-500">Counselor</span>
            <div className="mt-1" onClick={handleStatusClick}>
              <CounselorAssignment
                currentCounselorId={lead.assigned_to}
                currentCounselorName={lead.assigned_counselor_name}
                leadStudentName={lead.student_name}
                sessionId={lead.session_id}
                onReassignClick={() => onReassignClick(lead.session_id, lead.assigned_to, lead.assigned_counselor_name, lead.student_name)}
              />
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Expandable Content */}
      {isExpanded && !isSelectionMode && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="p-4 space-y-4">
            {/* Student & Contact Info */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <Phone className="w-4 h-4 text-orange-600 mr-2" />
                  <h4 className="font-medium text-gray-900 text-sm">Contact Information</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="text-gray-900">{lead.phone_number || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Parent:</span>
                    <span className="text-gray-900">{lead.parent_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="text-gray-900 truncate" title={lead.parent_email || ''}>
                      {lead.parent_email || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date Created:</span>
                    <span className="text-gray-900">{formatLeadCreatedAtDisplay(lead.created_at).date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Created (IST):</span>
                    <span className="text-gray-900">{formatLeadCreatedAtDisplay(lead.created_at).time}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <GraduationCap className="w-4 h-4 text-green-600 mr-2" />
                  <h4 className="font-medium text-gray-900 text-sm">Academic Details</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">School:</span>
                    <span className="text-gray-900 truncate">{lead.school_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Grade Format:</span>
                    <span className="text-gray-900">{lead.grade_format || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Score:</span>
                    <span className="text-gray-900">
                      {lead.gpa_value ? `GPA: ${lead.gpa_value}` : 
                       lead.percentage_value ? `${lead.percentage_value}%` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <Calendar className="w-4 h-4 text-indigo-600 mr-2" />
                  <h4 className="font-medium text-gray-900 text-sm">Counselling Status</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Booked:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      lead.is_counselling_booked 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.is_counselling_booked ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="text-gray-900">{lead.selected_date || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="text-gray-900">{lead.selected_slot || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <Settings className="w-4 h-4 text-gray-600 mr-2" />
                  <h4 className="font-medium text-gray-900 text-sm">System Information</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="text-gray-900">{lead.lead_category || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Funnel Stage:</span>
                    <span className="text-gray-900 text-xs">{lead.funnel_stage || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span className="text-gray-900">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Desktop Table Component  
const DesktopLeadsTable: React.FC<{
  leads: Lead[];
  sort: TableSort;
  onSort: (column: string) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onReassignClick: (sessionId: string, currentCounselorId: string | null, currentCounselorName: string | null, leadStudentName: string | null) => void;
  onRowClick: (lead: Lead) => void;
  isSelectionMode: boolean;
  selectedLeadIds: Set<string>;
  onSelectLead: (leadId: string, isSelected: boolean) => void;
  onSelectAllLeads: (isSelected: boolean) => void;
}> = ({ leads, sort, onSort, onStatusChange, onReassignClick, onRowClick: onDesktopRowClick, isSelectionMode, selectedLeadIds, onSelectLead, onSelectAllLeads }) => {
  
  const allLeadsSelected = leads.length > 0 && leads.every(lead => selectedLeadIds.has(lead.session_id));
  const someLeadsSelected = leads.some(lead => selectedLeadIds.has(lead.session_id));
  
  const columns = [
    ...(isSelectionMode ? [{ key: 'select', label: '', width: 'w-12' }] : []),
    { key: 'student_info', label: 'Student Information', width: 'w-52' },
    { key: 'academic_details', label: 'Academic Details', width: 'w-56' },
    { key: 'study_preferences', label: 'Study Preferences', width: 'w-48' },
    { key: 'contact_info', label: 'Contact Information', width: 'w-48' },
    { key: 'counselling_data', label: 'Counselling Data', width: 'w-52' },
    { key: 'lead_qualification', label: 'Lead Qualification', width: 'w-48' },
    { key: 'funnel_stage', label: 'Funnel Stage', width: 'w-44' },
    { key: 'utm_parameters', label: 'UTM Parameters', width: 'w-48' },
    { key: 'lead_status', label: 'Lead Status', width: 'w-48' },
    { key: 'assigned_to', label: 'Assigned To', width: 'w-40' },
  ];

  const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => {
    if (sort.column !== column) {
      return <ChevronUp className="w-4 h-4 text-gray-300" />;
    }
    return sort.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-gray-600" /> : 
      <ChevronDown className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-20">
          <tr>
            {/* Selection Column Header */}
            {isSelectionMode && (
              <th className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-30">
                <div className="flex items-center justify-center">
                  <div 
                    onClick={() => onSelectAllLeads(!allLeadsSelected)}
                    className="cursor-pointer"
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
                </div>
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={`${column.width} px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.key !== 'select' ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''
                } ${
                  column.key === 'student_info' 
                    ? `sticky ${isSelectionMode ? 'left-12' : 'left-0'} bg-gray-50 z-30` 
                    : ''
                }`}
                onClick={() => column.key !== 'select' && onSort(column.key)}
              >
                {column.key !== 'select' && (
                  <div className="flex items-center space-x-1">
                  <span>{column.label}</span>
                  <SortIcon column={column.key as SortColumn} />
                </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead, index) => (
            <tr
              key={lead.id}
              className={`transition-colors cursor-pointer border-b border-gray-100 ${
                isSelectionMode && selectedLeadIds.has(lead.session_id)
                  ? 'bg-blue-50 hover:bg-blue-100'
                  : 'hover:bg-blue-50'
              }`}
              style={{
                backgroundColor: isSelectionMode && selectedLeadIds.has(lead.session_id) 
                  ? '#eff6ff' 
                  : index % 2 === 0 ? '#ffffff' : '#f9fafb'
              }}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest('.status-dropdown, .counselor-dropdown, .checkbox-column')) {
                  if (isSelectionMode) {
                    onSelectLead(lead.session_id, !selectedLeadIds.has(lead.session_id));
                  } else {
                  onDesktopRowClick(lead);
                  }
                }
              }}
            >
              {/* Selection Checkbox Column */}
              {isSelectionMode && (
                <td 
                  className="w-12 px-4 py-6 sticky left-0 z-25 checkbox-column"
                  style={{
                    backgroundColor: selectedLeadIds.has(lead.session_id) 
                      ? '#eff6ff' 
                      : index % 2 === 0 ? '#ffffff' : '#f9fafb'
                  }}
                >
                  <div className="flex items-center justify-center">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLead(lead.session_id, !selectedLeadIds.has(lead.session_id));
                      }}
                      className="cursor-pointer"
                    >
                      {selectedLeadIds.has(lead.session_id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                      )}
                    </div>
                  </div>
                </td>
              )}
              
              {/* Student Information */}
              <td 
                className={`px-6 py-6 text-sm text-gray-900 sticky z-25 ${isSelectionMode ? 'left-12' : 'left-0'}`}
                style={{
                  backgroundColor: selectedLeadIds.has(lead.session_id) 
                    ? '#eff6ff' 
                    : index % 2 === 0 ? '#ffffff' : '#f9fafb'
                }}
              >
                <div>
                  <div className="font-medium">{lead.student_name || 'Unknown'}</div>
                  <div className="text-xs text-gray-600">Grade: {lead.current_grade || '-'}</div>
                  <div className="text-xs text-gray-600">Filler: {lead.form_filler_type || '-'}</div>
                  <div className="text-xs text-gray-600">Phone: {lead.phone_number || '-'}</div>
                  <div className="text-xs text-gray-600">Created: {formatLeadCreatedAtDisplay(lead.created_at).date}</div>
                  <div className="text-xs text-gray-600">Time (IST): {formatLeadCreatedAtDisplay(lead.created_at).time}</div>
                </div>
              </td>
              
              {/* Academic Details */}
              <td className="px-6 py-6 text-sm text-gray-900">
                <div className="space-y-1">
                  <div className="font-medium">{lead.curriculum_type || 'Not specified'}</div>
                  <div className="text-xs text-gray-600">Format: {lead.grade_format || '-'}</div>
                  <div className="text-xs text-gray-600">
                    {lead.gpa_value ? `GPA: ${lead.gpa_value}` : lead.percentage_value ? `Percentage: ${lead.percentage_value}` : 'No grades'}
                  </div>
                  <div className="text-xs text-gray-600 truncate" title={lead.school_name || ''}>
                    School: {lead.school_name || '-'}
                  </div>
                </div>
              </td>
              
              {/* Study Preferences */}
              <td className="px-6 py-6 text-sm text-gray-900">
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">
                    Scholarship: {lead.scholarship_requirement || 'Not specified'}
                  </div>
                  <div className="text-xs text-gray-600">
                    Countries: {
                      lead.target_geographies && Array.isArray(lead.target_geographies) 
                        ? lead.target_geographies.join(', ') 
                        : '-'
                    }
                  </div>
                </div>
              </td>
              
              {/* Contact Information */}
              <td className="px-6 py-6 text-sm text-gray-900">
                <div className="space-y-1">
                  <div className="font-medium">{lead.parent_name || 'Not provided'}</div>
                  <div className="text-xs text-gray-600 truncate" title={lead.parent_email || ''}>
                    {lead.parent_email || 'No email'}
                  </div>
                </div>
              </td>
              
              {/* Counselling Data */}
              <td className="px-6 py-6 text-sm text-gray-900">
                <div className="space-y-1">
                  <div className={`text-xs px-2 py-1 rounded ${
                    lead.is_counselling_booked 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {lead.is_counselling_booked ? 'Booked' : 'Not booked'}
                  </div>
                  <div className="text-xs text-gray-600">Date: {lead.selected_date || '-'}</div>
                  <div className="text-xs text-gray-600">Slot: {lead.selected_slot || '-'}</div>
                </div>
              </td>
              
              {/* Lead Qualification */}
              <td className="px-6 py-6 text-sm text-gray-900">
                <div className="space-y-1">
                  <div className="font-medium">{lead.lead_category || 'Uncategorized'}</div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    lead.is_qualified_lead 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {lead.is_qualified_lead ? 'Qualified' : 'Not qualified'}
                  </div>
                </div>
              </td>
              
              {/* Funnel Stage */}
              <td className="px-6 py-6 text-sm text-gray-900">
                <div className="font-medium">
                  {lead.funnel_stage || '-'}
                </div>
              </td>
              
              {/* UTM Parameters */}
              <td className="px-6 py-6 text-sm text-gray-900">
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Source: {lead.utm_source || '-'}</div>
                  <div className="text-xs text-gray-600">Medium: {lead.utm_medium || '-'}</div>
                  <div className="text-xs text-gray-600">Campaign: {lead.utm_campaign || '-'}</div>
                </div>
              </td>
              
              {/* Lead Status */}
              <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-900">
                <div className="status-dropdown" onClick={(e) => e.stopPropagation()}>
                  <StatusDropdown
                    currentStatus={lead.lead_status}
                    leadId={lead.session_id}
                    onStatusChange={onStatusChange}
                  />
                </div>
              </td>
              
              {/* Assigned To */}
              <td className="px-6 py-6 text-sm text-gray-900">
                <div className="counselor-dropdown" onClick={(e) => e.stopPropagation()}>
                  <CounselorAssignment
                    currentCounselorId={lead.assigned_to}
                    currentCounselorName={lead.assigned_counselor_name}
                    leadStudentName={lead.student_name}
                    sessionId={lead.session_id}
                    onReassignClick={() => onReassignClick(lead.session_id, lead.assigned_to, lead.assigned_counselor_name, lead.student_name)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main Component
const LeadsTable: React.FC<LeadsTableProps> = ({ 
  leads, 
  isLoading, 
  currentPage,
  pageSize,
  paginationMetadata,
  onPageChange,
  onStatusChange, 
  onCounselorChange, 
  onBulkAssign, 
  onRowClick 
}) => {
  const [sort, setSort] = useState<TableSort>({ column: 'created_at', direction: 'desc' });
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [reassignmentModal, setReassignmentModal] = useState<{
    isOpen: boolean;
    sessionId: string;
    currentCounselorId: string | null;
    currentCounselorName: string | null;
    leadStudentName: string | null;
  }>({
    isOpen: false,
    sessionId: '',
    currentCounselorId: null,
    currentCounselorName: null,
    leadStudentName: null,
  });
  const [isReassigning, setIsReassigning] = useState(false);
  const [bulkAssignmentModal, setBulkAssignmentModal] = useState({
    isOpen: false,
  });
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Pagination helper functions
  const getPageNumbers = () => {
    const { totalPages, currentPage } = paginationMetadata;
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter(item => item !== 1 || totalPages > 1);
  };

  const handleSelectLead = (leadId: string, isSelected: boolean) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(leadId);
      } else {
        newSet.delete(leadId);
      }
      return newSet;
    });
  };

  const handleSelectAllLeads = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedLeadIds(new Set(leads.map(lead => lead.session_id)));
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(prev => !prev);
    setSelectedLeadIds(new Set()); // Clear selections when toggling mode
  };

  const handleBulkAssign = () => {
    setBulkAssignmentModal({ isOpen: true });
  };

  const handleBulkAssignSubmit = async (counselorId: string | null, counselorName: string, comment: string) => {
    if (!onBulkAssign || selectedLeadIds.size === 0) return;
    
    setIsBulkAssigning(true);
    try {
      await onBulkAssign(Array.from(selectedLeadIds), counselorId, counselorName, comment);
      setBulkAssignmentModal({ isOpen: false });
      setSelectedLeadIds(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error in bulk assignment:', error);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleSort = (column: string) => {
    setSort(prev => ({
      column: column as SortColumn,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleRowClick = (lead: Lead) => {
    // Open the Lead Details Modal
    if (onRowClick) {
      onRowClick(lead.session_id);
    }
  };

  const handleReassignClick = (
    sessionId: string, 
    currentCounselorId: string | null, 
    currentCounselorName: string | null,
    leadStudentName: string | null
  ) => {
    setReassignmentModal({
      isOpen: true,
      sessionId,
      currentCounselorId,
      currentCounselorName,
      leadStudentName,
    });
  };

  const handleReassignSubmit = async (counselorId: string | null, counselorName: string, comment: string) => {
    setIsReassigning(true);
    try {
      await onCounselorChange(reassignmentModal.sessionId, counselorId, counselorName, comment);
      setReassignmentModal({
        isOpen: false,
        sessionId: '',
        currentCounselorId: null,
        currentCounselorName: null,
        leadStudentName: null,
      });
    } catch (error) {
      console.error('Error reassigning lead:', error);
    } finally {
      setIsReassigning(false);
    }
  };

  const handleReassignClose = () => {
    setReassignmentModal({
      isOpen: false,
      sessionId: '',
      currentCounselorId: null,
      currentCounselorName: null,
      leadStudentName: null,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
          <p className="text-gray-600 mt-4">Loading leads...</p>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leads available</h3>
          <p className="text-gray-600">Connect to Supabase database to view lead data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden relative">
      {/* Selection Mode Controls */}
      {!isLoading && leads.length > 0 && (
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleToggleSelectionMode}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isSelectionMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isSelectionMode ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Exit Selection</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span>Select Leads</span>
                  </>
                )}
              </button>
              
              {isSelectionMode && selectedLeadIds.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            
            {isSelectionMode && selectedLeadIds.size > 0 && (
              <button
                onClick={handleBulkAssign}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
              >
                <Users2 className="w-4 h-4" />
                <span>Assign Selected</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile View */}
      <div className="lg:hidden">
        <div className="p-4">
          <div className="space-y-0">
            {leads.map((lead) => (
              <MobileLeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={onStatusChange}
                onReassignClick={handleReassignClick}
                isSelectionMode={isSelectionMode}
                isSelected={selectedLeadIds.has(lead.session_id)}
                onSelectLead={handleSelectLead}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="h-full">
        <DesktopLeadsTable
          leads={leads}
          sort={sort}
          onSort={handleSort}
          onStatusChange={onStatusChange}
          onReassignClick={handleReassignClick}
          onRowClick={handleRowClick}
          isSelectionMode={isSelectionMode}
          selectedLeadIds={selectedLeadIds}
          onSelectLead={handleSelectLead}
          onSelectAllLeads={handleSelectAllLeads}
        />
        </div>
      </div>

      {/* Reassignment Modal */}
      <ReassignmentModal
        isOpen={reassignmentModal.isOpen}
        onClose={handleReassignClose}
        onReassign={handleReassignSubmit}
        currentCounselorId={reassignmentModal.currentCounselorId}
        currentCounselorName={reassignmentModal.currentCounselorName}
        leadStudentName={reassignmentModal.leadStudentName}
        sessionId={reassignmentModal.sessionId}
        isLoading={isReassigning}
      />

      {/* Bulk Assignment Modal */}
      <BulkAssignmentModal
        isOpen={bulkAssignmentModal.isOpen}
        onClose={() => setBulkAssignmentModal({ isOpen: false })}
        onAssign={handleBulkAssignSubmit}
        selectedCount={selectedLeadIds.size}
        isLoading={isBulkAssigning}
      />
    </div>
  );
};

export default LeadsTable;