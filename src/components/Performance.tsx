import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Brain, TrendingUp, Sparkles, AlertCircle, CheckCircle, Upload, Download, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import Papa from 'papaparse';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { getLearningInsights } from '../services/aiService';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export const Performance = () => {
  const { user, userProfile } = useAuth();
  const isStaff = userProfile?.role === 'staff';
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [performance, setPerformance] = useState<any>(null);
  const [insights, setInsights] = useState<{ recommendations: string[], analysis: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai'>('overview');

  useEffect(() => {
    if (!user) return;

    let q;
    if (isStaff) {
      q = query(collection(db, 'performance'), where('term', '==', '2024-Spring'));
    } else {
      q = query(collection(db, 'performance'), where('studentId', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPerformance(snap.docs[0].data());
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'performance');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isStaff]);

  const fetchInsights = async () => {
    if (!performance) return;
    setAnalyzing(true);
    try {
      const data = await getLearningInsights(performance.subjectGrades);
      setInsights(data);
      setActiveTab('ai');
    } catch (error) {
      console.error('AI Insight Error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const promises = results.data.map((row: any) => {
            return addDoc(collection(db, 'performance'), {
              studentId: row.StudentId,
              studentName: row.StudentName,
              term: row.Term || '2024-Spring',
              subjectGrades: {
                mathematics: Number(row.Mathematics || 0),
                science: Number(row.Science || 0),
                english: Number(row.English || 0),
                history: Number(row.History || 0)
              },
              updatedAt: serverTimestamp()
            });
          });

          await Promise.all(promises);
          setUploading(false);
        } catch (err) {
          console.error('Performance sync failed:', err);
          setUploading(false);
        }
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "StudentId,StudentName,Term,Mathematics,Science,English,History\nSTU123,John Doe,2024-Spring,85,90,78,92\nSTU456,Jane Smith,2024-Spring,92,88,95,89";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "marksheet_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading Academic Records...</div>;

  const gradesMap = performance?.subjectGrades || {
    mathematics: 0,
    science: 0,
    english: 0,
    history: 0
  };

  const chartData = Object.entries(gradesMap).map(([subject, score]) => ({
    subject: subject.charAt(0).toUpperCase() + subject.slice(1),
    score: score,
    fullMark: 100
  }));

  const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 bg-blue-50 px-3 py-1 rounded-full w-fit">
            Academic Intelligence Hub
          </div>
          <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            {isStaff ? 'Class Performance Audits' : 'My Learning Analytics'}
          </h1>
          <p className="text-slate-500 font-medium max-w-xl">
            {isStaff 
              ? 'Real-time synchronization of class-wide performance metrics and AI-driven pedagogical auditing.' 
              : 'Detailed breakdown of your academic strengths and AI-curated learning paths.'}
          </p>
        </div>
        {isStaff && (
          <div className="flex gap-3">
            <label className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-3xl font-bold cursor-pointer hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 group active:scale-95">
              <Upload size={20} className={uploading ? 'animate-spin' : 'group-hover:-translate-y-1 transition-transform'} />
              <span>{uploading ? 'Syncing...' : 'Bulk Sync CSV'}</span>
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={uploading} />
            </label>
            <button 
              onClick={downloadTemplate}
              className="p-4 bg-white border border-slate-100 text-slate-400 rounded-3xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              title="Download CSV Template"
            >
              <Download size={22} />
            </button>
          </div>
        )}
      </header>

      {/* Analytics Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <BarChart2 size={18} /> Performance Overview
        </button>
        <button 
          onClick={() => {
            if (!performance) return;
            if (!insights) fetchInsights();
            else setActiveTab('ai');
          }}
          disabled={!performance}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50 ${activeTab === 'ai' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Brain size={18} /> AI Insight Engine
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="xl:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">Proficiency Spectrum</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Term: 2024-Spring Update</p>
              </div>
              <div className="flex gap-2">
                 <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target 100%</span>
                 </div>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {/* We use specific charts based on data */}
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                  <Radar
                    name="Performance"
                    dataKey="score"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.15}
                    strokeWidth={3}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
              {chartData.map((item, i) => (
                <div key={item.subject} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] text-center border border-slate-100/50 dark:border-slate-700/50 transition-transform hover:scale-105">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-2">{item.subject}</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{item.score}%</p>
                  <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden w-12 mx-auto">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${item.score}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-8">
           <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-10 rounded-[48px] h-fit min-h-[500px] flex flex-col transition-all duration-700 relative overflow-hidden ${
              insights 
                ? 'bg-slate-900 text-white shadow-2xl' 
                : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm'
            }`}
          >
            <div className="relative z-10 space-y-8 flex-1">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${insights ? 'bg-white/10 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                  <Brain size={32} />
                </div>
                <div>
                  <h3 className={`text-xl font-black tracking-tight ${insights ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Academic Guru</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${insights ? 'text-white/40' : 'text-slate-400'}`}>AI Strategy Center</p>
                </div>
              </div>

              {analyzing ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20">
                  <div className="relative">
                    <div className="w-20 h-20 border-8 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 animate-pulse" size={24} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">Synthesizing Data...</p>
                    <p className="text-slate-400 text-xs font-medium mt-1">Consulting Gemini Neural Network</p>
                  </div>
                </div>
              ) : insights ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <p className="text-white/70 italic leading-relaxed font-medium">
                      "{insights.analysis}"
                    </p>
                    <div className="h-0.5 bg-white/10 w-12" />
                  </div>
                  
                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black uppercase tracking-[3px] text-indigo-400">Tactical Roadmap</h4>
                    <div className="space-y-4">
                      {insights.recommendations.map((rec, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex gap-4 group p-4 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-black text-[10px]">
                            0{i + 1}
                          </div>
                          <span className="text-sm font-semibold leading-snug">{rec}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setInsights(null)}
                    className="w-full py-4 text-xs font-black uppercase tracking-[2px] text-white/40 hover:text-white transition-colors"
                  >
                    Recalibrate Analysis
                  </button>
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-10">
                  <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center gap-4">
                    <AlertCircle className="text-slate-300" size={48} />
                    <p className="text-slate-400 text-center font-bold text-sm max-w-[200px]">
                      {performance 
                        ? 'Data ready for neural auditing. Unlock your personalized learning roadmap.' 
                        : 'Please sync academic records to enable AI insights.'}
                    </p>
                  </div>
                  <button 
                    onClick={fetchInsights}
                    disabled={!performance}
                    className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 dark:shadow-none disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isStaff ? 'Initialize Pedagogy Audit' : 'Generate Academic Path'}
                    <TrendingUp size={20} />
                  </button>
                </div>
              )}
            </div>
            <div className="absolute right-[-20%] bottom-[-10%] w-[80%] h-[80%] bg-indigo-500/5 blur-[100px] rounded-full" />
          </motion.div>

          {/* Tips Card */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-[40px] border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex gap-4 mb-4">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0">
                <PieChartIcon size={20} />
              </div>
              <h4 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">Study Strategy</h4>
            </div>
            <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium leading-relaxed">
              Based on historical data, students with similar profiles saw a <span className="font-black">15% improvement</span> in English by increasing their digital library session duration by 20 minutes daily.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

