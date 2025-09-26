// Admin Rules Management View - Main container for assignment rules administration
// Provides interface for admins to manage lead assignment rules

import React, { useState, useEffect } from 'react';
import { Settings, Plus, AlertCircle } from 'lucide-react';
import AssignmentRuleList from './AssignmentRuleList';
import AssignmentRuleForm from './AssignmentRuleForm';
import { AssignmentRule, AssignmentRuleFormData } from '../types/assignmentRules';
import { AssignmentRuleService } from '../services/assignmentRuleService';

const AdminRulesManagementView: React.FC = () => {
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await AssignmentRuleService.getAllAssignmentRules();
      setRules(data);
    } catch (error) {
      console.error('Error fetching rules:', error);
      setError('Failed to load assignment rules. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowForm(true);
  };

  const handleEditRule = (rule: AssignmentRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
      return;
    }

    try {
      await AssignmentRuleService.deleteAssignmentRule(ruleId);
      await fetchRules(); // Refresh the list
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule. Please try again.');
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await AssignmentRuleService.toggleRuleStatus(ruleId, isActive);
      await fetchRules(); // Refresh the list
    } catch (error) {
      console.error('Error toggling rule status:', error);
      alert('Failed to update rule status. Please try again.');
    }
  };

  const handleFormSubmit = async (formData: AssignmentRuleFormData) => {
    setIsSubmitting(true);
    try {
      if (editingRule) {
        // Update existing rule
        await AssignmentRuleService.updateAssignmentRule({
          id: editingRule.id,
          ...formData,
        });
      } else {
        // Create new rule
        await AssignmentRuleService.createAssignmentRule(formData);
      }
      
      setShowForm(false);
      setEditingRule(null);
      await fetchRules(); // Refresh the list
    } catch (error) {
      console.error('Error saving rule:', error);
      alert(`Failed to ${editingRule ? 'update' : 'create'} rule. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingRule(null);
  };

  if (showForm) {
    return (
      <AssignmentRuleForm
        rule={editingRule}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
        isLoading={isSubmitting}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Settings className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Assignment Rules</h2>
                <p className="text-sm text-gray-600">Configure automatic lead assignment based on category and status</p>
              </div>
            </div>
            
            <button
              onClick={handleCreateRule}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
          {error ? (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
              <div className="flex items-center space-x-3 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <h3 className="font-medium">Error Loading Rules</h3>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchRules}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <AssignmentRuleList
              rules={rules}
              isLoading={isLoading}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              onToggle={handleToggleRule}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRulesManagementView;