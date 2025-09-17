import React from 'react';
// Filter tabs component for lead categorization based on form_sessions data
// Provides quick access to different lead segments using actual database filters

type FilterTab = 'all' | 'form_completions' | 'qualified' | 'counseling_booked' | 'unassigned';

interface FilterTabsProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  leadCounts?: {
    all: number;
    form_completions: number;
    qualified: number;
    counseling_booked: number;
    unassigned: number;
  };
}

const FilterTabs: React.FC<FilterTabsProps> = ({ 
  activeTab, 
  onTabChange, 
  leadCounts = { all: 0, form_completions: 0, qualified: 0, counseling_booked: 0, unassigned: 0 }
}) => {
  const tabs = [
    { 
      id: 'all' as const, 
      label: 'All Leads', 
      count: leadCounts.all,
      description: 'All leads from form_sessions'
    },
    { 
      id: 'form_completions' as const, 
      label: 'Form Completions', 
      count: leadCounts.form_completions,
      description: 'funnel_stage IN (\'10_form_submit\', \'form_complete_legacy_26_aug\')'
    },
    { 
      id: 'qualified' as const, 
      label: 'Qualified - Action Needed', 
      count: leadCounts.qualified,
      description: 'Qualified leads who have not yet completed the form submission'
    },
    { 
      id: 'counseling_booked' as const, 
      label: 'Counseling Booked', 
      count: leadCounts.counseling_booked,
      description: 'Leads who have both booked counseling and completed form submission'
    },
    { 
      id: 'unassigned' as const, 
      label: 'Unassigned Leads', 
      count: leadCounts.unassigned,
      description: 'Leads not assigned to any counselor'
    },
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      {/* Mobile: Horizontal Scrollable Tabs */}
      <div className="lg:hidden">
        <nav className="flex space-x-4 overflow-x-auto pb-2" aria-label="Tabs">
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
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                <span>{tab.label}</span>
                <span className={`py-1 px-2 rounded-full text-xs font-semibold ${
                  activeTab === tab.id 
                    ? 'bg-blue-200 text-blue-800' 
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
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              title={tab.description}
              className={`
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs ${
                activeTab === tab.id 
                  ? 'bg-blue-100 text-blue-800' 
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

export default FilterTabs;