import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Download, Upload, CheckCircle2, AlertCircle, History, DollarSign, ArrowRight, Wallet, PieChart, Clock } from 'lucide-react';
import Papa from 'papaparse';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// --- Admin/Teacher Components ---
const AdminFees = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'fees'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFees(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fees');
    });

    return () => unsubscribe();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const promises = results.data.map((row: any) => {
            const feeId = row.StudentId + '_' + row.FeeType.replace(/\s+/g, '_');
            return setDoc(doc(db, 'fees', feeId), {
              studentId: row.StudentId,
              feeType: row.FeeType,
              amount: parseFloat(row.Amount),
              status: row.Status,
              dueDate: row.DueDate,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          });

          await Promise.all(promises);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
          console.error('Fee sync failed:', err);
        } finally {
          setIsUploading(false);
        }
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "StudentId,FeeType,Amount,Status,DueDate\nSTUDENT_UID_HERE,Tuition Fee,1500,Pending,2024-06-01\nSTUDENT_UID_HERE,Laboratory Fee,200,Paid,2024-05-15";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "fees_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCollected = fees.filter(f => f.status === 'Paid').reduce((acc, f) => acc + f.amount, 0);
  const totalPending = fees.filter(f => f.status !== 'Paid').reduce((acc, f) => acc + f.amount, 0);
  const collectionRate = fees.length ? Math.round((totalCollected / (totalCollected + totalPending)) * 100) : 0;

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading Financial Data...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 welcome-gradient p-10 rounded-[32px] text-white shadow-xl shadow-blue-100 flex flex-col justify-between min-h-[240px]">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <DollarSign size={28} /> Financial Dashboard
            </h2>
            <p className="text-white/80 mt-2 font-medium">Global fee collection status for current academic term.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8">
             <div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Total Collected</p>
                <p className="text-3xl font-black mt-1">${totalCollected.toLocaleString()}</p>
             </div>
             <div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Total Pending</p>
                <p className="text-3xl font-black mt-1 text-rose-200">${totalPending.toLocaleString()}</p>
             </div>
             <div className="hidden md:block">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Collection Rate</p>
                <p className="text-3xl font-black mt-1">{collectionRate}%</p>
             </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center gap-6">
          <div className="space-y-4">
             <h3 className="font-bold text-slate-800 text-center">Batch Update Fees</h3>
             <p className="text-center text-xs text-slate-500 leading-relaxed px-4">
               Upload student payment logs to sync invoice statuses school-wide.
             </p>
          </div>
          <div className="flex flex-col gap-3">
            <label className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all cursor-pointer active:scale-95">
              {isUploading ? <><Clock className="animate-spin" size={16} /> Syncing...</> : <><Upload size={16} /> Upload Fee CSV</>}
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={isUploading} />
            </label>
            <button 
              onClick={downloadTemplate}
              className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              <Download size={14} className="inline mr-1" /> Template
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 font-bold text-sm shadow-sm"
          >
            <CheckCircle2 size={18} /> Financial records synced. School database updated.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 italic">
            <AlertCircle size={18} className="text-rose-500" /> Pending Collection List
          </h3>
        </div>
        <div className="divide-y divide-slate-50">
          {fees.filter(f => f.status !== 'Paid').map((item, i) => (
            <div key={item.id} className="px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                   {item.studentId.slice(-2)}
                 </div>
                 <div>
                   <p className="font-bold text-slate-800 text-sm">{item.feeType}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Student ID: {item.studentId.slice(-6).toUpperCase()}</p>
                 </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-800">${item.amount}</p>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${item.status === 'Overdue' ? 'text-rose-500' : 'text-amber-500'}`}>{item.status}</p>
              </div>
            </div>
          ))}
          {fees.filter(f => f.status !== 'Paid').length === 0 && (
            <div className="p-10 text-center text-slate-300 text-sm italic">All fees collected for this term!</div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Student Components ---
const StudentFees = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'fees'), where('studentId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFees(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fees');
    });

    return () => unsubscribe();
  }, [user]);

  const outstanding = fees.filter(f => f.status !== 'Paid').reduce((acc, f) => acc + f.amount, 0);
  const paidCount = fees.filter(f => f.status === 'Paid').length;
  const progressPercent = fees.length ? Math.round((paidCount / fees.length) * 100) : 0;

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading your balance...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="space-y-1">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Current Balance</p>
             <h2 className="text-5xl font-black text-slate-900">${outstanding.toLocaleString()}</h2>
             {outstanding > 0 && (
               <p className="text-xs font-bold text-rose-500 mt-2 flex items-center gap-1">
                  <AlertCircle size={14} /> Settlement Required
               </p>
             )}
          </div>
          <div className="mt-8">
            <button className="w-full h-14 bg-blue-600 text-white rounded-[20px] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50" disabled={outstanding === 0}>
              <Wallet size={20} /> Pay Outstanding Fees
            </button>
          </div>
          <PieChart className="absolute -right-10 -bottom-10 w-48 h-48 opacity-[0.03] text-blue-600" />
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl shadow-slate-200">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-[2px]">Academic Progress</p>
              <div className="flex justify-between items-end mt-2">
                <h3 className="text-3xl font-black">{progressPercent}%</h3>
                <p className="text-emerald-400 text-xs font-bold">Fees Cleared</p>
              </div>
              <div className="h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-[10px] text-white/60 mt-3 font-medium italic">You've cleared {paidCount} out of {fees.length} invoices.</p>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center">
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Total Invoices</p>
                 <p className="text-xl font-black text-blue-600 mt-1">{fees.length}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center">
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Paid Items</p>
                 <p className="text-xl font-black text-emerald-600 mt-1">{paidCount}</p>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
          <History size={20} className="text-slate-400" />
          <h3 className="font-bold text-slate-800">Fee Records</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {fees.map((item, i) => (
            <div key={item.id} className="px-8 py-4 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 transition-all">
              <div className="flex items-center gap-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <CheckCircle2 size={20} />
                 </div>
                 <div>
                   <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors uppercase">{item.feeType}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.dueDate} • INV-{item.id.slice(0,4).toUpperCase()}</p>
                 </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-800">${item.amount}</p>
                <div className="flex items-center gap-1 justify-end">
                   <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Paid' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                   <p className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'Paid' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.status}</p>
                </div>
              </div>
            </div>
          ))}
          {fees.length === 0 && (
            <div className="p-10 text-center text-slate-300 text-sm italic">No fee records found in your account.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Container ---
export const FeeManagement = () => {
  const { userProfile } = useAuth();
  const isStaff = userProfile?.role === 'staff';

  return (
    <div className="space-y-8 min-h-screen">
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-2"
      >
        <h1 className="text-3xl font-bold font-display text-slate-800">Fee Management</h1>
        <p className="text-slate-500 mt-1">
          {isStaff ? 'Track and sync student financial records school-wide.' : 'Overview of your tuition status and payment history.'}
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {isStaff ? <AdminFees /> : <StudentFees />}
      </motion.div>
    </div>
  );
};
