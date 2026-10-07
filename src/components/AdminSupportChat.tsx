import React, { useState, useEffect, useRef } from 'react';
import { User, SupportMessage } from '../types';
import { addAdminSupportMessage, markUserMessagesAsRead, clearUserSupportMessages } from '../store';
import { compressImageFile } from '../utils/imageHelper';
import ChatImageViewerModal from './ChatImageViewerModal';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User as UserIcon, 
  ShieldCheck, 
  CheckCheck, 
  Clock, 
  Building2, 
  Phone, 
  Mail, 
  Trash2, 
  Filter, 
  Image as ImageIcon, 
  Eye, 
  X, 
  UploadCloud 
} from 'lucide-react';

interface Props {
  users: User[];
  onUsersUpdated: () => void;
  initialSelectedUserId?: string | null;
}

export default function AdminSupportChat({ users, onUsersUpdated, initialSelectedUserId }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId || null);
  const [replyText, setReplyText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ dataUrl: string; name: string; size: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive conversation list for all users
  const conversationList = users.map(u => {
    const msgs = u.supportMessages || [];
    const unreadCount = msgs.filter(m => m.sender === 'user' && !m.read).length;
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    return {
      user: u,
      messages: msgs,
      unreadCount,
      lastMsg
    };
  });

  // Filter conversations
  const filteredConversations = conversationList.filter(item => {
    const matchesFilter = filterMode === 'ALL' ? true : item.unreadCount > 0;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      item.user.accountName.toLowerCase().includes(q) ||
      item.user.email.toLowerCase().includes(q) ||
      item.user.phone.toLowerCase().includes(q) ||
      item.messages.some(m => (m.text && m.text.toLowerCase().includes(q)) || (m.imageName && m.imageName.toLowerCase().includes(q)));

    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

    const timeA = a.lastMsg ? new Date(a.lastMsg.timestamp).getTime() : 0;
    const timeB = b.lastMsg ? new Date(b.lastMsg.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  // Default select first user if none selected
  useEffect(() => {
    if (initialSelectedUserId && users.some(u => u.id === initialSelectedUserId)) {
      setSelectedUserId(initialSelectedUserId);
      return;
    }
    if (!selectedUserId && filteredConversations.length > 0) {
      setSelectedUserId(filteredConversations[0].user.id);
    }
  }, [initialSelectedUserId, filteredConversations, selectedUserId, users]);

  const selectedUser = users.find(u => u.id === selectedUserId) || null;
  const selectedUserMessages: SupportMessage[] = selectedUser?.supportMessages || [];

  // When admin selects a user with unread messages, mark user messages as read
  useEffect(() => {
    if (selectedUser) {
      const hasUnread = (selectedUser.supportMessages || []).some(m => m.sender === 'user' && !m.read);
      if (hasUnread) {
        markUserMessagesAsRead(selectedUser.id, 'admin');
        onUsersUpdated();
      }
    }
  }, [selectedUserId]);

  // Scroll to bottom of message thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUserMessages.length, selectedUserId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).');
      return;
    }

    try {
      setIsCompressing(true);
      const compressed = await compressImageFile(file, 1200, 0.82);
      setSelectedImage({
        dataUrl: compressed.dataUrl,
        name: compressed.name,
        size: compressed.size
      });
    } catch (err) {
      console.error('Failed to compress image:', err);
      alert('Failed to process image.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = replyText.trim().length > 0;
    const hasImage = !!selectedImage;

    if (!selectedUser || (!hasText && !hasImage) || isSending || isCompressing) return;

    setIsSending(true);
    const updated = addAdminSupportMessage(
      selectedUser.id, 
      hasText ? replyText.trim() : undefined,
      selectedImage?.dataUrl,
      selectedImage?.name
    );

    if (updated) {
      setReplyText('');
      setSelectedImage(null);
      onUsersUpdated();
    }
    setIsSending(false);
  };

  const handleQuickReply = (text: string) => {
    setReplyText(text);
  };

  const handleClearThread = () => {
    if (!selectedUser) return;
    if (window.confirm(`Are you sure you want to clear message history with ${selectedUser.accountName}?`)) {
      clearUserSupportMessages(selectedUser.id);
      onUsersUpdated();
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const totalUnreadAll = conversationList.reduce((acc, c) => acc + c.unreadCount, 0);
  const canSend = (replyText.trim().length > 0 || !!selectedImage) && !isSending && !isCompressing;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600/10 border border-red-600/30 rounded-lg">
              <MessageSquare className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white">User Messages & Inquiries Hub</h2>
            {totalUnreadAll > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                {totalUnreadAll} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Read and reply directly to investor messages, view uploaded payment screenshots and photo receipts, and send answers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterMode === 'ALL'
                ? 'bg-red-600 text-white'
                : 'bg-neutral-800 text-gray-400 hover:text-white hover:bg-neutral-700'
            }`}
          >
            All Users ({conversationList.length})
          </button>
          <button
            onClick={() => setFilterMode('UNREAD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              filterMode === 'UNREAD'
                ? 'bg-amber-500 text-black'
                : 'bg-neutral-800 text-gray-400 hover:text-white hover:bg-neutral-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Unread Only ({conversationList.filter(c => c.unreadCount > 0).length})</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Left sidebar + Right chat view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px] max-h-[750px]">
        {/* Left Sidebar: User list */}
        <div className="lg:col-span-4 border-r border-neutral-800 flex flex-col bg-neutral-950/80">
          {/* Search Bar */}
          <div className="p-3 border-b border-neutral-800">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user, email, message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          {/* User Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                No user messages match your search.
              </div>
            ) : (
              filteredConversations.map(({ user, messages, unreadCount, lastMsg }) => {
                const isSelected = user.id === selectedUserId;
                const activeCapital = (user.investments || [])
                  .filter(i => i.status === 'Active')
                  .reduce((acc, curr) => acc + curr.amount, 0);

                const hasPhoto = lastMsg?.image;

                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUserId(user.id);
                    }}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800 border-l-4 border-red-600'
                        : 'hover:bg-neutral-900/80'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sm text-gray-300 flex-shrink-0 relative">
                      {user.accountName.charAt(0).toUpperCase()}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                          {user.accountName}
                        </span>
                        {lastMsg && (
                          <span className="text-[10px] text-gray-500 font-mono flex-shrink-0 ml-1">
                            {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 truncate mb-1">
                        {user.email}
                      </div>

                      {lastMsg ? (
                        <div className={`text-xs truncate flex items-center gap-1 ${unreadCount > 0 ? 'text-amber-300 font-semibold' : 'text-gray-400'}`}>
                          {lastMsg.sender === 'admin' && <span>You: </span>}
                          {hasPhoto && <ImageIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 inline" />}
                          <span className="truncate">{lastMsg.text || (hasPhoto ? 'Photo Attachment' : '')}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-600 italic">No messages sent yet</span>
                      )}

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                        <span>Capital: <strong className="text-emerald-400">₦{activeCapital.toLocaleString()}</strong></span>
                        <span>•</span>
                        <span>{messages.length} msg{messages.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Chat Panel */}
        <div className="lg:col-span-8 flex flex-col bg-black/40">
          {selectedUser ? (
            <>
              {/* Selected User Header Bar */}
              <div className="p-4 border-b border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40 text-red-400 flex items-center justify-center font-bold">
                    {selectedUser.accountName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">{selectedUser.accountName}</h3>
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-neutral-800 text-gray-300 rounded border border-neutral-700">
                        ID: {selectedUser.id}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedUser.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedUser.phone}</span>
                      <span className="flex items-center gap-1 text-[#00A86B]">
                        <Building2 className="w-3 h-3" /> {selectedUser.bankName} - {selectedUser.accountNumber}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {selectedUserMessages.length > 0 && (
                    <button
                      onClick={handleClearThread}
                      className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-gray-400 hover:text-red-400 border border-neutral-800 rounded text-xs flex items-center gap-1 transition-colors"
                      title="Clear message history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Thread Messages */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5 bg-black/60 min-h-[320px] max-h-[460px]">
                {selectedUserMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 text-neutral-700 mb-3" />
                    <p className="font-medium text-gray-400">No message history with {selectedUser.accountName}</p>
                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                      You can send text messages or photos/receipts from here. When the user writes letters or uploads pictures, they appear here immediately.
                    </p>
                  </div>
                ) : (
                  selectedUserMessages.map((msg) => {
                    const isAdmin = msg.sender === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%] ${isAdmin ? 'self-end' : 'self-start'}`}
                      >
                        {/* Sender Label */}
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-gray-400">
                          {isAdmin ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                              <span className="font-semibold text-red-400">You (Admin Support)</span>
                            </>
                          ) : (
                            <>
                              <UserIcon className="w-3 h-3 text-emerald-400" />
                              <span className="font-semibold text-emerald-400">{selectedUser.accountName} (User)</span>
                            </>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-md break-words ${
                            isAdmin
                              ? 'bg-red-700 text-white rounded-br-xs'
                              : 'bg-neutral-800 border border-emerald-500/30 text-gray-100 rounded-bl-xs'
                          }`}
                        >
                          {/* Attached Image */}
                          {msg.image && (
                            <div 
                              className="mb-2 relative group cursor-pointer overflow-hidden rounded-lg bg-black/40 border border-black/30"
                              onClick={() => setEnlargedImage({ url: msg.image!, title: msg.imageName || 'Attached Image' })}
                            >
                              <img 
                                src={msg.image} 
                                alt={msg.imageName || 'Attachment'} 
                                className="max-h-64 max-w-full w-auto object-contain rounded-lg hover:opacity-90 transition-opacity"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-xs text-white font-medium transition-opacity backdrop-blur-[1px]">
                                <Eye className="w-4 h-4" />
                                <span>Click to view full photo</span>
                              </div>
                              {msg.imageName && (
                                <div className="p-1.5 text-[11px] bg-black/60 truncate font-mono text-gray-300">
                                  {msg.imageName}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Text */}
                          {msg.text && (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-gray-500 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatMessageTime(msg.timestamp)}</span>
                          {isAdmin && (
                            <span className="flex items-center gap-0.5 text-red-400 ml-1">
                              <CheckCheck className="w-3 h-3" />
                              <span>Delivered to User</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Templates */}
              <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-gray-500 flex items-center mr-1">Quick replies:</span>
                {[
                  'Payment photo received and verified! Your plan is activated.',
                  'Your 14-day dividend cycle is active and on track.',
                  'Withdrawal request received and currently processing.',
                  'Please send a clearer photo or receipt showing the full reference.',
                  'Please confirm your correct bank account details.'
                ].map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickReply(template)}
                    className="text-[11px] bg-neutral-900 hover:bg-neutral-800 text-gray-300 hover:text-white px-2.5 py-1 rounded border border-neutral-800 hover:border-red-600 transition-colors cursor-pointer"
                  >
                    {template}
                  </button>
                ))}
              </div>

              {/* Reply Form */}
              <div className="p-4 bg-neutral-950 border-t border-neutral-800 space-y-2">
                {/* Selected Image Preview (prior to sending) */}
                {selectedImage && (
                  <div className="p-2.5 bg-neutral-900 border border-neutral-700 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img 
                        src={selectedImage.dataUrl} 
                        alt="Selected preview" 
                        className="w-12 h-12 object-cover rounded-lg border border-neutral-700 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                          <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{selectedImage.name}</span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          {(selectedImage.size / 1024).toFixed(0)} KB • Ready to send to user
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-gray-400 hover:text-white rounded-lg transition-colors border border-neutral-700 flex-shrink-0"
                      title="Remove attached photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {isCompressing && (
                  <div className="text-xs text-amber-400 flex items-center gap-1.5 font-medium animate-pulse">
                    <UploadCloud className="w-4 h-4" />
                    <span>Processing image...</span>
                  </div>
                )}

                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <form onSubmit={handleSendReply} className="flex items-end gap-2 bg-black border border-neutral-700 rounded-xl p-2 focus-within:border-red-600 transition-colors">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs flex-shrink-0 border border-neutral-700 cursor-pointer"
                    title="Attach image or receipt"
                  >
                    <ImageIcon className="w-4 h-4 text-red-400" />
                    <span className="hidden sm:inline">Photo</span>
                  </button>

                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply letters/text or attach photo to ${selectedUser.accountName}...`}
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none resize-none px-2 py-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!canSend}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer text-sm flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Reply</span>
                  </button>
                </form>

                <p className="text-[11px] text-gray-500">
                  Press Enter to send (Shift+Enter for new line). User receives both text letters and uploaded photos immediately on their dashboard.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
              <MessageSquare className="w-16 h-16 text-neutral-800 mb-3" />
              <h3 className="text-base font-semibold text-gray-400">Select a user to view messages</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Choose an investor from the left sidebar to read their message thread and send direct administrative replies.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enlarged Image Viewer Modal */}
      {enlargedImage && (
        <ChatImageViewerModal
          imageUrl={enlargedImage.url}
          imageTitle={enlargedImage.title}
          onClose={() => setEnlargedImage(null)}
        />
      )}
    </div>
  );
}
