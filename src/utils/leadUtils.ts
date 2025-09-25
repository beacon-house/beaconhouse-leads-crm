// Lead utility functions for data formatting and display
// Provides helper functions for consistent lead data presentation across components

import { LeadStatus } from '../types/leads';

/**
 * Convert lead status code to human-readable label
 * @param status - The lead status code (e.g., '01_yet_to_contact')
 * @returns Human-readable status label (e.g., 'Yet to Contact')
 */
export function getLeadStatusLabel(status: LeadStatus): string {
  const statusMap: Record<LeadStatus, string> = {
    '01_yet_to_contact': 'Yet to Contact',
    '02_failed_to_contact': 'Failed to Contact',
    '03_counselling_call_booked': 'Counselling Call Booked',
    '04_counselling_call_rescheduled': 'Counselling Call Rescheduled',
    '05_counselling_call_no_show': 'Counselling Call No Show',
    '05b_to_be_rescheduled': 'To Be Rescheduled',
    '06_counselling_call_done': 'Counselling Call Done',
    '07a_followup_call_requested_vishy': 'Follow-up Call (Vishy)',
    '07b_followup_call_requested_karthik': 'Follow-up Call (Karthik)',
    '07c_followup_call_requested_kg': 'Follow-up Call (KG)',
    '08_interest_exploration': 'Interest Exploration',
    '09_price_negotiation': 'Price Negotiation',
    '10_converted': 'Converted',
    '11_drop': 'Dropped',
    '12_conversion_followup': 'Conversion Follow-up',
  };

  return statusMap[status] || status.replace(/_/g, ' ').replace(/^\d+\s/, '');
}

/**
 * Format lead creation timestamp for display
 * Converts UTC timestamp to IST and formats for user-friendly display
 * @param utcTimestamp - UTC timestamp string from database (e.g., '2025-09-17 09:04:01.99749+00')
 * @returns Object with formatted date and time strings
 */
export function formatLeadCreatedAtDisplay(utcTimestamp: string): {
  date: string;
  time: string;
} {
  const date = new Date(utcTimestamp);
  
  // Format date as "25 Aug, 2025"
  const formattedDate = date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
  
  // Format time as "04:30 PM" in IST
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
  
  return {
    date: formattedDate,
    time: formattedTime
  };
}