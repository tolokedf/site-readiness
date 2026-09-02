import React from 'react';
import { X, Download, Trash2, Calendar, FileText } from 'lucide-react';
import { ReportAttachment } from '../types';

interface PhotoViewerModalProps {
  isOpen: boolean;
  photo: ReportAttachment | null;
  onClose: () => void;
  onDelete?: (photoId: string) => void;
  itemRequirement?: string;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  photo,
  onClose,
  onDelete,
  itemRequirement,
}) => {
  if (!isOpen || !photo) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = photo.originalName || 'inspection-photo.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00796B] text-white flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base truncate max-w-[260px] sm:max-w-md">
                {photo.caption || photo.originalName || 'Inspection Photo Evidence'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {itemRequirement ? `Item #${photo.itemNumber}: ${itemRequirement}` : photo.originalName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              title="Download original photo"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {onDelete && (
              <button
                onClick={() => {
                  onDelete(photo.id);
                  onClose();
                }}
                className="p-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Delete photo"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white rounded-2xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Large Image Preview Area */}
        <div className="flex-1 bg-black/90 p-4 sm:p-8 flex items-center justify-center overflow-auto min-h-[350px]">
          <img
            src={photo.url}
            alt={photo.caption || photo.originalName}
            className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-white/5"
          />
        </div>

        {/* Photo Info Bar */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#4DB6AC]" />
              Captured: {new Date(photo.uploadedAt).toLocaleString()}
            </span>
            {photo.size && (
              <span>Size: {(photo.size / (1024 * 1024)).toFixed(2)} MB</span>
            )}
          </div>
          {photo.caption && (
            <p className="text-slate-300 italic font-medium bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
              "{photo.caption}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
