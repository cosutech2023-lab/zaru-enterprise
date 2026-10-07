import React, { useState, useEffect, useRef } from 'react';
import { User, SupportMessage } from '../types';
import { addUserSupportMessage, markUserMessagesAsRead } from '../store';
import { compressImageFile } from '../utils/imageHelper';
import ChatImageViewerModal from './ChatImageViewerModal';
import { 
  MessageSquare, 
  Send, 
  ShieldCheck, 
  CheckCheck, 
  Clock, 
  User as UserIcon, 
  Sparkles, 
  Image as ImageIcon, 
  Paperclip, 
  X, 
  Eye, 
  UploadCloud,
  Phone
} from 'lucide-react';

interface Props {
  user: User;
  onUpdateUser: (user: User) => void;
}

export default function UserSupportChat({ user, onUpdateUser }: Props) {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ dataUrl: string; name: string; size: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages: SupportMessage[] = user.supportMessages || [];
  const unreadAdminCount = messages.filter(m => m.sender === 'admin' && !m.read).length;

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Mark admin messages as read when user views this component
  useEffect(() => {
    if (unreadAdminCount > 0) {
      const updated = markUserMessagesAsRead(user.id, 'user');
      if (updated) {
        onUpdateUser(updated);
      }
    }
  }, [user.id, unreadAdminCount]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, WebP).');
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
      alert('Failed to process image. Please try another image.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = inputText.trim().length > 0;
    const hasImage = !!selectedImage;

    if ((!hasText && !hasImage) || isSending || isCompressing) return;

    setIsSending(true);
    const updated = addUserSupportMessage(
      user.id, 
      hasText ? inputText.trim() : undefined,
      selectedImage?.dataUrl,
      selectedImage?.name
    );

    if (updated) {
      onUpdateUser(updated);
      setInputText('');
      setSelectedImage(null);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    }
    setIsSending(false);
  };

  const handleQuickQuestion = (question: string) => {
    setInputText(question);
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const canSend = (inputText.trim().length > 0 || !!selectedImage) && !isSending && !isCompressing;

  return (
    <div id="admin-support" className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-600/10 border border-red-600/30 rounded-xl">
            <MessageSquare className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Direct Admin Communication</h3>
              {unreadAdminCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                  {unreadAdminCount} New Reply
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Type letters or upload photos/screenshots (payment receipts, account details, inquiries) to ZARU Enterprise Administrators.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <a
            href="https://wa.me/2349131376638"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            title="Chat directly on WhatsApp"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp: 09131376638</span>
          </a>
          <div className="flex items-center gap-2 bg-black/50 border border-neutral-800 px-3 py-1.5 rounded-full text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-gray-300 font-medium">Admin Online</span>
          </div>
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="p-4 sm:p-6 bg-black/60 flex flex-col h-[360px] sm:h-[400px] overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="my-auto text-center py-6 px-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-gray-400">
              <ShieldCheck className="w-7 h-7 text-[#00A86B]" />
            </div>
            <h4 className="text-base font-semibold text-gray-200">How can our admin team help you today?</h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
              You can send text messages or attach image files (bank receipts, screenshots, ID, questions). Messages are delivered directly to the administrator desk.
            </p>

            {/* Quick Prompts */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {[
                'Question about my 14-day dividend cycle',
                'Help with my payment proof verification',
                'Inquiry on my pending withdrawal request',
                'Confirming my bank payout details'
              ].map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickQuestion(q)}
                  className="text-xs bg-neutral-900 hover:bg-neutral-800 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-green-600 transition-all text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#00A86B]" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%] ${isUser ? 'self-end' : 'self-start'}`}
              >
                {/* Sender badge */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-gray-400">
                  {isUser ? (
                    <>
                      <span>You ({user.accountName})</span>
                      <UserIcon className="w-3 h-3 text-emerald-400" />
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                      <span className="font-semibold text-red-400">Admin Support (ZARU)</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-md break-words ${
                    isUser
                      ? 'bg-[#00A86B] text-white rounded-br-xs'
                      : 'bg-neutral-800 border border-red-900/40 text-gray-100 rounded-bl-xs'
                  }`}
                >
                  {/* Attached Image if present */}
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

                  {/* Text Message */}
                  {msg.text && (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}
                </div>

                {/* Timestamp & read receipts */}
                <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-gray-500 font-mono">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{formatMessageTime(msg.timestamp)}</span>
                  {isUser && (
                    <span className="flex items-center gap-0.5 text-emerald-400 ml-1">
                      <CheckCheck className="w-3 h-3" />
                      <span>Delivered to Admin</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
      <div className="p-4 bg-neutral-950 border-t border-neutral-800">
        {sendSuccess && (
          <div className="mb-2.5 text-xs text-emerald-400 flex items-center gap-1.5 animate-fadeIn font-medium">
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Message delivered to Admin desk. You will receive replies directly here.</span>
          </div>
        )}

        {/* Selected Image Preview (prior to sending) */}
        {selectedImage && (
          <div className="mb-3 p-2.5 bg-neutral-900 border border-neutral-700 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3 overflow-hidden">
              <img 
                src={selectedImage.dataUrl} 
                alt="Selected preview" 
                className="w-12 h-12 object-cover rounded-lg border border-neutral-700 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{selectedImage.name}</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  {(selectedImage.size / 1024).toFixed(0)} KB • Photo ready to send
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
          <div className="mb-2 text-xs text-amber-400 flex items-center gap-1.5 font-medium animate-pulse">
            <UploadCloud className="w-4 h-4" />
            <span>Processing and optimizing image...</span>
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

        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="flex items-end gap-2 bg-black border border-neutral-700 rounded-xl p-2 focus-within:border-[#00A86B] transition-colors">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs flex-shrink-0 border border-neutral-700 cursor-pointer"
              title="Upload image or screenshot"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Photo</span>
            </button>

            {/* Message Text Input */}
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message, letters, or attach an image for Admin..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none resize-none px-2 py-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!canSend}
              className="px-4 py-2.5 bg-[#00A86B] hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg cursor-pointer text-sm flex-shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">{isSending ? 'Sending...' : 'Send'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-500 gap-1 px-1">
            <span>You can type letters, attach photos (JPG, PNG, WebP), or send both together. Press Enter to send.</span>
            <span>Admin receives messages instantly</span>
          </div>
        </form>
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
