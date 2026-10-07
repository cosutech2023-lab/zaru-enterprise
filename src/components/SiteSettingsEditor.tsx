import React, { useState, useEffect } from 'react';
import { SiteSettings, Package, getPackageImage } from '../types';
import { getSiteSettings, saveSiteSettings } from '../store';
import { Upload, Save } from 'lucide-react';

export default function SiteSettingsEditor() {
  const [settings, setSettings] = useState<SiteSettings>(getSiteSettings());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setSaveStatus('saving');
    saveSiteSettings(settings);
    // trigger storage event manually for same window
    window.dispatchEvent(new Event('storage'));
    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const updatePackage = (index: number, key: keyof Package, value: string | number) => {
    const newPackages = [...settings.packages];
    newPackages[index] = { ...newPackages[index], [key]: value };
    setSettings({ ...settings, packages: newPackages });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-xl border border-neutral-800 sticky top-20 z-10">
        <h2 className="text-xl font-bold text-white">Site Settings & Content</h2>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="flex items-center gap-2 bg-[#00A86B] hover:bg-green-600 text-white px-6 py-2 rounded font-bold transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'saved' ? 'SAVED!' : 'SAVE CHANGES'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-4">
          <h3 className="text-lg font-bold text-[#00A86B] mb-4 border-b border-neutral-800 pb-2">Hero Section</h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tagline</label>
            <input 
              type="text" 
              value={settings.heroTagline} 
              onChange={e => setSettings({...settings, heroTagline: e.target.value})}
              className="w-full bg-black border border-neutral-700 rounded p-2 text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Main Title (Part 1)</label>
            <textarea 
              value={settings.heroTitle1} 
              onChange={e => setSettings({...settings, heroTitle1: e.target.value})}
              className="w-full bg-black border border-neutral-700 rounded p-2 text-white"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Main Title (Highlighted part)</label>
            <input 
              type="text" 
              value={settings.heroTitleHighlight} 
              onChange={e => setSettings({...settings, heroTitleHighlight: e.target.value})}
              className="w-full bg-black border border-neutral-700 rounded p-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Subtitle</label>
            <textarea 
              value={settings.heroSubtitle} 
              onChange={e => setSettings({...settings, heroSubtitle: e.target.value})}
              className="w-full bg-black border border-neutral-700 rounded p-2 text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Hero Background Image</label>
            <div className="flex gap-4 items-center">
              {settings.heroImage && (
                <img src={settings.heroImage} className="w-16 h-16 object-cover rounded" alt="Hero" />
              )}
              <label className="flex items-center gap-2 bg-neutral-800 px-4 py-2 rounded cursor-pointer hover:bg-neutral-700">
                <Upload size={16} />
                <span>Upload New</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={e => handleImageUpload(e, (base64) => setSettings({...settings, heroImage: base64}))} 
                />
              </label>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-4">
          <h3 className="text-lg font-bold text-[#00A86B] mb-4 border-b border-neutral-800 pb-2">About / Vision Section</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-1">About Text</label>
            <textarea 
              value={settings.aboutText} 
              onChange={e => setSettings({...settings, aboutText: e.target.value})}
              className="w-full bg-black border border-neutral-700 rounded p-2 text-white"
              rows={8}
            />
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-6">
        <h3 className="text-lg font-bold text-[#00A86B] mb-4 border-b border-neutral-800 pb-2">Plan Packages</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {settings.packages.map((pkg, index) => (
            <div key={pkg.id} className="bg-black p-4 rounded-xl border border-neutral-800 space-y-4">
              <div className="font-bold text-white text-lg">{pkg.name}</div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Package Name</label>
                <input 
                  type="text" 
                  value={pkg.name} 
                  onChange={e => updatePackage(index, 'name', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Min. Investment</label>
                  <input 
                    type="number" 
                    value={pkg.minInvestment} 
                    onChange={e => updatePackage(index, 'minInvestment', Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ROI (%)</label>
                  <input 
                    type="number" 
                    value={pkg.roi} 
                    onChange={e => updatePackage(index, 'roi', Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Duration (Days)</label>
                <input 
                  type="number" 
                  value={pkg.durationDays} 
                  onChange={e => updatePackage(index, 'durationDays', Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea 
                  value={pkg.description} 
                  onChange={e => updatePackage(index, 'description', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Package Image</label>
                <div className="flex gap-2 items-center">
                  <img src={getPackageImage(pkg.id, pkg.image)} className="w-12 h-12 object-cover rounded" alt={pkg.name} />
                  <label className="flex-1 flex justify-center items-center gap-2 bg-neutral-800 px-2 py-2 rounded cursor-pointer hover:bg-neutral-700 text-xs">
                    <Upload size={14} />
                    <span>Upload</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => handleImageUpload(e, (base64) => updatePackage(index, 'image', base64))} 
                    />
                  </label>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
