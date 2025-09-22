// CSV export utility for WhatsApp lead management
// Generates downloadable CSV files from lead data

import { WhatsappExportData } from '../types/whatsappLeads';

export class CsvUtils {
  /**
   * Generate and download CSV file from lead data
   * @param leads Array of lead data to export
   * @param filename Name of the file to download
   */
  static downloadCsv(leads: WhatsappExportData[], filename: string = 'whatsapp_leads_export.csv'): void {
    console.log(`📄 Generating CSV export for ${leads.length} leads`);
    
    if (leads.length === 0) {
      console.warn('No leads provided for CSV export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Session ID',
      'Student Name',
      'Phone Number',
      'Parent Name',
      'Parent Email',
      'Current Grade',
      'Curriculum Type',
      'Lead Category',
      'Selected Date',
      'Selected Slot',
      'Created Date'
    ];

    // Convert leads to CSV rows
    const csvRows = leads.map(lead => [
      lead.session_id || '',
      lead.student_name || '',
      lead.phone_number || '',
      lead.parent_name || '',
      lead.parent_email || '',
      lead.current_grade || '',
      lead.curriculum_type || '',
      lead.lead_category || '',
      lead.selected_date || '',
      lead.selected_slot || '',
      lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''
    ]);

    // Combine headers and data
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(cell => this.escapeCsvCell(cell)).join(','))
      .join('\n');

    // Create and trigger download
    this.triggerDownload(csvContent, filename);
    
    console.log(`✅ CSV export completed: ${filename}`);
  }

  /**
   * Escape CSV cell content to handle commas, quotes, and newlines
   * @param cell Cell content to escape
   * @returns Escaped cell content
   */
  private static escapeCsvCell(cell: string): string {
    if (typeof cell !== 'string') {
      cell = String(cell);
    }

    // If cell contains comma, quote, or newline, wrap in quotes and escape existing quotes
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }

    return cell;
  }

  /**
   * Create blob and trigger browser download
   * @param csvContent CSV content string
   * @param filename Download filename
   */
  private static triggerDownload(csvContent: string, filename: string): void {
    try {
      // Create blob with UTF-8 BOM for Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });

      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error triggering CSV download:', error);
      throw new Error('Failed to download CSV file');
    }
  }

  /**
   * Generate filename with timestamp
   * @param prefix Filename prefix
   * @returns Timestamped filename
   */
  static generateTimestampedFilename(prefix: string = 'whatsapp_leads_export'): string {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .substring(0, 19); // Remove milliseconds and timezone
    
    return `${prefix}_${timestamp}.csv`;
  }
}