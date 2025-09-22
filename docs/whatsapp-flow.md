# Beacon House CRM - WhatsApp Flow Functional Requirements

## Objective
Extend the existing Beacon House CRM with WhatsApp lead export functionality for manual message campaigns through Interakt platform. This addition enables systematic lead segmentation and export tracking without disrupting the current lead management workflow.

## Database Schema Addition

### New Table: whatsapp_leads
Tracks WhatsApp export status for qualified leads independently from the existing `form_sessions` and `crm_leads` tables.

```sql
-- WhatsApp Lead Tracking Table
CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  whatsapp_status text NOT NULL DEFAULT 'not_exported'
    CHECK (whatsapp_status IN ('not_exported', 'exported', 'message_sent')),
  export_date timestamptz,
  last_message_date timestamptz,
  exported_by uuid REFERENCES public.counselors(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS whatsapp_leads_session_id_idx ON public.whatsapp_leads (session_id);
CREATE INDEX IF NOT EXISTS whatsapp_leads_status_idx ON public.whatsapp_leads (whatsapp_status);
CREATE INDEX IF NOT EXISTS whatsapp_leads_export_date_idx ON public.whatsapp_leads (export_date);

-- Foreign key constraint
ALTER TABLE public.whatsapp_leads 
ADD CONSTRAINT fk_whatsapp_leads_session_id 
FOREIGN KEY (session_id) REFERENCES public.form_sessions(session_id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Counselors can view whatsapp leads"
ON public.whatsapp_leads FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Counselors can manage whatsapp leads"
ON public.whatsapp_leads FOR ALL
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

-- Update timestamp trigger
CREATE TRIGGER update_whatsapp_leads_timestamp
BEFORE UPDATE ON public.whatsapp_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Grant permissions
GRANT ALL ON public.whatsapp_leads TO authenticated;
```

## User Interface Requirements

### Navigation Structure
- **Primary Toggle**: "Lead Management" ↔ "WhatsApp Operations" at top level
- **Design Pattern**: Follow existing CRM design principles with consistent header, tabbed interface, and responsive cards/table layout

### WhatsApp Operations View

#### Tab Structure
1. **Call Not Booked** - Conversion campaigns
2. **Call Booked (≤5 days)** - Confirmation messages  
3. **Call Booked (>5 days)** - Reminder sequences
4. **Exported Leads** - Message status tracking

#### Lead Segmentation Logic

**Tab 1: Call Not Booked**
- Criteria: `lead_category` IN (bch, lum-l1, lum-l2) AND `is_counselling_booked = false`
- WhatsApp Status: `not_exported`
- Intent: Conversion messaging to book counseling slots

**Tab 2: Call Booked (≤5 days)**
- Criteria: Qualified leads AND `is_counselling_booked = true` AND (`selected_date` - `created_at`) ≤ 5 days
- WhatsApp Status: `not_exported`  
- Intent: Single congratulatory message

**Tab 3: Call Booked (>5 days)**
- Criteria: Qualified leads AND `is_counselling_booked = true` AND (`selected_date` - `created_at`) > 5 days
- WhatsApp Status: `not_exported`
- Intent: Congratulatory + reminder sequence messaging

**Tab 4: Exported Leads**
- Criteria: All leads with `whatsapp_status` IN ('exported', 'message_sent')
- Purpose: Message status tracking and updates

## Core Functionality

### Lead Display (Tabs 1-3)
- **Table View**: Desktop responsive table following existing CRM design patterns
- **Card View**: Mobile responsive cards with lead information
- **Selection**: Bulk selection checkboxes for export operations
- **Lead Information**: Student name, grade, curriculum, contact details, submission date
- **Real-time Updates**: Leads move between tabs automatically based on booking status changes

### Export Operations
- **Bulk Selection**: Multi-select leads within each tab
- **Export Action**: "Export Selected" button generates downloadable CSV
- **Status Update**: Exported leads immediately move to Tab 4
- **Export Tracking**: Record export date, exported_by counselor, optional notes

### Message Status Management (Tab 4)
- **Status Progression**: `exported` → `message_sent`
- **Bulk Updates**: Update multiple leads' message status simultaneously
- **Individual Updates**: Single lead status updates with dropdown
- **Export History**: Display export date and exporting counselor
- **Notes System**: Optional notes for campaign tracking

### Data Flow

#### Lead Initialization
- Auto-create `whatsapp_leads` records for qualified leads when WhatsApp view is first accessed
- Default status: `not_exported`

#### Export Process
1. Admin selects leads from Tabs 1-3
2. Clicks "Export Selected" 
3. System generates CSV with lead data
4. Updates `whatsapp_status` to 'exported'
5. Records `export_date` and `exported_by`
6. Leads disappear from source tab, appear in Tab 4

#### Status Updates
1. Admin opens Tab 4 (Exported Leads)
2. Selects leads with status 'exported'
3. Updates status to 'message_sent'
4. Optional: Add campaign notes

## Technical Integration

### Data Queries
- **Join Strategy**: LEFT JOIN `whatsapp_leads` with `form_sessions` and `crm_leads`
- **Performance**: Indexed queries on session_id and whatsapp_status
- **Real-time**: Updates reflect immediately across tabs

### CSV Export Format
Include fields: session_id, student_name, phone_number, parent_name, parent_email, current_grade, curriculum_type, lead_category, selected_date (if applicable)

### User Permissions
- **Admin Role**: Full access to all WhatsApp operations
- **Senior/Junior Counselors**: View-only access (future enhancement)

## Success Metrics
- Prevent duplicate lead exports through status tracking
- Clear campaign segmentation for targeted messaging
- Manual flexibility for iterative campaign optimization
- Complete audit trail of export and messaging activities

## Future Enhancements
- Expandable `whatsapp_status` values for granular message tracking
- Automated timing logic for campaign sequences
- Integration with WhatsApp Business API for direct messaging
- Campaign performance analytics and reporting