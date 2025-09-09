// Authentication form component using Supabase Auth UI
// Provides secure email/password login interface for CRM access

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AuthForm: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Beacon House CRM
          </h1>
          <p className="text-gray-600">
            Sign in to access the lead management system
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#2563eb',
                    brandAccent: '#1d4ed8',
                    brandButtonText: 'white',
                    defaultButtonBackground: '#f3f4f6',
                    defaultButtonBackgroundHover: '#e5e7eb',
                    inputBackground: 'transparent',
                    inputBorder: '#d1d5db',
                    inputBorderHover: '#9ca3af',
                    inputBorderFocus: '#2563eb',
                  },
                  space: {
                    buttonPadding: '12px 16px',
                    inputPadding: '12px 16px',
                  },
                  fontSizes: {
                    baseButtonSize: '14px',
                    baseInputSize: '14px',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '8px',
                    buttonBorderRadius: '8px',
                    inputBorderRadius: '8px',
                  },
                },
              },
              className: {
                container: 'auth-container',
                button: 'auth-button',
                input: 'auth-input',
                label: 'auth-label text-gray-700 font-medium',
                message: 'auth-message',
              },
            }}
            providers={[]}
            view="sign_in"
            showLinks={false}
            magicLink={false}
            redirectTo={window.location.origin}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Use your assigned counselor credentials to access the system</p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;