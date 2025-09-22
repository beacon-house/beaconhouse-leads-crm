// Lead Details Modal - Comprehensive view of a lead with timeline and actions
// Provides counselors with full context and ability to update lead status/assignment

import React, { useState, useEffect } from 'react';
import { X, User, Phone, GraduationCap, Heart, Calendar, Settings, TrendingUp, Clock, MessageCircle, Target, UserCheck, FileText, Send } from 'lucide-react';
import { LeadDetails, LeadStatus, TimelineEvent } from '../types/leads';
import { LeadService } from '../services/leadService';
import StatusDropdown from './StatusDropdown';
import CounselorAssignment from './CounselorDropdown';
import ReassignmentModal from './ReassignmentModal';
import { formatLeadCreatedAtDisplay } from '../utils/leadUtils';
import { supabase } from '../lib/supabase';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  onStatusChange: (sessionId: string, newStatus: LeadStatus, comment: string) => void;
  onCounselorChange: (sessionId: string, counselorId: string | null, counselorName: string, comment: string) => void;
}

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  onStatusChange,
  onCounselorChange,
}) => {
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [reassignmentModal, setReassignmentModal] = useState<{
    isOpen: boolean;
    currentCounselorId: string | null;
    currentCounselorName: string | null;
  }>({
    isOpen: false,
    currentCounselorId: null,
    currentCounselorName: null,
  });

  // Fetch lead details when modal opens
  useEffect(() => {
    if (isOpen && sessionId) {
      fetchLeadDetails();
    }
  }, [isOpen, sessionId]);

  const fetchLeadDetails = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);
    try {
      const details = await LeadService.getLeadDetails(sessionId);
      setLeadDetails(details);
    } catch (error) {
      console.error('Error fetching lead details:', error);
      setError('Failed to load lead details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (newSessionId: string, newStatus: LeadStatus) => {
    if (!leadDetails) return;
    
    // For status changes, we'll use a simple prompt for now
    const comment = prompt('Please add a comment about this status change:');
    if (comment) {
      onStatusChange(newSessionId, newStatus, comment);
      // Refresh lead details after status change
      setTimeout(fetchLeadDetails, 1000);
    }
  };

  const handleReassignClick = () => {
    if (!leadDetails) return;
    
    setReassignmentModal({
      isOpen: true,
      currentCounselorId: leadDetails.assigned_to,
      currentCounselorName: leadDetails.assigned_counselor_name,
    });
  };

  const handleReassignSubmit = async (counselorId: string | null, counselorName: string, comment: string) => {
    if (!sessionId) return;
    
    await onCounselorChange(sessionId, counselorId, counselorName, comment);
    setReassignmentModal({ isOpen: false, currentCounselorId: null, currentCounselorName: null });
    // Refresh lead details after reassignment
    setTimeout(fetchLeadDetails, 1000);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !sessionId || !leadDetails) return;

    setIsAddingComment(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await LeadService.addLeadComment(sessionId, user.id, newComment.trim(), leadDetails.lead_status);
      setNewComment('');
      // Refresh lead details to show new comment
      await fetchLeadDetails();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsAddingComment(false);
    }
  };

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'form_submission':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'lead_created':
        return <Target className="w-4 h-4 text-green-600" />;
      case 'status_change':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'assignment_change':
        return <UserCheck className="w-4 h-4 text-purple-600" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {leadDetails?.student_name || 'Loading...'}
                </h2>
                <p className="text-sm text-gray-600">
                  Lead Details • Session: {sessionId?.slice(0, 8)}...
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col lg:flex-row h-full" style={{ maxHeight: 'calc(95vh - 80px)' }}>
            {/* Left Pane - Lead Information & Actions */}
            <div className="w-full lg:w-2/5 border-r border-gray-200 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading lead details...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={fetchLeadDetails}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              ) : leadDetails ? (
                <div className="p-6 space-y-6">
                  {/* Quick Actions */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Lead Status
                        </label>
                        <StatusDropdown
                          currentStatus={leadDetails.lead_status}
                          leadId={leadDetails.session_id}
                          onStatusChange={handleStatusChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assigned Counselor
                        </label>
                        <CounselorAssignment
                          currentCounselorId={leadDetails.assigned_to}
                          currentCounselorName={leadDetails.assigned_counselor_name}
                          leadStudentName={leadDetails.student_name}
                          sessionId={leadDetails.session_id}
                          onReassignClick={handleReassignClick}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Student Information */}
                  <div>
                    <div className="flex items-center mb-3">
                      <User className="w-5 h-5 text-blue-600 mr-2" />
                      <h3 className="font-medium text-gray-900">Student Information</h3>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Name:</span>
                          <p className="font-medium">{leadDetails.student_name || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Grade:</span>
                          <p className="font-medium">{leadDetails.current_grade || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Form Filler:</span>
                          <p className="font-medium">{leadDetails.form_filler_type || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Phone:</span>
                          <p className="font-medium">{leadDetails.phone_number || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Date Created:</span>
                          <p className="font-medium">{formatLeadCreatedAtDisplay(leadDetails.created_at).date}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Time Created (IST):</span>
                          <p className="font-medium">{formatLeadCreatedAtDisplay(leadDetails.created_at).time}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Academic Details */}
                  <div>
                    <div className="flex items-center mb-3">
                      <GraduationCap className="w-5 h-5 text-green-600 mr-2" />
                      <h3 className="font-medium text-gray-900">Academic Details</h3>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Curriculum:</span>
                        <p className="font-medium">{leadDetails.curriculum_type || '-'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Format:</span>
                          <p className="font-medium">{leadDetails.grade_format || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Score:</span>
                          <p className="font-medium">
                            {leadDetails.gpa_value ? `GPA: ${leadDetails.gpa_value}` : 
                             leadDetails.percentage_value ? `${leadDetails.percentage_value}%` : '-'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">School:</span>
                        <p className="font-medium">{leadDetails.school_name || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <div className="flex items-center mb-3">
                      <Phone className="w-5 h-5 text-orange-600 mr-2" />
                      <h3 className="font-medium text-gray-900">Contact Information</h3>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Parent Name:</span>
                        <p className="font-medium">{leadDetails.parent_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Parent Email:</span>
                        <p className="font-medium">{leadDetails.parent_email || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Study Preferences */}
                  <div>
                    <div className="flex items-center mb-3">
                      <Heart className="w-5 h-5 text-purple-600 mr-2" />
                      <h3 className="font-medium text-gray-900">Study Preferences</h3>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Scholarship:</span>
                        <p className="font-medium">{leadDetails.scholarship_requirement || '-'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Target Countries:</span>
                        <div className="mt-1">
                          {leadDetails.target_geographies && Array.isArray(leadDetails.target_geographies) ? (
                            <div className="flex flex-wrap gap-1">
                              {leadDetails.target_geographies.map((country: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                  {country}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="font-medium">-</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Information */}
                  <div>
                    <div className="flex items-center mb-3">
                      <Settings className="w-5 h-5 text-gray-600 mr-2" />
                      <h3 className="font-medium text-gray-900">System Information</h3>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Category:</span>
                          <p className="font-medium">{leadDetails.lead_category || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Environment:</span>
                          <p className="font-medium">{leadDetails.environment || '-'}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Funnel Stage:</span>
                        <p className="font-medium text-xs">{leadDetails.funnel_stage || '-'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Qualified:</span>
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            leadDetails.is_qualified_lead 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {leadDetails.is_qualified_lead ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Counseling:</span>
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            leadDetails.is_counselling_booked 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {leadDetails.is_counselling_booked ? 'Booked' : 'Not booked'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Created:</span>
                        <p className="font-medium">{new Date(leadDetails.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right Pane - Timeline & Comments */}
            <div className="w-full lg:w-3/5 flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Lead Timeline & Comments</h3>
                <p className="text-sm text-gray-600">Complete history of lead interactions and status changes</p>
              </div>

              {/* Timeline Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {leadDetails?.timelineEvents?.length ? (
                  <div className="space-y-6">
                    {leadDetails.timelineEvents.map((event, index) => (
                      <div key={event.id} className="flex space-x-4">
                        {/* Timeline Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                            {getEventIcon(event)}
                          </div>
                          {index < leadDetails.timelineEvents.length - 1 && (
                            <div className="w-0.5 h-6 bg-gray-200 ml-4 mt-2"></div>
                          )}
                        </div>

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {event.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          </div>
                          
                          {event.counselorName && (
                            <p className="text-xs text-gray-600 mt-1">
                              by {event.counselorName}
                            </p>
                          )}
                          
                          {event.commentText && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{event.commentText}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No timeline events available</p>
                  </div>
                )}
              </div>

              {/* Add Comment Section */}
              <div className="border-t border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-3">Add Comment</h4>
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment about this lead..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isAddingComment}
                    />
                  </div>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isAddingComment ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reassignment Modal */}
      <ReassignmentModal
        isOpen={reassignmentModal.isOpen}
        onClose={() => setReassignmentModal({ isOpen: false, currentCounselorId: null, currentCounselorName: null })}
        onReassign={handleReassignSubmit}
        currentCounselorId={reassignmentModal.currentCounselorId}
        currentCounselorName={reassignmentModal.currentCounselorName}
        leadStudentName={leadDetails?.student_name || null}
        sessionId={sessionId || ''}
        isLoading={false}
      />
    </>
  );
};

export default LeadDetailsModal;