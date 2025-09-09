// Counselor assignment component with clean reassignment UX
// Shows current assignment and provides reassign action button

import React, { useState } from 'react';
import { Users, Crown, User, RotateCcw } from 'lucide-react';

interface CounselorAssignmentProps {
  currentCounselorId: string | null;
  currentCounselorName: string | null;
  leadStudentName: string | null;
  sessionId: string;
  onReassignClick: () => void;
}

const CounselorAssignment: React.FC<CounselorAssignmentProps> = ({
  currentCounselorId,
  currentCounselorName,
  leadStudentName,
  sessionId,
  onReassignClick,
}) => {
  return (
    <div className="flex items-center justify-between w-full min-h-[44px] lg:min-h-0">
      {/* Current Assignment Display */}
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <div className="text-gray-600">
          <Users className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {currentCounselorName ? (
            <div className="flex items-center space-x-2">
              <span className="text-gray-900 font-medium truncate">
                {currentCounselorName}
              </span>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                Assigned
              </span>
            </div>
          ) : (
            <button
              onClick={onReassignClick}
              className="text-blue-600 hover:text-blue-800 font-medium underline decoration-dashed underline-offset-2"
            >
              Unassigned - Click to Assign
            </button>
          )}
        </div>
      </div>

      {/* Reassign Button - Only show if already assigned */}
      {currentCounselorName && (
        <button
          onClick={onReassignClick}
          className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex-shrink-0 ml-2"
          title="Reassign counselor"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Reassign</span>
        </button>
      )}
    </div>
  );
};

export default CounselorAssignment;