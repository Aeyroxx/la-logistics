'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Settings {
  company_name: string;
  company_logo: string;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_enabled: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({
    company_name: '',
    company_logo: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    smtp_enabled: 'false'
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const router = useRouter();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('http://localhost:3003/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
      setMessage('Please select a logo file');
      setMessageType('error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3003/api/upload/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          company_logo: data.logoUrl
        }));
        setMessage('Logo uploaded successfully');
        setMessageType('success');
        setLogoFile(null);
      } else {
        const error = await response.json();
        setMessage(error.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Failed to upload logo');
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3003/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage('Settings saved successfully');
        setMessageType('success');
      } else {
        const error = await response.json();
        setMessage(error.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Failed to save settings');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!settings.smtp_enabled || settings.smtp_enabled === 'false') {
      setMessage('Email is not enabled');
      setMessageType('error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3003/api/email/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: settings.smtp_from_email,
          subject: 'Test Email - L&A Logistics',
          reportType: 'summary',
          dateFilter: 'today'
        })
      });

      if (response.ok) {
        setMessage('Test email sent successfully');
        setMessageType('success');
      } else {
        const error = await response.json();
        setMessage(error.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Failed to send test email');
      setMessageType('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Back to Admin
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-8">
            {/* Company Settings */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={settings.company_name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="L&A Logistic Services"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    {settings.company_logo && (
                      <img
                        src={`http://localhost:3003${settings.company_logo}`}
                        alt="Company Logo"
                        className="w-16 h-16 object-contain border rounded"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                      <button
                        onClick={handleLogoUpload}
                        disabled={!logoFile || uploading}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {uploading ? 'Uploading...' : 'Upload Logo'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Settings */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Email Configuration</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enable Email
                </label>
                <select
                  name="smtp_enabled"
                  value={settings.smtp_enabled}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </select>
              </div>

              {settings.smtp_enabled === 'true' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      name="smtp_host"
                      value={settings.smtp_host}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Port
                    </label>
                    <input
                      type="text"
                      name="smtp_port"
                      value={settings.smtp_port}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="587"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      name="smtp_username"
                      value={settings.smtp_username}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      name="smtp_password"
                      value={settings.smtp_password}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Your app password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Email
                    </label>
                    <input
                      type="email"
                      name="smtp_from_email"
                      value={settings.smtp_from_email}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="noreply@your-domain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Name
                    </label>
                    <input
                      type="text"
                      name="smtp_from_name"
                      value={settings.smtp_from_name}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="L&A Logistics"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              
              {settings.smtp_enabled === 'true' && (
                <button
                  onClick={handleTestEmail}
                  className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Send Test Email
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 py-4 mt-8">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-sm text-gray-500">
              Made with ❤️ by aewon.sebastian
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
