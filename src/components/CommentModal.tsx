// Comment modal component for mandatory status change comments
// Provides structured comment input with validation and proper UX

import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  currentStatus: string;
  newStatus: string;
  isLoading?: boolean;
}

const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentStatus,
  newStatus,
  isLoading = false
}) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      setError('Comment is required for status changes');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Please provide a more detailed comment (minimum 10 characters)');
      return;
    }

    onSubmit(comment.trim());
    setComment('');
    setError('');
  };

  const handleClose = () => {
    setComment('');
    setError('');
    onClose();
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
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Status Change Comment
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                Changing status from:
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                  {currentStatus.replace(/_/g, ' ').replace(/^\d+\s/, '')}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {newStatus.replace(/_/g, ' ').replace(/^\d+\s/, '')}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                Comment <span className="text-red-500">*</span>
              </label>
              <textarea
                id="comment"
                rows={4}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  error ? 'border-red-300' : ''
                }`}
                placeholder="Explain the reason for this status change (minimum 10 characters)..."
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  if (error) setError('');
                }}
                disabled={isLoading}
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                This comment will be added to the lead's history with timestamp.
              </p>
            </div>
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
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Status</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentModal;