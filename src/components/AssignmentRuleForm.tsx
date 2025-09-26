// Assignment Rule Form - Create and edit assignment rules
// Provides form interface for configuring lead assignment rules

import React, { useState, useEffect } from 'react';
import { Save, X, AlertCircle, ArrowLeft } from 'lucide-react';
import { AssignmentRule, AssignmentRuleFormData } from '../types/assignmentRules';
import { Counselor, LeadStatus } from '../types/leads';
import { LeadService } from '../services/leadService';
import { getLeadStatusLabel } from '../utils/leadUtils';

interface AssignmentRuleFormProps {
  rule: AssignmentRule | null;
  onSubmit: (formData: AssignmentRuleFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const AssignmentRuleForm: React.FC<AssignmentRuleFormProps> = ({
  rule,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loadingCounselors, setLoadingCounselors] = useState(false);
  const [formData, setFormData] = useState<AssignmentRuleFormData>({
    rule_name: '',
    rule_priority: 100,
    trigger_lead_category: null,
    trigger_lead_status: null,
    assigned_counselor_id: '',
    start_date: new Date().toISOString().split('T')[0], // Today
    end_date: null,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const leadCategories = ['bch', 'lum-l1', 'lum-l2'];
  const leadStatuses: LeadStatus[] = [
    '01_yet_to_contact',
    '02_failed_to_contact',
    '03_counselling_call_booked',
    '04_counselling_call_rescheduled',
    '05_counselling_call_no_show',
    '05b_to_be_rescheduled',
    '06_counselling_call_done',
    '07_followup_call_requested',
    '07a_followup_call_requested_vishy',
    '07b_followup_call_requested_karthik',
    '07c_followup_call_requested_matt',
    '08_interest_exploration',
    '09_price_negotiation',
    '10_converted',
    '11_drop',
    '12_conversion_followup',
  ];

  useEffect(() => {
    if (rule) {
      setFormData({
        rule_name: rule.rule_name,
        rule_priority: rule.rule_priority,
        trigger_lead_category: rule.trigger_lead_category,
        trigger_lead_status: rule.trigger_lead_status,
        assigned_counselor_id: rule.assigned_counselor_id,
        start_date: rule.start_date,
        end_date: rule.end_date,
        is_active: rule.is_active,
      });
    }
  }, [rule]);

  useEffect(() => {
    fetchCounselors();
  }, []);

  const fetchCounselors = async () => {
    setLoadingCounselors(true);
    try {
      const data = await LeadService.getCounselors();
      setCounselors(data);
    } catch (error) {
      console.error('Error fetching counselors:', error);
    } finally {
      setLoadingCounselors(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.rule_name.trim()) {
      newErrors.rule_name = 'Rule name is required';
    }

    if (formData.rule_priority < 0) {
      newErrors.rule_priority = 'Priority must be 0 or greater';
    }

    if (!formData.assigned_counselor_id) {
      newErrors.assigned_counselor_id = 'Please select a counselor';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (!formData.trigger_lead_category && !formData.trigger_lead_status) {
      newErrors.triggers = 'At least one trigger (category or status) must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof AssignmentRuleFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onCancel}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                disabled={isLoading}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {rule ? 'Edit Assignment Rule' : 'Create Assignment Rule'}
                </h2>
                <p className="text-sm text-gray-600">
                  {rule ? 'Update the assignment rule configuration' : 'Configure automatic lead assignment'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="rule_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="rule_name"
                  value={formData.rule_name}
                  onChange={(e) => handleInputChange('rule_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.rule_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., BCH Leads → Vishy"
                  disabled={isLoading}
                />
                {errors.rule_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.rule_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="rule_priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="rule_priority"
                  min="0"
                  value={formData.rule_priority}
                  onChange={(e) => handleInputChange('rule_priority', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.rule_priority ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-gray-500">Lower number = higher priority</p>
                {errors.rule_priority && (
                  <p className="mt-1 text-sm text-red-600">{errors.rule_priority}</p>
                )}
              </div>
            </div>

            {/* Trigger Conditions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Trigger Conditions</h3>
              <p className="text-sm text-gray-600">
                Define when this rule should be applied. Select at least one trigger condition.
              </p>
              
              {errors.triggers && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.triggers}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="trigger_lead_category" className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Category
                  </label>
                  <select
                    id="trigger_lead_category"
                    value={formData.trigger_lead_category || ''}
                    onChange={(e) => handleInputChange('trigger_lead_category', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    disabled={isLoading}
                  >
                    <option value="">Any Category</option>
                    {leadCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="trigger_lead_status" className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Status
                  </label>
                  <select
                    id="trigger_lead_status"
                    value={formData.trigger_lead_status || ''}
                    onChange={(e) => handleInputChange('trigger_lead_status', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    disabled={isLoading}
                  >
                    <option value="">Any Status</option>
                    {leadStatuses.map((status) => (
                      <option key={status} value={status}>
                        {getLeadStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div>
              <label htmlFor="assigned_counselor_id" className="block text-sm font-medium text-gray-700 mb-2">
                Assign To <span className="text-red-500">*</span>
              </label>
              {loadingCounselors ? (
                <div className="text-sm text-gray-600">Loading counselors...</div>
              ) : (
                <select
                  id="assigned_counselor_id"
                  value={formData.assigned_counselor_id}
                  onChange={(e) => handleInputChange('assigned_counselor_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.assigned_counselor_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">Select Counselor</option>
                  {counselors.map((counselor) => (
                    <option key={counselor.id} value={counselor.id}>
                      {counselor.name} ({counselor.role}) - {counselor.email}
                    </option>
                  ))}
                </select>
              )}
              {errors.assigned_counselor_id && (
                <p className="mt-1 text-sm text-red-600">{errors.assigned_counselor_id}</p>
              )}
            </div>

            {/* Date Range */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Active Period</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.start_date ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    value={formData.end_date || ''}
                    onChange={(e) => handleInputChange('end_date', e.target.value || null)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.end_date ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  />
                  <p className="mt-1 text-xs text-gray-500">Leave empty for perpetual rule</p>
                  {errors.end_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Rule is active
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{rule ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{rule ? 'Update Rule' : 'Create Rule'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignmentRuleForm;