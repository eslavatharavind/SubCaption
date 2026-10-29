'use client';

import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'appearance' | 'language' | 'notifications'>('profile');

  const [name, setName] = useState('Creator');
  const [defaultLang, setDefaultLang] = useState('te');
  const [appearance, setAppearance] = useState('dark');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <AppShell title="Settings">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-[#151A21] border border-[#262D36] p-6 rounded-2xl">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Account Settings
          </h2>
          <p className="text-brand-muted text-sm mt-1">
            Manage your profile, preferences, and language defaults.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#262D36] gap-2 overflow-x-auto pb-1">
          {(['profile', 'account', 'appearance', 'language', 'notifications'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                activeTab === tab
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-brand-muted hover:text-white hover:bg-[#151A21]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-center space-x-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Settings saved successfully!</span>
          </div>
        )}

        {/* TAB 1: PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-[#151A21] border border-[#262D36] p-6 rounded-2xl space-y-6">
            <h3 className="text-base font-bold text-white">Profile Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base w-full max-w-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || 'user@example.com'}
                  disabled
                  className="input-base w-full max-w-md bg-[#11151A] text-brand-subtle cursor-not-allowed"
                />
              </div>
            </div>

            <Button variant="primary" size="md" onClick={handleSave}>
              Save Profile
            </Button>
          </div>
        )}

        {/* TAB 2: ACCOUNT */}
        {activeTab === 'account' && (
          <div className="bg-[#151A21] border border-[#262D36] p-6 rounded-2xl space-y-6">
            <h3 className="text-base font-bold text-white">Account Security</h3>
            <p className="text-xs text-brand-muted">
              Authentication and security settings managed securely via Supabase Auth.
            </p>

            <div className="p-4 rounded-xl bg-[#11151A] border border-[#262D36] flex items-center justify-between max-w-md">
              <div>
                <p className="text-xs font-bold text-white">Password</p>
                <p className="text-[11px] text-brand-subtle">Last changed recently</p>
              </div>
              <Button variant="secondary" size="sm">
                Reset Password
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: APPEARANCE */}
        {activeTab === 'appearance' && (
          <div className="bg-[#151A21] border border-[#262D36] p-6 rounded-2xl space-y-6">
            <h3 className="text-base font-bold text-white">Theme &amp; Appearance</h3>

            <div className="grid grid-cols-2 gap-4 max-w-md">
              <button
                onClick={() => setAppearance('dark')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  appearance === 'dark'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-[#262D36] bg-[#11151A]'
                }`}
              >
                <p className="text-xs font-bold text-white">Dark Mode (Default)</p>
                <p className="text-[10px] text-brand-subtle mt-1">Dark-first creator interface</p>
              </button>

              <button
                disabled
                className="p-4 rounded-xl border border-[#262D36] bg-[#11151A] text-left opacity-50 cursor-not-allowed"
              >
                <p className="text-xs font-bold text-white">Light Mode</p>
                <p className="text-[10px] text-brand-subtle mt-1">Placeholder</p>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: DEFAULT LANGUAGE */}
        {activeTab === 'language' && (
          <div className="bg-[#151A21] border border-[#262D36] p-6 rounded-2xl space-y-6">
            <h3 className="text-base font-bold text-white">Default Video Language</h3>
            <p className="text-xs text-brand-muted">
              Pre-select your primary transcription language when uploading videos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg">
              {[
                { id: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
                { id: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
                { id: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setDefaultLang(lang.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    defaultLang === lang.id
                      ? 'border-primary-500 bg-primary-500/10 text-white font-bold'
                      : 'border-[#262D36] bg-[#11151A] text-brand-muted'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <p className="text-xs font-bold text-white mt-2">{lang.name}</p>
                  <p className="text-[10px] text-brand-subtle">{lang.native}</p>
                </button>
              ))}
            </div>

            <Button variant="primary" size="md" onClick={handleSave}>
              Save Default Language
            </Button>
          </div>
        )}

        {/* TAB 5: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="bg-[#151A21] border border-[#262D36] p-6 rounded-2xl space-y-6 max-w-lg">
            <h3 className="text-base font-bold text-white">Notification Preferences</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#11151A] border border-[#262D36]">
                <span className="text-xs text-white">Export Completion Emails</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary-500" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#11151A] border border-[#262D36]">
                <span className="text-xs text-white">Product Updates &amp; New Features</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary-500" />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
