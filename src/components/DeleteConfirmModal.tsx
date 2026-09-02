import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        id="delete-confirm-modal"
        className="bg-white rounded-[2.5rem] max-w-md w-full p-6 sm:p-8 border border-[#E0F2F1] shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-2xl hover:bg-[#F4FAF9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#004D40]">Delete Site Readiness Report?</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Are you sure you want to permanently delete <strong className="text-slate-800 font-bold">"{title}"</strong>?
            This will remove all checklist item results, telemetry captures, remarks, and attached evidence files from your storage.
            This action cannot be undone.
          </p>
        </div>

        <div className="pt-3 flex items-center justify-end gap-3">
          <button
            id="cancel-delete-btn"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-2xl border border-[#E0F2F1] text-slate-700 text-xs font-bold hover:bg-[#F4FAF9] transition-colors"
          >
            Cancel
          </button>
          <button
            id="confirm-delete-btn"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
