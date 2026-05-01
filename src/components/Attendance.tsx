import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Clock, Calendar as CalendarIcon, Filter, Search, Save, ChevronLeft, ChevronRight, RefreshCw, Download } from 'lucide-react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import Papa from 'papaparse';

// --- Teacher Components ---
const TeacherAttendance = () => {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState('10-A');
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const todaysDate = new Date().toISOString().split('T')[0];

  const handleExport = () => {
    const data = students.map(s => ({
      StudentName: s.name,
      StudentId: s.userId || s.id,
      Class: selectedClass,
      Status: attendance[s.id] || 'Not Marked',
      Date: todaysDate
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_${selectedClass}_${todaysDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setLoading(true);
    // 1. Fetch Students for the selected class
    const fetchStudents = async () => {
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'student'),
        where('classId', '==', selectedClass)
      );
      try {
        const snap = await getDocs(q);
        const studentList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(studentList);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    };

    // 2. Listen for today's attendance for the selected class
    const qAttendance = query(
      collection(db, 'attendance'),
      where('date', '==', todaysDate),
      where('classId', '==', selectedClass)
    );
    
    const unsubscribe = onSnapshot(qAttendance, (snap) => {
      const dailyAttendance: any = {};
      snap.forEach(doc => {
        dailyAttendance[doc.data().studentId] = doc.data().status;
      });
      setAttendance(dailyAttendance);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });

    fetchStudents();
    return () => unsubscribe();
  }, [selectedClass, todaysDate]);

  const handleMark = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSuccess(false);
    try {
      const promises = Object.entries(attendance).map(([studentId, status]) => {
        const recordId = `${studentId}_${todaysDate}`;
        const docRef = doc(db, 'attendance', recordId);
        return setDoc(docRef, {
          studentId,
          classId: selectedClass,
          status,
          date: todaysDate,
          markedBy: user.uid,
          timestamp: serverTimestamp()
        }, { merge: true });
      });

      await Promise.all(promises);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading Attendance Data...</div>;

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h2 className="text-xl font-bold text-slate-800">Attendance Manager</h2>
          <p className="text-sm text-slate-500">Marking record for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
          >
            <Download size={18} /> Export
          </button>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
          >
            {['10-A', '10-B', '11-C', '12-B'].map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Syncing...' : 'Sync Attendance'}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 font-bold text-sm"
          >
            <CheckCircle2 size={20} /> Attendance records have been successfully synchronized.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold" size={20} />
        <input 
          type="text" 
          placeholder="Search students by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-16 pl-14 pr-8 bg-white border border-slate-100 rounded-[28px] shadow-sm text-sm font-medium outline-none focus:ring-4 focus:ring-blue-50 transition-all"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 gap-4"
      >
        {students.filter(s => 
          (s.name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
          (s.userId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.id?.toLowerCase().includes(searchTerm.toLowerCase()))
        ).map((student, i) => (
          <motion.div 
            key={student.id} 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`p-6 bg-white rounded-[32px] border transition-all flex items-center justify-between gap-4 group
              ${attendance[student.id] === 'present' ? 'border-emerald-100 bg-emerald-50/20' : ''}
              ${attendance[student.id] === 'absent' ? 'border-rose-100 bg-rose-50/20' : ''}
              ${attendance[student.id] === 'late' ? 'border-amber-100 bg-amber-50/20' : ''}
              ${!attendance[student.id] ? 'border-slate-100 hover:border-slate-200' : ''}
            `}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-tighter">
                {student.name?.slice(0, 2) || 'ST'}
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{student.name}</h4>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  {(student.userId || student.id).slice(-6).toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: 'present', icon: CheckCircle2, label: 'Present', color: 'emerald' },
                { id: 'absent', icon: XCircle, label: 'Absent', color: 'rose' },
                { id: 'late', icon: Clock, label: 'Late', color: 'amber' }
              ].map((status) => (
                <button 
                  key={status.id}
                  onClick={() => handleMark(student.id, status.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold text-xs ring-offset-2 focus:ring-2
                    ${attendance[student.id] === status.id 
                      ? `bg-${status.color}-600 text-white shadow-lg shadow-${status.color}-100 ring-${status.color}-500/20` 
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  <status.icon size={16} />
                  <span className="hidden sm:inline">{status.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ))}
        {students.length === 0 && !loading && (
          <div className="p-20 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[40px]">
            <p className="text-slate-400 font-bold">No students found for this class.</p>
          </div>
        )}
      </motion.div>

      <div className="flex justify-end gap-3 pt-4">
        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-emerald-600 font-bold text-sm"
            >
              <CheckCircle2 size={16} /> Saved to Database!
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={handleSave}
          disabled={saving || Object.keys(attendance).length === 0}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
        >
          {saving ? 'Saving...' : <><Save size={18} /> Sync Attendance</>}
        </button>
      </div>
    </div>
  );
};

// --- Student/Parent Components ---
const StudentAttendance = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [history, setHistory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'attendance'),
      where('studentId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data: Record<string, any> = {};
      snap.forEach(doc => {
        data[doc.data().date] = doc.data().status;
      });
      setHistory(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });

    return () => unsubscribe();
  }, [user]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days };
  };

  const { firstDay, days } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const prevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));

  const stats = (Object.values(history) as string[]).reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, { present: 0, absent: 0, late: 0 } as Record<string, number>);

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading your history...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Your Attendance</h2>
          <p className="text-slate-500 text-sm">Overview for {monthName} {year}</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
             <p className="text-[10px] font-bold text-emerald-600 uppercase">Present</p>
             <p className="text-xl font-bold text-emerald-700 leading-none">{stats.present}</p>
          </div>
          <div className="text-center px-4 py-2 bg-rose-50 rounded-2xl border border-rose-100">
             <p className="text-[10px] font-bold text-rose-600 uppercase">Absent</p>
             <p className="text-xl font-bold text-rose-700 leading-none">{stats.absent}</p>
          </div>
          <div className="text-center px-4 py-2 bg-amber-50 rounded-2xl border border-amber-100">
             <p className="text-[10px] font-bold text-amber-600 uppercase">Late</p>
             <p className="text-xl font-bold text-amber-700 leading-none">{stats.late}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-bold font-display">{monthName} {year}</h3>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-4">
              {day}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = history[dateStr];
            
            return (
              <div 
                key={day} 
                className={`relative aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all border group
                  ${status === 'present' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : ''}
                  ${status === 'absent' ? 'bg-rose-50 border-rose-100 text-rose-700' : ''}
                  ${status === 'late' ? 'bg-amber-50 border-amber-100 text-amber-700' : ''}
                  ${!status ? 'bg-slate-50 border-slate-100 text-slate-400' : ''}
                `}
              >
                {day}
                {status && (
                  <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full
                    ${status === 'present' ? 'bg-emerald-500' : ''}
                    ${status === 'absent' ? 'bg-rose-500' : ''}
                    ${status === 'late' ? 'bg-amber-500' : ''}
                   `} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Main Container ---
export const Attendance = () => {
  const { userProfile } = useAuth();
  const isStaff = userProfile?.role === 'staff' || userProfile?.role === 'teacher';

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-display text-slate-800">Attendance System</h1>
        <p className="text-slate-500">
          {isStaff ? 'Manage student presence records manually.' : 'Track your monthly attendance status and history.'}
        </p>
      </header>
      
      {isStaff ? <TeacherAttendance /> : <StudentAttendance />}
    </div>
  );
};
