import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Search, ChevronLeft, MoreVertical, Phone, Video, Smile, Paperclip } from 'lucide-react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  online?: boolean;
}

export const Messages = () => {
  const { user, userProfile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeChat, setActiveChat] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Contacts based on role
  useEffect(() => {
    if (!userProfile) return;

    const isStaff = userProfile.role === 'staff' || userProfile.role === 'teacher';
    
    // Fetch both students and staff for staff members, or just staff for students
    const targetRoles = isStaff ? ['student', 'staff', 'teacher'] : ['staff', 'teacher'];
    const q = query(collection(db, 'users'), where('role', 'in', targetRoles));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      let list = snap.docs
        .filter(d => d.id !== user?.uid)
        .map(d => ({ 
          id: d.id, 
          name: d.data().name, 
          role: d.data().role === 'staff' || d.data().role === 'teacher' ? 'Faculty' : 'Student',
          avatar: d.data().photoURL,
          assignedClasses: d.data().assignedClasses // for filtering
        }));
      
      if (!isStaff && userProfile.classId) {
        // Students: only see teachers assigned to their class (simple substring check)
        list = list.filter(contact => 
          contact.role === 'Faculty' && 
          (!contact.assignedClasses || contact.assignedClasses.includes(userProfile.classId))
        );
      }

      setContacts(list);
      setLoadingContacts(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [userProfile]);

  // 2. Listen for messages in active chat
  useEffect(() => {
    if (!user || !activeChat) {
      setMessages([]);
      return;
    }

    // Stable chatId between two users
    const chatId = [user.uid, activeChat.id].sort().join('_');
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatMessage));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    });

    return () => unsubscribe();
  }, [user, activeChat]);

  // 3. Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeChat]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !user || !activeChat) return;

    const chatId = [user.uid, activeChat.id].sort().join('_');
    const msgData = {
      senderId: user.uid,
      receiverId: activeChat.id,
      text: messageText,
      timestamp: serverTimestamp()
    };

    setMessageText('');

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), msgData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}/messages`);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return 'Sending...';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm min-h-[500px]">
      {/* Sidebar: Contact List */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`w-full md:w-80 flex-shrink-0 border-r border-slate-50 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}
      >
        <div className="p-6 border-b border-slate-50">
          <h2 className="text-xl font-bold text-slate-800 font-display">Messages</h2>
          <div className="relative mt-4">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search directory..." 
               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-blue-100 outline-none transition-all"
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
          {loadingContacts ? (
            <div className="p-8 text-center text-slate-300 text-sm animate-pulse">Searching directory...</div>
          ) : contacts.map((contact, i) => (
            <motion.button
              key={contact.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActiveChat(contact)}
              className={`w-full p-4 flex items-center gap-4 transition-all border-b border-slate-50/50 hover:bg-slate-50
                ${activeChat?.id === contact.id ? 'bg-blue-50/50 border-blue-100' : ''}`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-bold group-hover:bg-white overflow-hidden">
                  {contact.avatar ? <img src={contact.avatar} className="w-full h-full object-cover" /> : contact.name.charAt(0)}
                </div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{contact.name}</p>
                <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mt-0.5">{contact.role}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Chat View */}
      <div className={`flex-1 flex flex-col bg-slate-50/30 ${!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        <AnimatePresence mode="wait">
          {activeChat ? (
            <motion.div 
              key={activeChat.id}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center px-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveChat(null)} className="md:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold shadow-sm overflow-hidden text-xs">
                    {activeChat.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : activeChat.name.charAt(0)}
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-800 text-sm leading-none">{activeChat.name}</h3>
                     <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                       {activeChat.role}
                     </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none"
              >
                {messages.length === 0 && (
                  <div className="text-center py-20 text-slate-300 text-sm italic">No messages yet. Start the conversation!</div>
                )}
                {messages.map((msg, i) => {
                  const isSelf = msg.senderId === user?.uid;
                  return (
                    <motion.div 
                      key={msg.id} 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] space-y-1 ${isSelf ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm transition-all
                          ${isSelf 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}
                        `}>
                          {msg.text}
                        </div>
                        <p className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 ${isSelf ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Message Input */}
              <div className="p-6 bg-white border-t border-slate-100">
                <form 
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-3 bg-slate-50 p-2 pl-4 rounded-2xl border border-slate-100"
                >
                  <button type="button" className="text-slate-400 hover:text-blue-500 transition-colors p-1"><Smile size={20} /></button>
                  <input 
                    type="text" 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..." 
                    className="flex-1 bg-transparent border-none outline-none text-sm py-2 px-1 text-slate-700 placeholder:text-slate-400"
                  />
                  <button 
                    type="submit"
                    disabled={!messageText.trim()}
                    className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-blue-100"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4 max-w-sm px-6"
            >
               <div className="w-20 h-20 bg-white rounded-[28px] mx-auto flex items-center justify-center text-slate-200 border border-slate-100 shadow-sm animate-bounce">
                  <Send size={32} />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-slate-800">Your Conversations</h3>
                 <p className="text-slate-400 text-sm mt-1 leading-relaxed">Select a user from the directory to start messaging with students or faculty.</p>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
