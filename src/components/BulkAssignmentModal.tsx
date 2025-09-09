// Bulk assignment modal component for assigning multiple leads to counselors
// Provides clean interface for bulk operations with proper validation and feedback

import React, { useState, useEffect } from 'react';
import { Users2, X, Crown, User, UserCheck } from 'lucide-react';
import { Counselor } from '../types/leads';

interface BulkAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (counselorId: string | null, counselorName: string, comment: string) => void;
  selectedCount: number;
  isLoading?: boolean;
}

const BulkAssignmentModal: React.FC<BulkAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  selectedCount,
  isLoading = false
}) => {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(null);
  const [selectedCounselorName, setSelectedCounselorName] = useState<string>('');
  const [comment, setComment] = useState('');
  const [loadingCounselors, setLoadingCounselors] = useState(false);
  const [error, setError] = useState('');

  // Fetch counselors when modal opens
  useEffect(() => {
    if (isOpen && counselors.length === 0) {
      fetchCounselors();
    }
  }, [isOpen]);

  // Set default comment when counselor is selected
  useEffect(() => {
    if (selectedCounselorName) {
      setComment(`Bulk assigned ${selectedCount} leads to ${selectedCounselorName}`);
    }
  }, [selectedCounselorName, selectedCount]);

  const fetchCounselors = async () => {
    setLoadingCounselors(true);
    try {
      const { LeadService } = await import('../services/leadService');
      const data = await LeadService.getCounselors();
      setCounselors(data);
    } catch (error) {
      console.error('Error fetching counselors:', error);
      setError('Failed to load counselors');
    } finally {
      setLoadingCounselors(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCounselorId) {
      setError('Please select a counselor to assign leads to');
      return;
    }

    const finalComment = comment.trim() || `Bulk assigned ${selectedCount} leads to ${selectedCounselorName}`;
    onAssign(selectedCounselorId, selectedCounselorName, finalComment);
  };

  const handleClose = () => {
    setSelectedCounselorId(null);
    setSelectedCounselorName('');
    setComment('');
    setError('');
    onClose();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'senior_counselor':
        return <Users2 className="w-4 h-4" />;
      case 'junior_counselor':
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'senior_counselor':
        return 'bg-blue-100 text-blue-800';
      case 'junior_counselor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'senior_counselor':
        return 'Senior';
      case 'junior_counselor':
        return 'Junior';
      default:
        return 'Unknown';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Users2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Bulk Assign Leads
              </h3>
              <p className="text-sm text-gray-600">
                Assign {selectedCount} selected lead{selectedCount !== 1 ? 's' : ''} to a counselor
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Selection Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">
                    {selectedCount} Lead{selectedCount !== 1 ? 's' : ''} Selected
                  </div>
                  <div className="text-sm text-blue-700">
                    All selected leads will be assigned to the chosen counselor
                  </div>
                </div>
              </div>
            </div>

            {/* Counselor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Counselor <span className="text-red-500">*</span>
              </label>
              
              {loadingCounselors ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading counselors...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {counselors.map((counselor) => (
                    <label
                      key={counselor.id}
                      className={`
                        flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors
                        ${selectedCounselorId === counselor.id ? 'bg-blue-50 border-blue-200' : ''}
                      `}
                    >
                      <input
                        type="radio"
                        name="counselor"
                        value={counselor.id}
                        checked={selectedCounselorId === counselor.id}
                        onChange={(e) => {
                          setSelectedCounselorId(e.target.value);
                          setSelectedCounselorName(counselor.name);
                          if (error) setError('');
                        }}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-shrink-0 text-gray-400">
                        {getRoleIcon(counselor.role)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getRoleColor(counselor.role)}`}>
                            {getRoleLabel(counselor.role)}
                          </span>
                          <div className="font-medium text-gray-900">
                            {counselor.name}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {counselor.email}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Comment */}
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                Comment (Optional)
              </label>
              <textarea
                id="comment"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Bulk assigned ${selectedCount} leads to ${selectedCounselorName || 'counselor'}...`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                This comment will be added to each lead's history with timestamp.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedCounselorId}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <Users2 className="w-4 h-4" />
                  <span>Assign {selectedCount} Lead{selectedCount !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkAssignmentModal;