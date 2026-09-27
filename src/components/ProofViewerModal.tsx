import React, { useState } from 'react';
import { Investment, User } from '../types';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  CheckCircle, 
  Clock, 
  Building2, 
  User as UserIcon, 
  DollarSign, 
  FileText, 
  ExternalLink,
  ShieldCheck,
  Calendar
} from 'lucide-react';

interface Props {
  investment: Investment;
  user: User;
  onClose: () => void;
  onApprove?: (userId: string, investmentId: string) => void;
}

export default function ProofViewerModal({ investment, user, onClose, onApprove }: Props) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isApproving, setIsApproving] = useState(false);

  const proof = investment.proofOfPayment || '';
  const fileName = investment.proofFileName || (proof.startsWith('data:') ? 'payment_receipt.jpg' : proof) || 'payment_receipt.jpg';
  const isImage = proof.startsWith('data:image/') || proof.startsWith('http') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
  const isPdf = proof.startsWith('data:application/pdf') || /\.pdf$/i.test(fileName);

  const handleDownload = () => {
    if (!proof) return;
    if (proof.startsWith('data:') || proof.startsWith('http')) {
      const link = document.createElement('a');
      link.href = proof;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Create a text summary blob if it's just a legacy filename
      const content = `ZARU ENTERPRISE - PAYMENT PROOF RECORD\n` +
        `----------------------------------------\n` +
        `Investor: ${user.accountName}\n` +
        `Email: ${user.email}\n` +
        `Phone: ${user.phone}\n` +
        `Bank: ${user.bankName} - ${user.accountNumber}\n` +
        `Plan: ${investment.packageName}\n` +
        `Amount: NGN ${investment.amount.toLocaleString()}\n` +
        `Date: ${new Date(investment.date).toLocaleString()}\n` +
        `File Name: ${fileName}\n` +
        `Status: ${investment.status}\n`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleApprove = () => {
    if (!onApprove) return;
    setIsApproving(true);
    onApprove(user.id, investment.id);
    setTimeout(() => {
      setIsApproving(false);
      onClose();
    }, 600);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">Proof of Payment</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  investment.status === 'Active' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                    : investment.status === 'Completed'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 animate-pulse'
                }`}>
                  {investment.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">Plan: {investment.packageName} • {fileName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {proof && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors"
                title="Download Proof File"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-400 hover:text-white transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split into metadata bar and document viewer */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          
          {/* Document Viewer (Main) */}
          <div className="flex-1 bg-black/60 flex flex-col items-center justify-center p-4 overflow-hidden relative min-h-[350px] lg:min-h-[460px]">
            {isImage && (proof.startsWith('data:') || proof.startsWith('http')) ? (
              <>
                {/* Floating Image Controls */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-sm border border-neutral-700 rounded-lg p-1 text-gray-300 shadow-lg">
                  <button
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
                    className="p-1.5 hover:bg-neutral-800 rounded text-gray-300 hover:text-white"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono px-1 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                    className="p-1.5 hover:bg-neutral-800 rounded text-gray-300 hover:text-white"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="p-1.5 hover:bg-neutral-800 rounded text-gray-300 hover:text-white"
                    title="Rotate Image"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setZoom(1); setRotation(0); }}
                    className="text-[11px] px-2 py-1 hover:bg-neutral-800 rounded text-gray-400 hover:text-white"
                  >
                    Reset
                  </button>
                </div>

                {/* Scrollable / Scaled Image Viewport */}
                <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                  <img
                    src={proof}
                    alt={`Payment proof for ${investment.packageName}`}
                    className="max-w-full max-h-full object-contain rounded border border-neutral-800 shadow-2xl transition-transform duration-150 select-none"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center'
                    }}
                  />
                </div>
              </>
            ) : isPdf && proof.startsWith('data:application/pdf') ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <iframe
                  src={proof}
                  title="PDF Payment Proof"
                  className="w-full h-full rounded border border-neutral-800 bg-neutral-900"
                />
              </div>
            ) : (
              /* Fallback / Mock receipt slip presentation for legacy uploads */
              <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Electronic Payment Proof Slip</h4>
                  <p className="text-xs text-gray-400 mt-1 font-mono">Attachment: {fileName}</p>
                </div>

                <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-left space-y-2 text-xs">
                  <div className="flex justify-between border-b border-neutral-800/80 pb-2">
                    <span className="text-gray-400">Payment To:</span>
                    <span className="font-semibold text-white">Moniepoint • 6394899106</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800/80 pb-2">
                    <span className="text-gray-400">Beneficiary:</span>
                    <span className="font-semibold text-white">Zaru Enterprise Farm</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800/80 pb-2">
                    <span className="text-gray-400">Payer Name:</span>
                    <span className="font-semibold text-white">{user.accountName}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800/80 pb-2">
                    <span className="text-gray-400">Plan Purchased:</span>
                    <span className="font-semibold text-emerald-400">{investment.packageName}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-400">Amount Paid:</span>
                    <span className="font-bold text-white text-sm">₦{investment.amount.toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 italic">
                  Note: Uploaded filename reference recorded on record. Future uploads through the updated payment portal store the complete high-resolution receipt image directly.
                </p>
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="w-full lg:w-80 bg-neutral-900/90 border-t lg:border-t-0 lg:border-l border-neutral-800 p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Transaction Details</h4>
                <div className="space-y-3 text-sm">
                  <div className="bg-neutral-950/80 p-3 rounded-lg border border-neutral-800">
                    <span className="text-xs text-gray-500 block mb-0.5">Amount Transferred</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono">
                      ₦{investment.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-neutral-950/80 p-3 rounded-lg border border-neutral-800 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Package:</span>
                      <span className="font-semibold text-white">{investment.packageName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Submission Date:</span>
                      <span className="text-gray-300">{new Date(investment.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Submission Time:</span>
                      <span className="text-gray-300">{new Date(investment.date).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Plan Status:</span>
                      <span className="font-semibold text-white">{investment.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Investor Profile</h4>
                <div className="bg-neutral-950/80 p-3 rounded-lg border border-neutral-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-200 font-medium">
                    <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span>{user.accountName}</span>
                  </div>
                  <div className="text-gray-400 pl-5">{user.email}</div>
                  <div className="text-gray-400 pl-5">{user.phone}</div>
                  
                  <div className="border-t border-neutral-800/80 pt-2 mt-2">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      <span>{user.bankName}</span>
                    </div>
                    <div className="font-mono text-gray-400 pl-5">{user.accountNumber}</div>
                    <div className="text-emerald-400 font-semibold pl-5 text-xs mt-1">
                      Account Name: <span className="text-white font-bold">{user.accountName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval / Close Actions */}
            <div className="pt-5 mt-5 border-t border-neutral-800 space-y-2">
              {investment.status === 'Pending' && onApprove && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isApproving ? 'Confirming Payment...' : 'Confirm Payment & Start Dividend Counting'}
                  </button>
                  <p className="text-[11px] text-emerald-400/90 text-center">
                    ✓ Confirming this payment immediately activates the plan and begins the investor's 14-day dividend cycle.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
