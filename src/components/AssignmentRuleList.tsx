// Assignment Rule List - Display and manage assignment rules in table format
// Shows all rules with their status, triggers, assignments, and actions

import React from 'react';
import { Edit, Trash2, ToggleLeft, ToggleRight, Crown, Users, User, Calendar, Tag, Target } from 'lucide-react';
import { AssignmentRule } from '../types/assignmentRules';
import { getLeadStatusLabel } from '../utils/leadUtils';

interface AssignmentRuleListProps {
  rules: AssignmentRule[];
  isLoading: boolean;
  onEdit: (rule: AssignmentRule) => void;
  onDelete: (ruleId: string) => void;
  onToggle: (ruleId: string, isActive: boolean) => void;
}

const AssignmentRuleList: React.FC<AssignmentRuleListProps> = ({
  rules,
  isLoading,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const getRoleIcon = (counselorEmail: string | undefined) => {
    if (counselorEmail?.includes('savitha')) return <Crown className="w-4 h-4 text-purple-600" />;
    if (counselorEmail?.includes('vishy') || counselorEmail?.includes('karthik')) return <Users className="w-4 h-4 text-blue-600" />;
    return <User className="w-4 h-4 text-green-600" />;
  };

  const formatTrigger = (category: string | null, status: string | null) => {
    const parts = [];
    if (category) {
      parts.push(`Category: ${category.toUpperCase()}`);
    }
    if (status) {
      parts.push(`Status: ${getLeadStatusLabel(status as any)}`);
    }
    return parts.length > 0 ? parts.join(' & ') : 'Any Lead';
  };

  const isRuleCurrentlyActive = (rule: AssignmentRule) => {
    if (!rule.is_active) return false;
    
    const today = new Date();
    const startDate = new Date(rule.start_date);
    const endDate = rule.end_date ? new Date(rule.end_date) : null;
    
    return today >= startDate && (!endDate || today <= endDate);
  };

  const formatDateRange = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate).toLocaleDateString();
    if (!endDate) return `${start} - Perpetual`;
    const end = new Date(endDate).toLocaleDateString();
    return `${start} - ${end}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignment rules...</p>
        </div>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignment Rules</h3>
          <p className="text-gray-600 mb-4">Create your first rule to start automatically assigning leads to counselors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {rules.length} Assignment Rule{rules.length !== 1 ? 's' : ''}
          </h3>
          <div className="text-sm text-gray-600">
            {rules.filter(r => isRuleCurrentlyActive(r)).length} currently active
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status & Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rule Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Triggers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rules.map((rule, index) => (
              <tr
                key={rule.id}
                className={`${
                  isRuleCurrentlyActive(rule) 
                    ? 'bg-green-50' 
                    : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-blue-50 transition-colors`}
              >
                {/* Status & Priority */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        isRuleCurrentlyActive(rule)
                          ? 'bg-green-100 text-green-800'
                          : rule.is_active
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isRuleCurrentlyActive(rule) ? 'Active' : rule.is_active ? 'Pending' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Priority: {rule.rule_priority}
                    </div>
                  </div>
                </td>

                {/* Rule Name */}
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {rule.rule_name}
                  </div>
                </td>

                {/* Triggers */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-sm">
                    {rule.trigger_lead_category && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Tag className="w-3 h-3 mr-1" />
                        {rule.trigger_lead_category.toUpperCase()}
                      </span>
                    )}
                    {rule.trigger_lead_status && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Target className="w-3 h-3 mr-1" />
                        {getLeadStatusLabel(rule.trigger_lead_status as any)}
                      </span>
                    )}
                    {!rule.trigger_lead_category && !rule.trigger_lead_status && (
                      <span className="text-gray-500 italic">Any Lead</span>
                    )}
                  </div>
                </td>

                {/* Assigned To */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(rule.assigned_counselor_email)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {rule.assigned_counselor_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {rule.assigned_counselor_email || ''}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Date Range */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateRange(rule.start_date, rule.end_date)}</span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onToggle(rule.id, !rule.is_active)}
                      className={`p-2 rounded-md transition-colors ${
                        rule.is_active 
                          ? 'text-green-600 hover:bg-green-100' 
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={rule.is_active ? 'Deactivate rule' : 'Activate rule'}
                    >
                      {rule.is_active ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => onEdit(rule)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                      title="Edit rule"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(rule.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignmentRuleList;