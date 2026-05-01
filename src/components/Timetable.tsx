import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, User, Download, Upload, Plus, ChevronRight, CheckCircle2, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, setDoc, collection, query, getDocs, deleteDoc } from 'firebase/firestore';
import Papa from 'papaparse';

interface TimeSlot {
  subject: string;
  teacher: string;
  time: string;
  room: string;
}

const ALL_CLASSES = ['10-A', '10-B', '11-C', '12-B'];

const AdminTimetableUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedClass, setSelectedClass] = useState('10-A');
  const [error, setError] = useState<string | null>(null);

  const downloadTemplate = () => {
    const csvContent = "Day,Subject,Teacher,Time,Room\nMonday,Advanced Mathematics,Dr. Sarah Wilson,08:00 AM - 09:30 AM,Room 302\nMonday,Computer Science,Prof. James Bond,10:00 AM - 11:30 AM,Lab A\nTuesday,World History,Ms. Elena Gilbert,09:00 AM - 10:30 AM,Room 101";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "timetable_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const schedule: Record<string, TimeSlot[]> = {};
          
          results.data.forEach((row: any) => {
            const day = row.Day;
            if (!day) return;
            if (!schedule[day]) schedule[day] = [];
            schedule[day].push({
              subject: row.Subject,
              teacher: row.Teacher,
              time: row.Time,
              room: row.Room
            });
          });

          await setDoc(doc(db, 'timetables', selectedClass), {
            classId: selectedClass,
            schedule,
            updatedAt: new Date().toISOString()
          });

          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
          setError("Failed to process CSV. Ensure headers match template.");
          console.error(err);
        } finally {
          setIsUploading(false);
        }
      },
      error: (err) => {
        setError("Error reading file.");
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-600 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl shadow-blue-100">
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Bulk Timetable Manager</h2>
            <p className="text-blue-100 max-w-lg">
              Upload a CSV file to update class schedules instantly across the school platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-blue-200 pl-1">Target Class</label>
              <select 
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="block px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-sm font-bold backdrop-blur-md transition-all outline-none"
              >
                {ALL_CLASSES.map(cls => <option key={cls} value={cls} className="text-slate-800">{cls}</option>)}
              </select>
            </div>

            <div className="flex gap-3 mt-auto">
              <button 
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-sm font-bold backdrop-blur-md transition-all"
              >
                <Download size={18} /> Template
              </button>
              
              <label className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-2xl text-sm font-bold shadow-lg transition-all active:scale-95 cursor-pointer hover:bg-blue-50">
                {isUploading ? <><Clock className="animate-spin" size={18} /> Processing...</> : <><Plus size={18} /> Upload CSV</>}
                <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={isUploading} />
              </label>
            </div>
          </div>
        </div>
        <Calendar className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12" />
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 font-bold text-sm"
          >
            <CheckCircle2 size={20} />
            Timetable synced for {selectedClass}. Records updated globally.
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 font-bold text-sm"
          >
            <AlertCircle size={20} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <User size={18} className="text-blue-600" /> Active Schedules
          </h3>
          <div className="space-y-3">
             {ALL_CLASSES.map((cls, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-hover hover:border-blue-200 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{cls}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Active Schedule</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
             <AlertCircle size={18} className="text-amber-500" /> Sync Intelligence
          </h3>
          <div className="space-y-3">
            {[
              "CSV format ensures rapid bulk updates across all classes.",
              "Timestamps are recorded for every schedule modification.",
              "Students receive real-time updates upon file synchronization."
            ].map((info, i) => (
              <div key={i} className="flex gap-3">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{info}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const UserTimetable = () => {
  const { userProfile } = useAuth();
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [timetable, setTimetable] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const userClassId = userProfile?.classId || '10-A';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'timetables', userClassId), (snap) => {
      if (snap.exists()) {
        setTimetable(snap.data().schedule);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `timetables/${userClassId}`);
      setLoading(false);
    });
    return () => unsub();
  }, [userClassId]);

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Hydrating Schedule...</div>;

  const currentDaySlots = timetable[selectedDay] || [];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border
              ${selectedDay === day 
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' 
                : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {currentDaySlots.length > 0 ? (
          currentDaySlots.map((slot: any, i: number) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <Clock size={28} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{slot.subject}</h4>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <User size={14} /> {slot.teacher}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Calendar size={14} /> {slot.room}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-3 rounded-2xl text-sm font-black text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all whitespace-nowrap">
                {slot.time}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
             <div className="w-16 h-16 bg-white rounded-3xl mx-auto flex items-center justify-center text-slate-300">
                <Calendar size={32} />
             </div>
             <p className="text-slate-400 font-bold">No classes scheduled for {selectedDay}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const Timetable = () => {
  const { userProfile } = useAuth();
  const isStaff = userProfile?.role === 'staff';

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-display text-slate-800">Academic Timetable</h1>
        <p className="text-slate-500">
          {isStaff ? 'Manage and sync school-wide schedules.' : 'View your weekly class schedule and teacher details.'}
        </p>
      </header>

      {isStaff ? <AdminTimetableUpload /> : <UserTimetable />}
    </div>
  );
};
