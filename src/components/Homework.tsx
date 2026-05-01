import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, Clock, Plus, Filter, CheckCircle2, AlertCircle, Send, Users, ChevronRight, FileText, Sparkles, RefreshCw, Lock, Trash2, Download, Search, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, updateDoc, doc, getDocs } from 'firebase/firestore';
import { evaluateHomework, HomeworkEvaluation } from '../services/homeworkAIService';

interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  assignedClasses: string[];
  status?: 'pending' | 'submitted' | 'late';
  authorId?: string;
}

interface Submission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  content: string;
  submissionDate: any;
  status: 'submitted' | 'evaluated' | 'finalized';
  aiEvaluation?: HomeworkEvaluation & { evaluatedAt: string };
  teacherFeedback?: string;
  finalScore?: number;
}

const ALL_CLASSES = ['10-A', '10-B', '11-C', '12-B'];

const SubmissionReview = ({ homework }: { homework: HomeworkItem }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [manualScore, setManualScore] = useState<number>(0);

  useEffect(() => {
    const q = query(collection(db, 'homework', homework.id, 'submissions'), orderBy('submissionDate', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(list);
      setLoading(false);
    });
    return () => unsub();
  }, [homework.id]);

  useEffect(() => {
    if (selectedSubmission) {
      setTeacherFeedback(selectedSubmission.teacherFeedback || '');
      setManualScore(selectedSubmission.finalScore || selectedSubmission.aiEvaluation?.score || 0);
      
      // Auto-trigger evaluation if missing and not currently evaluating
      if (!selectedSubmission.aiEvaluation && !evaluatingId) {
        runAICheck(selectedSubmission);
      }
    }
  }, [selectedSubmission?.id]);

  const runAICheck = async (submission: Submission) => {
    setEvaluatingId(submission.id);
    try {
      const evaluation = await evaluateHomework(homework.title, homework.description, submission.content);
      const updateData = {
        aiEvaluation: {
          ...evaluation,
          evaluatedAt: new Date().toISOString()
        },
        status: 'evaluated'
      };
      await updateDoc(doc(db, 'homework', homework.id, 'submissions', submission.id), updateData);
      
      if (selectedSubmission?.id === submission.id) {
        setSelectedSubmission({ ...selectedSubmission, ...updateData } as Submission);
      }
    } catch (error) {
      console.error('AI Check Failed:', error);
    } finally {
      setEvaluatingId(null);
    }
  };

  const finalizeScore = async () => {
    if (!selectedSubmission) return;
    try {
      await updateDoc(doc(db, 'homework', homework.id, 'submissions', selectedSubmission.id), {
        teacherFeedback,
        finalScore: manualScore,
        status: 'finalized'
      });
      setSelectedSubmission(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `submissions/${selectedSubmission.id}`);
    }
  };

  const exportCSV = () => {
    const headers = ['Student', 'Class', 'Submission Date', 'AI Score', 'Final Score', 'Status'];
    const rows = submissions.map(s => [
      s.studentName,
      'N/A',
      s.submissionDate?.seconds ? new Date(s.submissionDate.seconds * 1000).toLocaleString() : 'N/A',
      s.aiEvaluation?.score || 'N/A',
      s.finalScore || 'N/A',
      s.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${homework.title}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
      {/* List Panel */}
      <div className="lg:col-span-12 flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-slate-800">{homework.title} <span className="text-slate-400 font-medium">/ Submissions</span></h3>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-all">
          <Download size={16} /> Export Results
        </button>
      </div>

      <div className="lg:col-span-5 space-y-4">
        {loading ? (
          <div className="p-10 text-center text-slate-400 animate-pulse">Scanning Submissions...</div>
        ) : submissions.map(s => (
          <div 
            key={s.id}
            onClick={() => setSelectedSubmission(s)}
            className={`p-6 rounded-[28px] border transition-all cursor-pointer flex items-center justify-between gap-4
              ${selectedSubmission?.id === s.id ? 'bg-blue-50 border-blue-200 shadow-lg shadow-blue-100' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}
            `}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-tighter">
                {s.studentName.slice(0, 2)}
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{s.studentName}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {s.aiEvaluation && (
                <div className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-black">
                  AI: {s.aiEvaluation.score}/10
                </div>
              )}
              {s.id === evaluatingId ? (
                <RefreshCw size={18} className="animate-spin text-blue-500" />
              ) : (
                <ChevronRight size={18} className="text-slate-300" />
              )}
            </div>
          </div>
        ))}
        {submissions.length === 0 && (
          <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[28px]">
            <p className="text-slate-400 text-sm font-bold">No submissions yet.</p>
          </div>
        )}
      </div>

      {/* Evaluation Panel */}
      <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          {selectedSubmission ? (
            <motion.div 
              key={selectedSubmission.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden"
            >
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assignment Content</span>
                    <p className="mt-2 text-slate-700 leading-relaxed font-serif text-lg break-words">{selectedSubmission.content}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <button 
                      onClick={() => runAICheck(selectedSubmission)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all
                        ${evaluatingId === selectedSubmission.id ? 'bg-slate-100 text-slate-400' : 'bg-purple-600 text-white shadow-lg shadow-purple-100 hover:bg-purple-700'}
                      `}
                      disabled={evaluatingId === selectedSubmission.id}
                    >
                      <Sparkles size={14} /> {selectedSubmission.aiEvaluation ? 'Manual Re-Check' : 'Run AI Evaluation'}
                    </button>
                  </div>
                </div>

                {selectedSubmission.aiEvaluation && (
                  <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 space-y-8">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                          <Sparkles size={20} />
                        </div>
                        <h4 className="font-bold text-slate-800">AI Teacher Insight</h4>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-2xl font-black text-purple-600">
                          {selectedSubmission.aiEvaluation.score}<span className="text-slate-300 text-sm font-medium">/10</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Suggested Grade</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="relative pl-4 border-l-2 border-purple-200">
                        <p className="text-sm text-slate-600 italic leading-relaxed">"{selectedSubmission.aiEvaluation.feedback}"</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Grammar & Writing</p>
                           <p className="text-xs font-medium text-slate-700 leading-tight">{selectedSubmission.aiEvaluation.grammar}</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Factual Accuracy</p>
                           <p className="text-xs font-medium text-slate-700 leading-tight">{selectedSubmission.aiEvaluation.accuracy}</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Completeness</p>
                           <p className="text-xs font-medium text-slate-700 leading-tight">{selectedSubmission.aiEvaluation.completeness}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teacher Feedback</label>
                    <textarea 
                      value={teacherFeedback}
                      onChange={e => setTeacherFeedback(e.target.value)}
                      rows={3} 
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-3xl text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                      placeholder="Add your personalized comments here..."
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Final Normalized Score (0-10)</label>
                       <input 
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={manualScore}
                        onChange={e => setManualScore(Number(e.target.value))}
                        className="w-full px-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" 
                       />
                    </div>
                    <button 
                      onClick={finalizeScore}
                      className="mt-6 flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-3xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                    >
                      <Lock size={18} /> Finalize Score
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[40px]">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-300 mb-6 font-display text-4xl">?</div>
              <h4 className="text-lg font-bold text-slate-400">Select a student submission to begin the evaluation process.</h4>
              <p className="text-slate-300 text-sm mt-2">AI scores and feedback will appear here once requested.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const TeacherHomework = () => {
  const { user } = useAuth();
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reviewingHomework, setReviewingHomework] = useState<HomeworkItem | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    subject: '',
    title: '',
    description: '',
    dueDate: ''
  });

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'homework'),
      where('authorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HomeworkItem));
      setHomeworks(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'homework');
    });

    return () => unsubscribe();
  }, [user]);

  const toggleClassSelection = (cls: string) => {
    setSelectedClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || selectedClasses.length === 0 || !user) return;

    try {
      await addDoc(collection(db, 'homework'), {
        ...formData,
        assignedClasses: selectedClasses,
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });
      setShowAddModal(false);
      setFormData({ subject: '', title: '', description: '', dueDate: '' });
      setSelectedClasses([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'homework');
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading Assignments...</div>;

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {reviewingHomework ? (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <button 
              onClick={() => setReviewingHomework(null)}
              className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" /> Back to Dashboard
            </button>
            <SubmissionReview homework={reviewingHomework} />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Assigned Homework</h2>
                <p className="text-slate-500 text-sm">Manage tasks for your allocated classes.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
              >
                <Plus size={18} /> New Assignment
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {homeworks.map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4 hover:shadow-xl hover:shadow-slate-100 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {item.subject}
                    </div>
                    <div className="flex -space-x-2">
                      {item.assignedClasses.map((cls, idx) => (
                        <div key={idx} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {cls}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                      <FileText size={18} /> {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-4">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Calendar size={14} /> Due: {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => setReviewingHomework(item)}
                      className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                      Review Work <Users size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
              {homeworks.length === 0 && (
                <div className="col-span-full p-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">No assignments posted yet. Click "New Assignment" to start.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-8 overflow-hidden"
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Assign New Homework</h2>
              <form onSubmit={handleAddHomework} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Subject</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                      placeholder="e.g. History"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Due Date</label>
                    <input 
                      type="date" 
                      required
                      value={formData.dueDate}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Title</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Assignment Title"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Target Classes</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ALL_CLASSES.map(cls => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => toggleClassSelection(cls)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border
                          ${selectedClasses.includes(cls) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Instructions</label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Write homework details here..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    Post Assignment
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

const StudentHomework = () => {
  const { user, userProfile } = useAuth();
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const studentClass = userProfile?.classId || '10-A';

  const extractTextFromPDF = async (file: File) => {
    try {
      const pdfjs = await import('pdfjs-dist');
      // Use a consistent version for the worker
      pdfjs.GlobalWorkerOptions.workerSrc = `/js/pdf.worker.min.js`;
      
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onload = async () => {
          try {
            const loadingTask = pdfjs.getDocument({ data: new Uint8Array(reader.result as ArrayBuffer) });
            const pdf = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
            }
            resolve(fullText);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    } catch (error) {
      console.error('PDF.js import failed:', error);
      throw error;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      setIsExtracting(true);
      try {
        const text = await extractTextFromPDF(file);
        setSubmissionContent(prev => prev ? `${prev}\n\n--- PDF Content ---\n${text}` : text);
      } catch (err) {
        console.error('PDF extraction failed:', err);
      } finally {
        setIsExtracting(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => setSubmissionContent(e.target?.result as string);
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'homework'),
      where('assignedClasses', 'array-contains', studentClass),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HomeworkItem));
      setHomeworks(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'homework');
    });

    return () => unsubscribe();
  }, [user, studentClass]);

  const [submissionStatuses, setSubmissionStatuses] = useState<Record<string, Submission | null>>({});
  useEffect(() => {
    if (!user || homeworks.length === 0) return;
    
    homeworks.forEach(h => {
      const q = query(collection(db, 'homework', h.id, 'submissions'), where('studentId', '==', user.uid));
      onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setSubmissionStatuses(prev => ({ ...prev, [h.id]: { id: snap.docs[0].id, ...snap.docs[0].data() } as Submission }));
        }
      });
    });
  }, [user, homeworks]);

  const handleSubmitHomework = async (homework: HomeworkItem) => {
    if (!user || !submissionContent) return;
    try {
      await addDoc(collection(db, 'homework', homework.id, 'submissions'), {
        homeworkId: homework.id,
        studentId: user.uid,
        studentName: userProfile?.name || user.displayName || 'Student',
        content: submissionContent,
        submissionDate: serverTimestamp(),
        status: 'submitted'
      });
      setSubmittingId(null);
      setSubmissionContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `submissions/${homework.id}`);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading your tasks...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Your Assignments</h2>
          <p className="text-slate-500 text-sm">Tasks for Class {studentClass}</p>
        </div>
      </div>

      <div className="space-y-4">
        {homeworks.map((item, i) => {
          const submission = submissionStatuses[item.id];
          const isSelected = submittingId === item.id;

          return (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`group bg-white p-8 rounded-[38px] border transition-all flex flex-col gap-6
                ${isSelected ? 'border-blue-200 shadow-2xl shadow-blue-50 ring-4 ring-blue-50' : 'border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-50'}
              `}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-colors
                    ${submission ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}
                  `}>
                    {submission ? <CheckCircle2 size={32} /> : <BookOpen size={32} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-bold text-slate-800">{item.title}</h4>
                      {submission && (
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md tracking-widest
                          ${submission.status === 'finalized' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-600'}
                        `}>
                          {submission.status}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> {item.subject}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Clock size={14} /> Due: {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!submission ? (
                    <button 
                      onClick={() => setSubmittingId(isSelected ? null : item.id)}
                      className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-100 hover:shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                    >
                      {isSelected ? 'Cancel' : 'Submit Now'} {isSelected ? <X size={16} /> : <ChevronRight size={16} />}
                    </button>
                  ) : (
                    <div className="flex items-center gap-4">
                       {submission.status === 'finalized' && (
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Grade</span>
                            <span className="text-2xl font-black text-blue-600">{submission.finalScore}<span className="text-sm font-medium text-slate-300">/10</span></span>
                         </div>
                       )}
                       <div className="px-6 py-3 bg-slate-50 text-slate-400 rounded-2xl text-sm font-bold border border-slate-100 italic">
                          "{submission.teacherFeedback || 'Pending review...'}"
                       </div>
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isSelected && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 border-t border-slate-50 space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Your Submission (Text or PDF)</label>
                       <div className="relative group/text">
                         <textarea 
                          value={submissionContent}
                          onChange={e => setSubmissionContent(e.target.value)}
                          placeholder="Type your homework or upload a file..."
                          rows={6}
                          className="w-full px-6 py-5 bg-slate-50 border-none rounded-3xl text-sm focus:ring-4 focus:ring-blue-100 outline-none resize-none font-serif leading-relaxed"
                         />
                         <div className="absolute top-4 right-4 flex gap-2">
                           <label className={`cursor-pointer w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isExtracting ? 'bg-slate-100' : 'bg-white shadow-sm hover:shadow-md text-blue-600'}`}>
                             {isExtracting ? <RefreshCw size={18} className="animate-spin text-slate-400" /> : <Plus size={18} />}
                             <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} disabled={isExtracting} />
                           </label>
                         </div>
                       </div>
                       {isExtracting && <p className="text-[10px] font-bold text-blue-500 animate-pulse px-2">Extracting content from PDF...</p>}
                       <div className="flex justify-between items-center bg-blue-50 p-6 rounded-[28px]">
                          <div className="flex items-center gap-4 text-blue-600">
                             <AlertCircle size={24} />
                             <p className="text-xs font-bold leading-tight">AI Evaluation: Gemini will automatically pre-score your submission once your teacher clicks "Auto-Check".</p>
                          </div>
                          <button 
                            onClick={() => handleSubmitHomework(item)}
                            className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
                          >
                             Finalize & Submit <Send size={18} />
                          </button>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        {homeworks.length === 0 && (
          <div className="p-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">No tasks assigned to your class yet. Enjoy your break!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Container ---
export const Homework = () => {
  const { userProfile } = useAuth();
  const isStaff = userProfile?.role === 'staff';

  return (
    <div className="space-y-8 min-h-screen">
      <header className="px-2">
        <h1 className="text-3xl font-bold font-display text-slate-800">Homework Portal</h1>
        <p className="text-slate-500 mt-1">
          {isStaff ? 'Draft and circulate assignments to your groups.' : 'Manage your upcoming tasks and hand-ins.'}
        </p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {isStaff ? <TeacherHomework /> : <StudentHomework />}
      </motion.div>
    </div>
  );
};
