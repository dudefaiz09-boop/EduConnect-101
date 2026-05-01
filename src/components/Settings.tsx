import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  User, 
  Bell, 
  Lock, 
  Palette, 
  Globe, 
  Shield, 
  Clock, 
  Mail, 
  Smartphone,
  CheckCircle2,
  ChevronRight,
  Moon,
  Sun,
  Eye,
  DollarSign,
  AlertCircle
} from 'lucide-react';

export const Settings = () => {
  const { user, userProfile } = useAuth();
  const isStaff = userProfile?.role === 'staff';
  const [activeTab, setActiveTab] = useState('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    fees: false,
    messages: true
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    phone: ''
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        email: userProfile.email || '',
        bio: userProfile.bio || '',
        phone: userProfile.phone || ''
      });
      if (userProfile.notifications) {
        setNotifications(userProfile.notifications);
      }
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        notifications,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'preferences', label: 'Preferences', icon: Shield },
  ];

  return (
    <div className="space-y-8 min-h-screen">
      <header className="px-2">
        <h1 className="text-3xl font-bold font-display text-slate-800">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account preferences and application configuration.</p>
      </header>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col lg:flex-row gap-8"
      >
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all
                ${activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-10">
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-slate-100 rounded-[32px] flex items-center justify-center text-slate-400 relative group cursor-pointer overflow-hidden">
                    {userProfile?.photoURL ? <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} />}
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Update</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Public Profile</h3>
                    <p className="text-sm text-slate-400">This information will be visible to {isStaff ? 'students and faculty' : 'classmates and teachers'}.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Your Name" 
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium border-none outline-none focus:ring-2 focus:ring-blue-100" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      disabled
                      placeholder="email@school.edu" 
                      className="w-full px-5 py-3.5 bg-slate-50/50 rounded-2xl text-sm font-medium border-none outline-none cursor-not-allowed opacity-60" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="+1 (555) 000-0000" 
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium border-none outline-none focus:ring-2 focus:ring-blue-100" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Biography / About</label>
                    <textarea 
                      rows={3} 
                      value={formData.bio}
                      onChange={e => setFormData({...formData, bio: e.target.value})}
                      placeholder="Brief description..." 
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium border-none outline-none focus:ring-2 focus:ring-blue-100 resize-none" 
                    />
                  </div>
                </div>

                {isStaff && (
                  <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-3xl space-y-4">
                    <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                       <Clock size={16} /> Technical Info (Staff Only)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white p-4 rounded-xl shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Office Hours</p>
                          <p className="text-sm font-bold text-slate-700 mt-1">2 PM - 4 PM (Mon, Wed)</p>
                       </div>
                       <div className="bg-white p-4 rounded-xl shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Assigned Dept</p>
                          <p className="text-sm font-bold text-slate-700 mt-1">Science & Tech</p>
                       </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Other tabs remain UI-only or placeholders as previously designed */}
            {activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                {[
                  { id: 'email', title: 'Email Notifications', desc: 'Receive daily digests and major updates via email.', icon: Mail, enabled: notifications.email },
                  { id: 'push', title: 'Push Alerts', desc: 'Get real-time mobile push notifications for urgent news.', icon: Smartphone, enabled: notifications.push },
                  { id: 'fees', title: 'Fee Reminders', desc: 'Alerts for upcoming and overdue payment deadlines.', icon: DollarSign, enabled: notifications.fees },
                  { id: 'messages', title: 'New Messages', desc: 'Notify when a student, parent or staff messages you.', icon: Shield, enabled: notifications.messages },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[24px] group hover:bg-slate-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                        <item.icon size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                    <div 
                      onClick={() => toggleNotification(item.id as any)}
                      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${item.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-all ${item.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="p-8 border border-slate-100 rounded-[32px] space-y-6">
                   <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800">Two-Factor Authentication</h4>
                        <p className="text-xs text-slate-400">Add an extra layer of security to your account.</p>
                      </div>
                      <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">Enable 2FA</button>
                   </div>
                   <div className="h-px bg-slate-50" />
                   <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800">Password Reset</h4>
                        <p className="text-xs text-slate-400">Change your login credentials regularly.</p>
                      </div>
                      <button className="px-4 py-2 border border-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50">Reset Password</button>
                   </div>
                </div>

                <div className="p-8 bg-rose-50 border border-rose-100 rounded-[32px] space-y-4">
                   <h4 className="font-bold text-rose-800 flex items-center gap-2">
                     <AlertCircle size={18} /> Danger Zone
                   </h4>
                   <p className="text-xs text-rose-600 leading-relaxed">
                     Deleting your account is permanent and cannot be undone. All your progress, library uploads, and messages will be purged from our servers.
                   </p>
                   <button className="px-6 py-3 bg-rose-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all">Deactivate Account</button>
                </div>
              </motion.div>
            )}
            {activeTab === 'appearance' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 border-2 border-blue-600 bg-white rounded-3xl space-y-4">
                       <Sun size={24} className="text-amber-500" />
                       <div>
                          <h4 className="font-bold text-slate-800">Light Mode</h4>
                          <p className="text-[10px] text-slate-400 uppercase font-black">Current Choice</p>
                       </div>
                    </div>
                    <div className="p-6 border border-slate-100 bg-slate-50 rounded-3xl space-y-4 opacity-70">
                       <Moon size={24} className="text-blue-600" />
                       <h4 className="font-bold text-slate-800">Dark Mode</h4>
                    </div>
                    <div className="p-6 border border-slate-100 bg-slate-50 rounded-3xl space-y-4 opacity-70">
                       <Globe size={24} className="text-slate-400" />
                       <h4 className="font-bold text-slate-800">Auto (System)</h4>
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'preferences' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="p-6 border border-slate-100 rounded-3xl space-y-4">
                   <h4 className="text-sm font-bold text-slate-800">Language Preference</h4>
                   <div className="flex gap-2">
                      {['English', 'Spanish', 'French', 'Hindi'].map(lang => (
                        <button key={lang} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${lang === 'English' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>
                          {lang}
                        </button>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}

            {/* Footer Actions */}
            <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-50">
               <button className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest">Reset to Defaults</button>
               <div className="flex items-center gap-4">
                  {saveSuccess && (
                    <motion.span initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-bold text-emerald-500 flex items-center gap-2">
                      <CheckCircle2 size={14} /> Changes Saved Successfully
                    </motion.span>
                  )}
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
