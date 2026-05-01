import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Plus, Users, School, Trash2, Calendar, Clock, ChevronRight, Edit2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, where, updateDoc } from 'firebase/firestore';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target: 'all' | 'class';
  targetClass?: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

const ALL_CLASSES = ['10-A', '10-B', '11-C', '12-B'];

export const Announcements = () => {
  const { user, userProfile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const isStaff = userProfile?.role === 'staff' || userProfile?.role === 'teacher';

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target: 'all' as 'all' | 'class',
    targetClass: ''
  });

  const handleOpenEdit = (a: Announcement) => {
    setEditingAnnouncement(a);
    setFormData({
      title: a.title,
      content: a.content,
      target: a.target,
      targetClass: a.targetClass || ''
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingAnnouncement(null);
    setFormData({ title: '', content: '', target: 'all', targetClass: '' });
  };

  useEffect(() => {
    if (!user) return;

    let q;
    if (isStaff) {
      q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'announcements'),
        where('target', 'in', ['all', 'class']),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      let list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      
      if (!isStaff) {
        list = list.filter(a => a.target === 'all' || a.targetClass === userProfile?.classId);
      }
      
      setAnnouncements(list);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'announcements');
    });

    return () => unsub();
  }, [user, userProfile?.classId, isStaff]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    try {
      if (editingAnnouncement) {
        await updateDoc(doc(db, 'announcements', editingAnnouncement.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...formData,
          authorId: user.uid,
          authorName: userProfile.name,
          createdAt: serverTimestamp()
        });
      }
      handleCloseModal();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'announcements');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">School Notices</h2>
          <p className="text-slate-500 text-sm">Official announcements and updates.</p>
        </div>
        {isStaff && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={18} /> New Notice
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-20 text-center animate-pulse text-slate-400">Broadcasting updates...</div>
        ) : announcements.length > 0 ? (
          announcements.map((a, i) => (
            <motion.div 
              key={a.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-50 transition-all flex flex-col md:flex-row gap-6 relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <span className={`px-3 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${a.target === 'all' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                  {a.target === 'all' ? 'School-Wide' : `Class ${a.targetClass}`}
                </span>
              </div>

              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                <Megaphone size={32} />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">{a.title}</h3>
                  {isStaff && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleOpenEdit(a)}
                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      {(a.authorId === user?.uid || userProfile?.role === 'staff') && (
                        <button 
                          onClick={() => handleDelete(a.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-slate-600 leading-relaxed">{a.content}</p>
                <div className="flex items-center gap-6 pt-4 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5"><Users size={14} /> Posted by {a.authorName}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} /> {a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="p-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-bold">No active announcements at the moment.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-10"
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-8">{editingAnnouncement ? 'Edit Announcement' : 'Post New Announcement'}</h2>
              <form onSubmit={handleAdd} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target Audience</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target: 'all' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-3xl border-2 transition-all font-bold ${formData.target === 'all' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-100'}`}
                    >
                      <School size={18} /> Whole School
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target: 'class' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-3xl border-2 transition-all font-bold ${formData.target === 'class' ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-100'}`}
                    >
                      <Users size={18} /> Specific Class
                    </button>
                  </div>
                </div>

                {formData.target === 'class' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Class</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_CLASSES.map(cls => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setFormData({ ...formData, targetClass: cls })}
                          className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${formData.targetClass === cls ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Title</label>
                  <input 
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Sports Day Update"
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-3xl text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Message</label>
                  <textarea 
                    rows={4}
                    required
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write details of the notice here..."
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-[32px] text-sm focus:ring-4 focus:ring-blue-100 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[32px] font-black hover:bg-slate-200 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 py-5 bg-blue-600 text-white rounded-[32px] font-black shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {editingAnnouncement ? 'Update Notice' : 'Post Notice'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
