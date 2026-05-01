import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Library as LibraryIcon, Search, Download, Upload, Plus, Book, FileText, CheckCircle2, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, orderBy } from 'firebase/firestore';
import Papa from 'papaparse';

interface BookItem {
  id: string;
  title: string;
  subject: string;
  author: string;
  type: 'PDF' | 'EPUB' | 'Link';
  addedBy: string;
}

const TeacherLibrary = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [formData, setFormData] = useState({ title: '', subject: '', author: '', type: 'PDF' as 'PDF' | 'EPUB' | 'Link', fileUrl: '' });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'library'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BookItem));
      setBooks(list);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'library');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'library'), {
        ...formData,
        addedBy: user.displayName || 'Staff',
        createdAt: serverTimestamp()
      });
      setShowUpload(false);
      setFormData({ title: '', subject: '', author: '', type: 'PDF', fileUrl: '' });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'library');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'library', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `library/${id}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const promises = results.data.map((row: any) => {
            return addDoc(collection(db, 'library'), {
              title: row.Title,
              subject: row.Subject,
              author: row.Author,
              type: row.Type as any,
              fileUrl: row.FileUrl,
              addedBy: user?.displayName || 'Staff',
              createdAt: serverTimestamp()
            });
          });

          await Promise.all(promises);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
          console.error('Library sync failed:', err);
        }
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "Title,Subject,Author,Type,FileUrl\nPhysics Concepts,Science,H.C. Verma,PDF,https://example.com/physics.pdf\nHistory of Nations,History,Will Durant,EPUB,https://example.com/history.epub";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "library_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold">Refreshing Repository...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden gap-6">
        <div className="z-10">
          <h2 className="text-2xl font-bold text-slate-800">E-Library Manager</h2>
          <p className="text-slate-500 mt-1">Upload digital resources and textbooks for students.</p>
        </div>
        <div className="z-10 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold cursor-pointer hover:bg-slate-200 transition-all">
            <Upload size={20} />
            CSV Upload
            <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-400 rounded-2xl font-bold hover:bg-slate-100 transition-all"
          >
            <Download size={20} />
            Template
          </button>
          <button 
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={20} /> Add Resource
          </button>
        </div>
        <LibraryIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-50 opacity-[0.03]" />
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 font-bold text-sm"
          >
            <CheckCircle2 size={20} /> Resource successfully added to the digital repository.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => (
          <div key={book.id} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Book size={24} />
            </div>
            <h3 className="font-bold text-slate-800 leading-tight">{book.title}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{book.subject}</p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
              <span className="text-[10px] font-black bg-slate-50 text-slate-400 px-2.5 py-1 rounded-md uppercase tracking-widest">
                {book.type}
              </span>
              <button 
                onClick={() => handleDelete(book.id)}
                className="text-xs font-bold text-rose-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowUpload(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-lg bg-white rounded-[40px] shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">New Library Resource</h2>
                <button onClick={() => setShowUpload(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpload} className="space-y-5">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resource Title</label>
                   <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" placeholder="e.g. Physics Vol 1" className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium border-none outline-none focus:ring-2 focus:ring-blue-100" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Subject</label>
                     <input required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} type="text" placeholder="e.g. Science" className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium border-none outline-none focus:ring-2 focus:ring-blue-100" />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Format</label>
                     <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium border-none outline-none focus:ring-2 focus:ring-blue-100 appearance-none">
                       <option value="PDF">E-Book (PDF)</option>
                       <option value="EPUB">E-Book (EPUB)</option>
                       <option value="Link">Article Link</option>
                     </select>
                   </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Author / Source</label>
                    <input required value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} type="text" placeholder="e.g. Stephen Hawking" className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium border-none outline-none focus:ring-2 focus:ring-blue-100" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resource URL / Link</label>
                    <input required value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} type="url" placeholder="https://resource-link.com/book.pdf" className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium border-none outline-none focus:ring-2 focus:ring-blue-100" />
                 </div>
                 <div className="flex gap-3 pt-4">
                   <button type="button" onClick={() => setShowUpload(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[24px] font-black hover:bg-slate-200 transition-all">Cancel</button>
                   <button type="submit" className="flex-2 py-4 bg-blue-600 text-white rounded-[24px] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Publish Resource</button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StudentLibrary = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'library'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BookItem));
      setBooks(list);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'library');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredBooks = books.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()) || b.subject.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Scanning Catalog...</div>;

  return (
    <div className="space-y-8">
      <div className="relative group">
        <Search size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Search for textbooks, articles, or resources..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-20 pl-16 pr-8 bg-white border border-slate-100 rounded-[32px] shadow-sm text-lg font-medium outline-none focus:ring-4 focus:ring-blue-50 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map((book) => (
          <motion.div 
            key={book.id} 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-2xl hover:shadow-slate-100 transition-all cursor-pointer group"
          >
            <div>
               <div className="flex justify-between items-start mb-6">
                 <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                   <FileText size={28} />
                 </div>
                 <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest">
                   {book.type}
                 </span>
               </div>
               <h3 className="text-xl font-bold text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                 {book.title}
               </h3>
               <p className="text-sm font-medium text-slate-500">{book.author}</p>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[2px]">
                {book.subject}
              </span>
              <button className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                <Download size={18} />
              </button>
            </div>
          </motion.div>
        ))}
        {filteredBooks.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold">No matching resources found.</div>
        )}
      </div>
    </div>
  );
};

export const Library = () => {
  const { userProfile } = useAuth();
  const isStaff = userProfile?.role === 'staff';

  return (
    <div className="space-y-8 min-h-screen">
      <header className="px-2">
        <h1 className="text-3xl font-bold font-display text-slate-800">Digital Library</h1>
        <p className="text-slate-500 mt-1">
          {isStaff ? 'Manage and curate educational materials for students.' : 'Access your course materials and digital resources.'}
        </p>
      </header>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {isStaff ? <TeacherLibrary /> : <StudentLibrary />}
      </motion.div>
    </div>
  );
};
