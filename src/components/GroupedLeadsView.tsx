import React from 'react';
import { User, GraduationCap, Heart, Phone, Calendar, Settings, TrendingUp, ChevronRight } from 'lucide-react';
// Grouped leads view component showing organized lead information in card format
// Groups form_sessions data into logical sections for better readability

import { Lead } from '../types/leads';
import StatusDropdown from './StatusDropdown';

interface GroupedLeadsViewProps {
  leads: Lead[];
  isLoading: boolean;
  onStatusChange: (leadId: string, newStatus: string) => void;
}

const GroupedLeadsView: React.FC<GroupedLeadsViewProps> = ({ 
  leads, 
  isLoading, 
  onStatusChange 
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leads available</h3>
          <p className="text-gray-600">Connect to Supabase database to view lead data.</p>
        </div>
      </div>
    );
  }

  const handleLeadClick = (lead: Lead) => {
    const details = `
Lead Details:
- Session ID: ${lead.session_id}
- CRM Lead ID: ${lead.crm_lead_id || 'Not in CRM yet'}
- Student: ${lead.student_name}
- Grade: ${lead.current_grade}
- Curriculum: ${lead.curriculum_type}
- School: ${lead.school_name || 'Not provided'}
- Category: ${lead.lead_category}
- CRM Status: ${lead.lead_status}
- Funnel Stage: ${lead.funnel_stage}
- Is Qualified: ${lead.is_qualified_lead ? 'Yes' : 'No'}
- Counseling Booked: ${lead.is_counselling_booked ? 'Yes' : 'No'}
- Counselor: ${lead.assigned_counselor_name || 'Unassigned'}
- Submitted: ${new Date(lead.created_at).toLocaleString()}
- Last Contacted: ${lead.last_contacted ? new Date(lead.last_contacted).toLocaleString() : 'Never'}
    `.trim();
    
    alert(details);
    console.log('Lead Details:', lead);
  };

  return (
    <div className="space-y-6">
      {leads.map((lead) => (
        <div 
          key={lead.id} 
          className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('.status-dropdown')) {
              handleLeadClick(lead);
            }
          }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {lead.student_name || 'Unknown Student'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Session: {lead.session_id.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="status-dropdown" onClick={(e) => e.stopPropagation()}>
                  <StatusDropdown
                    currentStatus={lead.lead_status}
                    leadId={lead.session_id}
                    onStatusChange={onStatusChange}
                  />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Student Information */}
              <div>
                <div className="flex items-center mb-3">
                  <User className="w-4 h-4 text-blue-600 mr-2" />
                  <h4 className="font-medium text-gray-900">Student Information</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Form Filler:</span>
                    <span className="text-sm text-gray-900">{lead.form_filler_type || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Grade:</span>
                    <span className="text-sm text-gray-900">{lead.current_grade || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm text-gray-900">{lead.phone_number || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Academic Details */}
              <div>
                <div className="flex items-center mb-3">
                  <GraduationCap className="w-4 h-4 text-green-600 mr-2" />
                  <h4 className="font-medium text-gray-900">Academic Details</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Curriculum:</span>
                    <span className="text-sm text-gray-900">{lead.curriculum_type || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Grade Format:</span>
                    <span className="text-sm text-gray-900">{lead.grade_format || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">GPA:</span>
                    <span className="text-sm text-gray-900">{lead.gpa_value || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Percentage:</span>
                    <span className="text-sm text-gray-900">{lead.percentage_value || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">School:</span>
                    <span className="text-sm text-gray-900 truncate" title={lead.school_name || ''}>
                      {lead.school_name || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Study Preferences */}
              <div>
                <div className="flex items-center mb-3">
                  <Heart className="w-4 h-4 text-purple-600 mr-2" />
                  <h4 className="font-medium text-gray-900">Study Preferences</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Scholarship:</span>
                    <span className="text-sm text-gray-900">{lead.scholarship_requirement || '-'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Target Countries:</span>
                    <div className="mt-1">
                      {lead.target_geographies && Array.isArray(lead.target_geographies) ? (
                        <div className="flex flex-wrap gap-1">
                          {lead.target_geographies.map((country: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                              {country}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <div className="flex items-center mb-3">
                  <Phone className="w-4 h-4 text-orange-600 mr-2" />
                  <h4 className="font-medium text-gray-900">Contact Information</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Parent Name:</span>
                    <span className="text-sm text-gray-900">{lead.parent_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Parent Email:</span>
                    <span className="text-sm text-gray-900 truncate" title={lead.parent_email || ''}>
                      {lead.parent_email || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Counseling Data */}
              <div>
                <div className="flex items-center mb-3">
                  <Calendar className="w-4 h-4 text-indigo-600 mr-2" />
                  <h4 className="font-medium text-gray-900">Counseling Data</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Selected Date:</span>
                    <span className="text-sm text-gray-900">{lead.selected_date || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Selected Slot:</span>
                    <span className="text-sm text-gray-900">{lead.selected_slot || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Assigned To:</span>
                    <span className="text-sm text-gray-900">{lead.assigned_counselor_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Contacted:</span>
                    <span className="text-sm text-gray-900">
                      {lead.last_contacted ? new Date(lead.last_contacted).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Fields */}
              <div>
                <div className="flex items-center mb-3">
                  <Settings className="w-4 h-4 text-gray-600 mr-2" />
                  <h4 className="font-medium text-gray-900">System Fields</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Lead Category:</span>
                    <span className="text-sm text-gray-900">{lead.lead_category || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Funnel Stage:</span>
                    <span className="text-sm text-gray-900 text-xs">{lead.funnel_stage || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Qualified Lead:</span>
                    <span className={`text-sm px-2 py-1 rounded text-xs ${
                      lead.is_qualified_lead ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.is_qualified_lead ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Counseling Booked:</span>
                    <span className={`text-sm px-2 py-1 rounded text-xs ${
                      lead.is_counselling_booked ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.is_counselling_booked ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Environment:</span>
                    <span className="text-sm text-gray-900">{lead.environment || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* UTM Parameters */}
              <div>
                <div className="flex items-center mb-3">
                  <TrendingUp className="w-4 h-4 text-red-600 mr-2" />
                  <h4 className="font-medium text-gray-900">UTM Parameters</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Source:</span>
                    <span className="text-sm text-gray-900">{lead.utm_source || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Medium:</span>
                    <span className="text-sm text-gray-900">{lead.utm_medium || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Campaign:</span>
                    <span className="text-sm text-gray-900">{lead.utm_campaign || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Term:</span>
                    <span className="text-sm text-gray-900">{lead.utm_term || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Content:</span>
                    <span className="text-sm text-gray-900">{lead.utm_content || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">UTM ID:</span>
                    <span className="text-sm text-gray-900">{lead.utm_id || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
                    View Full Profile
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded">
                    Add Comment
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded">
                    Assign Counselor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupedLeadsView;