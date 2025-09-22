// WhatsApp Filter Tabs - Navigation tabs for WhatsApp lead segmentation
// Displays the four main WhatsApp export categories with lead counts

import React from 'react';
import { WhatsappFilterTab, WhatsappLeadCounts } from '../types/whatsappLeads';

interface WhatsappFilterTabsProps {
  activeTab: WhatsappFilterTab;
  onTabChange: (tab: WhatsappFilterTab) => void;
  leadCounts: WhatsappLeadCounts;
}

const WhatsappFilterTabs: React.FC<WhatsappFilterTabsProps> = ({ 
  activeTab, 
  onTabChange, 
  leadCounts 
}) => {
  const tabs = [
    { 
      id: 'call_not_booked' as const, 
      label: 'Call Not Booked', 
      count: leadCounts.call_not_booked,
      description: 'Qualified leads who haven\'t booked counseling - conversion campaigns'
    },
    { 
      id: 'call_booked_5_days' as const, 
      label: 'Call Booked (≤5 days)', 
      count: leadCounts.call_booked_5_days,
      description: 'Counseling booked within 5 days - confirmation messages'
    },
    { 
      id: 'call_booked_more_5_days' as const, 
      label: 'Call Booked (>5 days)', 
      count: leadCounts.call_booked_more_5_days,
      description: 'Counseling booked more than 5 days out - reminder sequences'
    },
    { 
      id: 'exported_leads' as const, 
      label: 'Exported Leads', 
      count: leadCounts.exported_leads,
      description: 'Leads that have been exported - message status tracking'
    },
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      {/* Mobile: Horizontal Scrollable Tabs */}
      <div className="lg:hidden">
        <nav className="flex space-x-4 overflow-x-auto pb-2" aria-label="WhatsApp Tabs">
          <div className="flex space-x-4 min-w-max px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={tab.description}
                className={`
                  flex items-center space-x-2 whitespace-nowrap py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 min-h-[48px]
                  ${
                    activeTab === tab.id
                      ? 'bg-green-100 text-green-700 border-2 border-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                <span>{tab.label}</span>
                <span className={`py-1 px-2 rounded-full text-xs font-semibold ${
                  activeTab === tab.id 
                    ? 'bg-green-200 text-green-800' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Desktop: Standard Tabs */}
      <div className="hidden lg:block">
        <nav className="-mb-px flex space-x-8" aria-label="WhatsApp Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              title={tab.description}
              className={`
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs ${
                activeTab === tab.id 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default WhatsappFilterTabs;