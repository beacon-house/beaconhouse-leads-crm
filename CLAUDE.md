# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

## Architecture Overview

This is a React TypeScript CRM application for Beacon House, built with Vite and integrating with Supabase for backend services. The app manages student leads through a multi-stage funnel process.

### Core Data Architecture

**Golden Rule**: `form_sessions` is read-only from the client side. Only `crm_leads` and `crm_comments` can be modified.

The application operates on three main database tables:

1. **form_sessions**: Source of truth for all lead data from form submissions (read-only)
2. **crm_leads**: CRM-specific data (status, assignments, contact history) - editable
3. **crm_comments**: Activity log and notes for each lead - editable

### Key Components Structure

- **App.tsx**: Main application with three views (Lead Management, WhatsApp Operations, Admin Rules)
- **Lead Management**: Primary CRM interface with filtering, pagination, and lead assignment
- **WhatsApp Operations**: Separate interface for WhatsApp lead management
- **Admin Rules**: Assignment rule configuration (admin-only)

### Authentication & Authorization

- Uses Supabase Auth with Row Level Security (RLS)
- Three user roles: `admin`, `senior_counselor`, `junior_counselor`
- Role-based data access enforced at database level
- User role fetched from `counselors` table using authenticated user ID

### Data Flow Patterns

- All lead queries join `form_sessions` with `crm_leads` and `counselors`
- Status updates create entries in `crm_leads` if they don't exist
- Assignment changes always log to `crm_comments`
- Auto-assignment rules can trigger based on lead category and status

### State Management

- Local React state for UI state
- Supabase client for data fetching and real-time updates
- AuthContext for user session management
- Service layer pattern for data operations (`leadService.ts`, `whatsappLeadService.ts`)

### Key Services

- **LeadService**: Main CRM operations (status updates, assignments, filtering)
- **WhatsappLeadService**: WhatsApp-specific lead management
- **AssignmentRuleService**: Auto-assignment rule processing

### Environment Variables Required

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

### Database Schema References

- Database schemas documented in `src/docs/crm-tables-db-schema.md` and `src/docs/form-sessions-db-schema.md`
- Contains idempotent SQL scripts for table creation and RLS policies