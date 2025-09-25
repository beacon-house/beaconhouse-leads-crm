import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Target, Phone, Calendar, UserX, CheckCircle, MessageCircle, Heart, DollarSign, RotateCcw, Search, CheckCircle2, X, ArrowRight } from 'lucide-react';
// Enhanced status dropdown component with stage progression and user-friendly labels
// Shows clear visual progression through the CRM workflow stages

import { LeadStatus } from '../types/leads';

interface StatusDropdownProps {
  currentStatus: LeadStatus;
  leadId: string; // This is session_id, not form_sessions.id
  onStatusChange: (sessionId: string, newStatus: LeadStatus) => void;
  onOpen?: () => void;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  leadId,
  onStatusChange,
  onOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const statusOptions: { 
    value: LeadStatus; 
    label: string; 
    stage: number;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }[] = [
    { 
      value: '01_yet_to_contact', 
      label: 'Yet to Contact', 
      stage: 1,
      icon: <Target className="w-4 h-4" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      value: '02_failed_to_contact', 
      label: 'Failed to Contact', 
      stage: 2,
      icon: <UserX className="w-4 h-4" />,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    { 
      value: '03_counselling_call_booked', 
      label: 'Counselling Call Booked', 
      stage: 3,
      icon: <Calendar className="w-4 h-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      value: '04_counselling_call_rescheduled', 
      label: 'Counselling Call Rescheduled', 
      stage: 4,
      icon: <Calendar className="w-4 h-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    { 
      value: '05_counselling_call_no_show', 
      label: 'Counselling Call No Show', 
      stage: 5,
      icon: <UserX className="w-4 h-4" />,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    { 
      value: '05b_to_be_rescheduled', 
      label: 'To Be Rescheduled', 
      stage: 6,
      icon: <RotateCcw className="w-4 h-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    { 
      value: '06_counselling_call_done', 
      label: 'Counselling Call Completed', 
      stage: 7,
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    { 
      value: '07a_followup_call_requested_vishy', 
      label: 'Follow-up Call (Vishy)', 
      stage: 8,
      icon: <Phone className="w-4 h-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      value: '07b_followup_call_requested_karthik', 
      label: 'Follow-up Call (Karthik)', 
      stage: 9,
      icon: <Phone className="w-4 h-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      value: '07c_followup_call_requested_kg', 
      label: 'Follow-up Call (KG)', 
      stage: 10,
      icon: <Phone className="w-4 h-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      value: '08_interest_exploration', 
      label: 'Interest Exploration', 
      stage: 11,
      icon: <Search className="w-4 h-4" />,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    },
    { 
      value: '09_price_negotiation', 
      label: 'Price Negotiation', 
      stage: 12,
      icon: <DollarSign className="w-4 h-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      value: '10_converted', 
      label: 'Converted', 
      stage: 13,
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    { 
      value: '11_drop', 
      label: 'Dropped', 
      stage: 14,
      icon: <X className="w-4 h-4" />,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    { 
      value: '12_conversion_followup', 
      label: 'Conversion Follow-up', 
      stage: 15,
      icon: <ArrowRight className="w-4 h-4" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
  ];

  const currentOption = statusOptions.find(option => option.value === currentStatus);

  // Get available options (excluding current status to avoid duplication)
  const availableOptions = statusOptions.filter(option => option.value !== currentStatus);

  const handleStatusSelect = (newStatus: LeadStatus) => {
    onStatusChange(leadId, newStatus);
    setIsOpen(false);
  };

  // Portal target
  const portalTarget = document.getElementById('portal-root');

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => {
          if (onOpen && !isOpen) {
            onOpen();
          }
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0 min-h-[44px] lg:min-h-0 touch-manipulation transition-colors ${
          currentOption?.bgColor || 'bg-white'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className={currentOption?.color || 'text-gray-600'}>
            {currentOption?.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                currentOption?.bgColor?.replace('bg-', 'bg-opacity-50 bg-') || 'bg-gray-200'
              } ${currentOption?.color || 'text-gray-600'}`}>
                Stage {currentOption?.stage || 1}
              </span>
              <span className="text-gray-900 font-medium flex-1 min-w-0">
                {currentOption?.label || currentStatus}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && portalTarget && ReactDOM.createPortal(
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed z-[9999] w-96 bg-white border border-gray-300 rounded-lg shadow-xl" 
               style={{
                 top: `${buttonRef.current?.getBoundingClientRect().bottom || 0}px`,
                 left: `${buttonRef.current?.getBoundingClientRect().left || 0}px`,
               }}>
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-3 py-2 border-b border-gray-100 mb-2">
                Lead Status Progression (15 Stages Total)
              </div>
              
              {/* Current Status - Always shown first */}
              {currentOption && (
                <div className="mb-2 pb-2 border-b border-gray-100">
                  <div className={`w-full py-1 px-2 rounded-md ${currentOption.bgColor} ${currentOption.color}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`flex-shrink-0 mt-0.5 ${currentOption.color}`}>
                        {currentOption.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${currentOption.bgColor} ${currentOption.color}`}>
                            Stage {currentOption.stage}
                          </span>
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Current
                          </span>
                          <div className={`font-medium ${currentOption.color}`}>
                            {currentOption.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Options */}
              <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                {availableOptions.map((option) => {
                  const isNextStage = option.stage === (currentOption?.stage || 0) + 1;
                  const isPreviousStage = option.stage < (currentOption?.stage || 0);
                  
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleStatusSelect(option.value)}
                      className={`
                        w-full py-1 px-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 rounded-md transition-colors text-gray-900
                        ${isNextStage ? 'ring-2 ring-blue-200 ring-opacity-50' : ''}
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 mt-0.5 text-gray-400">
                          {option.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              isPreviousStage 
                                  ? 'bg-gray-100 text-gray-500'
                                  : isNextStage
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-gray-100 text-gray-400'
                            }`}>
                              Stage {option.stage}
                            </span>
                            {isNextStage && (
                              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                                Next
                              </span>
                            )}
                            <div className={`font-medium ${
                              'text-gray-900'
                            }`}>
                              {option.label}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      , portalTarget)}
    </div>
  );
};

export default StatusDropdown;