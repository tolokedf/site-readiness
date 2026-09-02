import React from 'react';
import { X, FileDown, Printer, Building, UserCheck, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { SiteReport } from '../types';
import { generateSiteReadinessHtml } from '../utils/htmlReportGenerator';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SiteReport;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [downloading, setDownloading] = React.useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateSiteReadinessHtml(report);
    } catch (e) {
      console.error('HTML generation error', e);
      alert('Failed to generate HTML report');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const attachmentsByItem: Record<string, typeof report.attachments> = {};
  (report.attachments || []).forEach((att) => {
    if (att.sectionId && att.itemNumber !== undefined) {
      const key = `${att.sectionId}_${att.itemNumber}`;
      if (!attachmentsByItem[key]) attachmentsByItem[key] = [];
      attachmentsByItem[key].push(att);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[2.5rem] border border-[#E0F2F1] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-[#F4FAF9] border-b border-[#E0F2F1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#00695C] bg-[#E0F2F1] border border-[#B2DFDB] px-3 py-1 rounded-full">
              FRM-FLD-003
            </span>
            <div>
              <h3 className="font-bold text-[#004D40] text-base sm:text-lg">
                Site Readiness & Verification Report Preview
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Complete audit document with all captured photo records & remarks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-[#E0F2F1] bg-white hover:bg-[#F4FAF9] text-slate-700 text-xs font-bold transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#00796B]/20 transition-all disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>{downloading ? 'Building HTML...' : 'Export HTML'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-2xl hover:bg-[#E0F2F1]/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 bg-[#F4FAF9]/30">
          {/* Document Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E0F2F1] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-[#E0F2F1]">
              <div>
                <span className="text-[11px] font-bold text-[#00695C] uppercase tracking-[0.2em]">
                  DF Automation & Robotics • Official Standard
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-[#004D40] mt-1">
                  {report.projectTitle || 'Site Readiness Verification Report'}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Document Reference: FRM-FLD-003 • Revision 2.4
                </p>
              </div>

              <div
                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border ${
                  report.overallStatus === 'READY'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : report.overallStatus === 'CONDITIONAL'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                {report.overallStatus.replace('_', ' ')}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-[#F4FAF9] p-3 rounded-2xl border border-[#E0F2F1]">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Site / Facility</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{report.siteName || '-'}</span>
              </div>
              <div className="bg-[#F4FAF9] p-3 rounded-2xl border border-[#E0F2F1]">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Conducted By</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{report.conductedBy || '-'}</span>
              </div>
              <div className="bg-[#F4FAF9] p-3 rounded-2xl border border-[#E0F2F1]">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Audit Date</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{report.date || '-'}</span>
              </div>
              <div className="bg-[#F4FAF9] p-3 rounded-2xl border border-[#E0F2F1]">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">AMR Model</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{report.amrModel || '-'}</span>
              </div>
            </div>
          </div>

          {/* Checklist Sections with Photos */}
          {report.sections.map((section, idx) => (
            <div key={section.id} className="bg-white rounded-3xl border border-[#E0F2F1] shadow-xs overflow-hidden">
              <div className="bg-[#004D40] text-white p-4 sm:p-5 flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#00796B] text-white text-xs font-extrabold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span>{section.title}</span>
                </h3>
                <span className="text-xs text-[#80CBC4] font-medium">
                  {section.items.length} items checked
                </span>
              </div>

              <div className="divide-y divide-[#E0F2F1]">
                {section.items.map((item) => {
                  const photos = attachmentsByItem[`${section.id}_${item.number}`] || [];

                  return (
                    <div key={item.number} className="p-4 sm:p-6 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-xl bg-[#E0F2F1] text-[#00695C] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {item.number}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.requirement}</p>
                            {item.remarkRequirement && (
                              <p className="text-xs text-slate-500 mt-1 font-medium">
                                {item.remarkRequirement}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="self-start sm:self-auto shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase ${
                              item.status === 'PASS'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : item.status === 'FAIL'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : item.status === 'NA'
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {item.status === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {item.status === 'FAIL' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            {item.status === 'PENDING' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                            {item.status === 'NA' && <HelpCircle className="w-3.5 h-3.5 text-slate-500" />}
                            <span>{item.status}</span>
                          </span>
                        </div>
                      </div>

                      {/* Remark Note (Optional) */}
                      {item.userRemark ? (
                        <div className="ml-9 p-3 rounded-2xl bg-[#F4FAF9] border border-[#E0F2F1] text-xs text-slate-700">
                          <span className="font-bold text-[#00695C] mr-1.5">Inspector Remark:</span>
                          <span>{item.userRemark}</span>
                        </div>
                      ) : (
                        <div className="ml-9 text-xs text-slate-400 italic">
                          No remark note provided (Optional)
                        </div>
                      )}

                      {/* Embedded Photos for this checklist item */}
                      {photos.length > 0 && (
                        <div className="ml-9 pt-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                            Attached Photo Evidence ({photos.length}):
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {photos.map((p) => (
                              <div
                                key={p.id}
                                className="group relative rounded-2xl overflow-hidden border border-[#E0F2F1] bg-slate-900 shadow-xs"
                              >
                                <img
                                  src={p.url}
                                  alt={p.caption || p.originalName}
                                  className="h-28 sm:h-36 w-full object-cover group-hover:scale-105 transition-transform"
                                />
                                {p.caption && (
                                  <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1.5 text-[10px] text-white truncate text-center">
                                    {p.caption}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Action Items Preview */}
          {report.actionItems && report.actionItems.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#E0F2F1] shadow-xs p-6 space-y-4">
              <h3 className="font-bold text-[#004D40] text-base">Site Action Items & Outstanding Tasks</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-[#E0F2F1] rounded-2xl overflow-hidden">
                  <thead className="bg-[#F4FAF9] text-[#00695C] font-bold border-b border-[#E0F2F1]">
                    <tr>
                      <th className="p-3 w-12 text-center">No.</th>
                      <th className="p-3">Action Item</th>
                      <th className="p-3 w-40">PIC</th>
                      <th className="p-3 w-32">Due Date</th>
                      <th className="p-3 w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0F2F1]">
                    {report.actionItems.map((act, i) => (
                      <tr key={act.id}>
                        <td className="p-3 text-center font-bold text-slate-400">{i + 1}</td>
                        <td className="p-3 font-semibold text-slate-800">{act.actionItem}</td>
                        <td className="p-3 text-slate-600">{act.pic || '-'}</td>
                        <td className="p-3 text-slate-600">{act.dueDate || '-'}</td>
                        <td className="p-3 font-bold text-slate-800">{act.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sign-off Preview Box */}
          <div className="bg-white rounded-3xl border border-[#E0F2F1] shadow-xs p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-bold text-[#00695C] uppercase tracking-wider block">
                Verification & Sign-off
              </span>
              <p className="font-bold text-slate-800 text-sm">
                Verified By: {report.verifiedBy || 'Pending Lead Engineer'}
              </p>
              <p className="text-slate-500">Designation: {report.verifierDesignation || 'Deployment Specialist'}</p>
              <p className="text-slate-500">Date: {report.verificationDate || report.date}</p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Final Assessment Verdict
              </span>
              <span className="text-sm font-black text-[#004D40] bg-[#E0F2F1] px-4 py-2 rounded-2xl border border-[#B2DFDB] inline-block">
                {report.overallStatus.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
