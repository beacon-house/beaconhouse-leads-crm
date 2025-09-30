// WhatsApp Stage Filter Dropdown - Multi-select dropdown for filtering leads by CRM stage
// Allows selection of multiple lead statuses including "Not in CRM" option

import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Filter, Check } from 'lucide-react';
import { getLeadStatusLabel } from '../utils/leadUtils';
import { LeadStatus } from '../types/leads';

interface WhatsappStageFilterDropdownProps {
  stageCountsData: Record<string, number>;
  selectedStages: string[];
  onSelectionChange: (stages: string[]) => void;
}

const WhatsappStageFilterDropdown: React.FC<WhatsappStageFilterDropdownProps> = ({
  stageCountsData,
  selectedStages,
  onSelectionChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // All possible lead statuses plus not_in_crm
  const allStageOptions: Array<{ value: string; label: string; isSpecial?: boolean }> = [
    { value: 'not_in_crm', label: 'Not in CRM', isSpecial: true },
    { value: '01_yet_to_contact', label: getLeadStatusLabel('01_yet_to_contact' as LeadStatus) },
    { value: '02_failed_to_contact', label: getLeadStatusLabel('02_failed_to_contact' as LeadStatus) },
    { value: '03_counselling_call_booked', label: getLeadStatusLabel('03_counselling_call_booked' as LeadStatus) },
    { value: '04_counselling_call_rescheduled', label: getLeadStatusLabel('04_counselling_call_rescheduled' as LeadStatus) },
    { value: '05_counselling_call_no_show', label: getLeadStatusLabel('05_counselling_call_no_show' as LeadStatus) },
    { value: '05b_to_be_rescheduled', label: getLeadStatusLabel('05b_to_be_rescheduled' as LeadStatus) },
    { value: '06_counselling_call_done', label: getLeadStatusLabel('06_counselling_call_done' as LeadStatus) },
    { value: '07_followup_call_requested', label: getLeadStatusLabel('07_followup_call_requested' as LeadStatus) },
    { value: '07a_followup_call_requested_vishy', label: getLeadStatusLabel('07a_followup_call_requested_vishy' as LeadStatus) },
    { value: '07b_followup_call_requested_karthik', label: getLeadStatusLabel('07b_followup_call_requested_karthik' as LeadStatus) },
    { value: '07c_followup_call_requested_matt', label: getLeadStatusLabel('07c_followup_call_requested_matt' as LeadStatus) },
    { value: '08_interest_exploration', label: getLeadStatusLabel('08_interest_exploration' as LeadStatus) },
    { value: '09_price_negotiation', label: getLeadStatusLabel('09_price_negotiation' as LeadStatus) },
    { value: '10_converted', label: getLeadStatusLabel('10_converted' as LeadStatus) },
    { value: '11_drop', label: getLeadStatusLabel('11_drop' as LeadStatus) },
    { value: '12_conversion_followup', label: getLeadStatusLabel('12_conversion_followup' as LeadStatus) },
  ];

  // Filter options to only show those with counts > 0
  const availableOptions = allStageOptions.filter(option => {
    const count = stageCountsData[option.value] || 0;
    return count > 0;
  });

  const handleToggleStage = (stageValue: string) => {
    const newSelection = selectedStages.includes(stageValue)
      ? selectedStages.filter(s => s !== stageValue)
      : [...selectedStages, stageValue];
    
    onSelectionChange(newSelection);
  };

  const formatStageDisplay = (option: { value: string; label: string; isSpecial?: boolean }) => {
    const count = stageCountsData[option.value] || 0;
    if (option.isSpecial) {
      return `${option.label} (${count})`;
    }
    
    // Extract number from value for display
    const stageNumber = option.value.match(/^(\d+[a-z]?)/)?.[1] || '';
    return stageNumber ? `${stageNumber} - ${option.label} (${count})` : `${option.label} (${count})`;
  };

  const getPlaceholderText = () => {
    if (selectedStages.length === 0) {
      return 'Select stage(s)';
    } else if (selectedStages.length === 1) {
      const selectedOption = allStageOptions.find(opt => opt.value === selectedStages[0]);
      return selectedOption ? selectedOption.label : selectedStages[0];
    } else {
      return `${selectedStages.length} stages selected`;
    }
  };

  // Portal target
  const portalTarget = document.getElementById('portal-root');

  return (
    <div className="relative w-full max-w-md">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-colors"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <Filter className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <span className="text-gray-900 truncate">
            {getPlaceholderText()}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && portalTarget && ReactDOM.createPortal(
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="fixed z-[9999] w-80 bg-white border border-gray-300 rounded-lg shadow-xl max-h-96 overflow-y-auto" 
            style={{
              top: `${(buttonRef.current?.getBoundingClientRect().bottom || 0) + 4}px`,
              left: `${buttonRef.current?.getBoundingClientRect().left || 0}px`,
            }}
          >
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-3 py-2 border-b border-gray-100 mb-2">
                Filter by CRM Stage ({availableOptions.length} options available)
              </div>
              
              {availableOptions.length === 0 ? (
                <div className="text-sm text-gray-500 px-3 py-4 text-center">
                  No leads available for filtering
                </div>
              ) : (
                <div className="space-y-1">
                  {availableOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleToggleStage(option.value)}
                      className="w-full py-2 px-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 rounded-md transition-colors text-gray-900 flex items-center justify-between"
                    >
                      <span className="flex-1 text-sm">
                        {formatStageDisplay(option)}
                      </span>
                      {selectedStages.includes(option.value) && (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedStages.length > 0 && (
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <button
                    onClick={() => onSelectionChange([])}
                    className="w-full py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    Clear all selections
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      , portalTarget)}
    </div>
  );
};

export default WhatsappStageFilterDropdown;