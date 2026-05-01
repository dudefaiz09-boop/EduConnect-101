import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  UserPlus, 
  Filter,
  X,
  Save,
  User as UserIcon,
  Mail,
  BookOpen,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    designation: '',
    assignedClasses: '', // Comma separated for simplicity in this MVP
    subjects: '', // Comma separated
    phone: '',
  });

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'staff'),
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const teacherData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeachers(teacherData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleOpenModal = (teacher: any = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        name: teacher.name || '',
        email: teacher.email || '',
        designation: teacher.designation || '',
        assignedClasses: teacher.assignedClasses || '',
        subjects: teacher.subjects || '',
        phone: teacher.phone || '',
      });
    } else {
      setEditingTeacher(null);
      setFormData({
        name: '',
        email: '',
        designation: '',
        assignedClasses: '',
        subjects: '',
        phone: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.designation || !formData.assignedClasses) {
      alert('Name, Email, Designation, and Assigned Classes are required.');
      return;
    }

    try {
      if (editingTeacher) {
        const teacherRef = doc(db, 'users', editingTeacher.id);
        await updateDoc(teacherRef, {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'users'), {
          ...formData,
          role: 'staff',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      fetchTeachers();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      fetchTeachers();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white font-display">Teacher Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Organize faculty, assignments and class ownership</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
        >
          <UserPlus size={20} />
          Add Teacher
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Faculty</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">{teachers.length}</h3>
          <div className="h-1 w-12 bg-indigo-500 rounded-full mt-3" />
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Departments</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">12</h3>
          <div className="h-1 w-12 bg-emerald-500 rounded-full mt-3" />
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Vacancies</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">3</h3>
          <div className="h-1 w-12 bg-amber-500 rounded-full mt-3" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search teachers by name or department..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Teacher List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 animate-pulse space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-24" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-32" />
                  </div>
                </div>
                <div className="h-20 bg-slate-50 dark:bg-slate-800 rounded-xl" />
              </div>
            ))
          ) : filteredTeachers.map((teacher) => (
            <div key={teacher.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold overflow-hidden border border-indigo-100 dark:border-indigo-800 group-hover:scale-105 transition-transform">
                    {teacher.photoURL ? (
                      <img src={teacher.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">{teacher.name}</h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{teacher.designation || 'Faculty Member'}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(teacher)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(teacher.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-4 space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <BookOpen size={14} className="text-slate-400 dark:text-slate-500" />
                  <span className="font-medium truncate">Subjects: {teacher.subjects || 'General'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <Briefcase size={14} className="text-slate-400 dark:text-slate-500" />
                  <span className="font-medium truncate">Classes: {teacher.assignedClasses || 'All'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Mail size={12} />
                  <span className="truncate max-w-[120px]">{teacher.email}</span>
                </div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Integration */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl relative z-10 border border-slate-100 dark:border-slate-800"
            >
              <div className="bg-indigo-600 px-8 py-10 flex items-center justify-between text-white relative">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold font-display">
                    {editingTeacher ? 'Update Profile' : 'Add to Faculty'}
                  </h3>
                  <p className="text-white/70 text-sm mt-1">Manage personnel profile and assignments</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
                  <X size={20} />
                </button>
                <UserIcon className="absolute right-[-20px] top-[-20px] w-48 h-48 text-white/5 rotate-12" />
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text" required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:text-slate-200"
                      placeholder="Dr. Emily Smith"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email</label>
                    <input 
                      type="email" required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:text-slate-200"
                      placeholder="emily@school.edu"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Designation</label>
                      <input 
                        type="text"
                        value={formData.designation}
                        onChange={(e) => setFormData({...formData, designation: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:text-slate-200"
                        placeholder="Senior Teacher"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Classes</label>
                      <input 
                        type="text"
                        value={formData.assignedClasses}
                        onChange={(e) => setFormData({...formData, assignedClasses: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:text-slate-200"
                        placeholder="10-A, 11-B"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Subjects (Comma separated)</label>
                    <input 
                      type="text"
                      value={formData.subjects}
                      onChange={(e) => setFormData({...formData, subjects: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:text-slate-200"
                      placeholder="Mathematics, Physics"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 font-display"
                  >
                    <Save size={18} />
                    {editingTeacher ? 'Update faculty' : 'Confirm addition'}
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
