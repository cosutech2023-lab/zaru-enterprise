import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface Props {
  imageUrl: string;
  imageTitle?: string;
  onClose: () => void;
}

export default function ChatImageViewerModal({ imageUrl, imageTitle, onClose }: Props) {
  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between text-white pb-3 px-2">
          <div className="flex items-center gap-2 max-w-[70%]">
            <span className="text-sm font-semibold truncate">{imageTitle || 'Attached Image'}</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={imageUrl}
              download={imageTitle || 'attached-image.jpg'}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-neutral-700"
              title="Download image"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white rounded-lg transition-colors border border-neutral-700"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl overflow-hidden flex items-center justify-center p-2 sm:p-4 max-h-[82vh]">
          <img 
            src={imageUrl} 
            alt={imageTitle || 'Full preview'} 
            className="max-h-[78vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
