
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { SettingsService } from '../services/settingsService';
import { 
  User, BookOpen, MessageCircle, Clock, Bell, Eye, Lock, HelpCircle, 
  Save, RotateCcw, Check, Monitor, Moon, Sun, Volume2, Shield
} from 'lucide-react';

const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(SettingsService.getSettings());
  const [activeTab, setActiveTab] = useState('learning');
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const handleSave = () => {
    SettingsService.saveSettings(settings);
    setShowSavedMessage(true);
    setTimeout(() => setShowSavedMessage(false), 2000);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      const defaults = SettingsService.resetSettings();
      setSettings(defaults);
    }
  };

  const updateSetting = (category: keyof AppSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const tabs = [
    { id: 'learning', label: 'Learning Preferences', icon: BookOpen },
    { id: 'aiTutor', label: 'Tutor Interaction', icon: MessageCircle },
    { id: 'study', label: 'Timer & Subjects', icon: Clock },
    { id: 'appearance', label: 'Appearance', icon: Eye },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Data', icon: Lock },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-slate-500" />
              Settings
            </h2>
          </div>
          <div className="p-2 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary-50 text-primary-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary-500' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100 mt-2">
            <button 
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-red-500 hover:text-red-600 py-2 hover:bg-red-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Settings
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 relative">
          
          {/* Success Message Toast */}
          {showSavedMessage && (
            <div className="absolute top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-2 z-10">
              <Check className="w-4 h-4" />
              Settings Saved!
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>

          <div className="space-y-8">
            
            {/* --- Learning Preferences --- */}
            {activeTab === 'learning' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Default Grade / Class</label>
                    <input 
                      type="text" 
                      value={settings.learning.grade}
                      onChange={(e) => updateSetting('learning', 'grade', e.target.value)}
                      placeholder="e.g. 10th Grade"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Education Board</label>
                    <select 
                      value={settings.learning.board}
                      onChange={(e) => updateSetting('learning', 'board', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">Select Board</option>
                      <option value="CBSE">CBSE</option>
                      <option value="ICSE">ICSE</option>
                      <option value="State Board">State Board</option>
                      <option value="IB">IB</option>
                      <option value="IGCSE">IGCSE</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Difficulty Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Easy', 'Medium', 'Hard'].map((level) => (
                      <button
                        key={level}
                        onClick={() => updateSetting('learning', 'difficulty', level)}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          settings.learning.difficulty === level 
                            ? 'bg-primary-50 border-primary-500 text-primary-700' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700">Learning Style</label>
                   <select 
                      value={settings.learning.style}
                      onChange={(e) => updateSetting('learning', 'style', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="Standard">Standard (Balanced)</option>
                      <option value="Socratic">Socratic (Ask questions to teach)</option>
                      <option value="Analogy-based">Analogy-based (Use real-world examples)</option>
                      <option value="Bullet Points">Bullet Points (Concise & structured)</option>
                    </select>
                    <p className="text-xs text-slate-500">This controls how the AI formats and presents information to you.</p>
                </div>
              </div>
            )}

            {/* --- Tutor Interaction --- */}
            {activeTab === 'aiTutor' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700 block">Tutor Personality</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {['Friendly', 'Strict', 'Academic', 'Humorous'].map((p) => (
                        <div 
                          key={p}
                          onClick={() => updateSetting('aiTutor', 'personality', p)}
                          className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${
                            settings.aiTutor.personality === p 
                            ? 'border-primary-500 bg-primary-50' 
                            : 'border-slate-100 hover:border-slate-200'
                          }`}
                        >
                           <div className="font-bold text-slate-800 text-sm">{p}</div>
                        </div>
                     ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700">Response Length</label>
                   <input 
                      type="range" 
                      min="0" max="2" 
                      value={settings.aiTutor.responseLength === 'Short' ? 0 : settings.aiTutor.responseLength === 'Medium' ? 1 : 2}
                      onChange={(e) => {
                         const val = parseInt(e.target.value);
                         updateSetting('aiTutor', 'responseLength', val === 0 ? 'Short' : val === 1 ? 'Medium' : 'Long');
                      }}
                      className="w-full accent-primary-600"
                   />
                   <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Short & Concise</span>
                      <span>Balanced</span>
                      <span>Detailed & Long</span>
                   </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block text-sm">Ask Before Answering (Hints)</span>
                      <span className="text-xs text-slate-500">The tutor will give hints instead of direct answers.</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.aiTutor.giveHints} 
                          onChange={(e) => updateSetting('aiTutor', 'giveHints', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </div>
                </div>
              </div>
            )}

            {/* --- Timer & Subjects --- */}
            {activeTab === 'study' && (
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Default Timer Duration (minutes)</label>
                    <input 
                      type="number" 
                      value={settings.study.timerDuration}
                      onChange={(e) => updateSetting('study', 'timerDuration', parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                 </div>

                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block text-sm">Auto-Pause Timer</span>
                      <span className="text-xs text-slate-500">Pause timer when tab is inactive.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.study.autoPause} 
                          onChange={(e) => updateSetting('study', 'autoPause', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                </div>
              </div>
            )}

            {/* --- Appearance --- */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700">Theme Preference</label>
                    <div className="grid grid-cols-2 gap-4">
                       <button 
                          onClick={() => updateSetting('appearance', 'theme', 'Light')}
                          className={`p-4 rounded-xl border-2 flex items-center justify-center gap-3 ${settings.appearance.theme === 'Light' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-100 text-slate-600'}`}
                       >
                          <Sun className="w-5 h-5" />
                          Light Mode
                       </button>
                       <button 
                          onClick={() => updateSetting('appearance', 'theme', 'Dark')}
                          className={`p-4 rounded-xl border-2 flex items-center justify-center gap-3 ${settings.appearance.theme === 'Dark' ? 'border-primary-500 bg-slate-800 text-white' : 'border-slate-100 text-slate-600'}`}
                       >
                          <Moon className="w-5 h-5" />
                          Dark Mode
                       </button>
                    </div>
                    <p className="text-xs text-slate-400">Note: Dark mode is coming soon to all sections.</p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Font Size</label>
                    <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                       {['Small', 'Medium', 'Large'].map((size) => (
                          <button
                             key={size}
                             onClick={() => updateSetting('appearance', 'fontSize', size)}
                             className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                                settings.appearance.fontSize === size 
                                ? 'bg-white shadow-sm text-slate-800' 
                                : 'text-slate-500 hover:text-slate-700'
                             }`}
                          >
                             {size}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
            )}

            {/* --- Notifications --- */}
            {activeTab === 'notifications' && (
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Clock className="w-5 h-5" />
                         </div>
                         <div>
                            <span className="font-bold text-slate-800 block text-sm">Study Reminders</span>
                            <span className="text-xs text-slate-500">Get alerted for your scheduled study slots.</span>
                         </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.notifications.studyReminders} 
                          onChange={(e) => updateSetting('notifications', 'studyReminders', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                   <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Volume2 className="w-5 h-5" />
                         </div>
                         <div>
                            <span className="font-bold text-slate-800 block text-sm">Break Alerts</span>
                            <span className="text-xs text-slate-500">Reminders to take a break during long sessions.</span>
                         </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.notifications.breakReminders} 
                          onChange={(e) => updateSetting('notifications', 'breakReminders', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
               </div>
            )}

            {/* --- Privacy --- */}
            {activeTab === 'privacy' && (
               <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                     <div className="flex items-start gap-3">
                        <Shield className="w-6 h-6 text-slate-400 mt-1" />
                        <div>
                           <h4 className="font-bold text-slate-800 text-sm">Data Privacy</h4>
                           <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              SJ Tutor AI stores your generated summaries, quizzes, and history locally on your device for fast access. We do not sell your personal data.
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">Save Chat History</span>
                        <span className="text-xs text-slate-500">Keep a record of your conversations with the AI Tutor.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.privacy.saveHistory} 
                          onChange={(e) => updateSetting('privacy', 'saveHistory', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                     <button className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        Help & Support
                     </button>
                  </div>
               </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
