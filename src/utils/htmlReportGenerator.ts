import { SiteReport } from '../types';

/**
 * Loads an image from a URL or relative path and converts it into a base64 Data URL
 * so that the exported HTML file is completely standalone and portable offline.
 */
async function loadImageAsBase64(url: string): Promise<string> {
  if (url.startsWith('data:image/')) {
    return url;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let w = img.naturalWidth || img.width || 800;
          let h = img.naturalHeight || img.height || 600;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(url);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } catch {
          resolve(url);
        }
      };
      img.onerror = () => resolve(url);
      img.src = url;
    } catch {
      resolve(url);
    }
  });
}

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates an official, standalone, interactive HTML document string for a SiteReport.
 */
export async function buildSiteReadinessHtmlString(report: SiteReport): Promise<string> {
  // Convert all attachments into base64 embedded data URLs
  const attachmentsWithBase64 = await Promise.all(
    (report.attachments || []).map(async (att) => {
      try {
        const base64 = await loadImageAsBase64(att.url);
        return { ...att, url: base64 };
      } catch {
        return att;
      }
    })
  );

  // Group attachments by sectionId and itemNumber
  const attachmentsByItem: Record<string, typeof attachmentsWithBase64> = {};
  attachmentsWithBase64.forEach((att) => {
    if (att.sectionId && att.itemNumber !== undefined) {
      const key = `${att.sectionId}_${att.itemNumber}`;
      if (!attachmentsByItem[key]) attachmentsByItem[key] = [];
      attachmentsByItem[key].push(att);
    }
  });

  // Calculate statistics
  let totalItems = 0;
  let passedCount = 0;
  let failedCount = 0;
  let naCount = 0;
  let pendingCount = 0;

  report.sections.forEach((sec) => {
    sec.items.forEach((item) => {
      totalItems++;
      if (item.status === 'PASS') passedCount++;
      else if (item.status === 'FAIL') failedCount++;
      else if (item.status === 'NA') naCount++;
      else pendingCount++;
    });
  });

  const applicable = totalItems - naCount;
  const scorePercent = applicable > 0 ? Math.round((passedCount / applicable) * 100) : 0;

  const verdictLabel =
    report.overallStatus === 'READY'
      ? 'READY FOR AMR DEPLOYMENT'
      : report.overallStatus === 'CONDITIONAL'
      ? 'CONDITIONAL PASS (ACTIONS REQUIRED)'
      : report.overallStatus === 'ACTION_REQUIRED'
      ? 'ACTION REQUIRED PRIOR TO COMMISSIONING'
      : 'NOT READY FOR DEPLOYMENT';

  const verdictBgColor =
    report.overallStatus === 'READY'
      ? '#E0F2F1'
      : report.overallStatus === 'CONDITIONAL'
      ? '#FFF3E0'
      : '#FFE4E6';

  const verdictTextColor =
    report.overallStatus === 'READY'
      ? '#004D40'
      : report.overallStatus === 'CONDITIONAL'
      ? '#E65100'
      : '#BE123C';

  const generatedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const projectTitleSafe = escapeHtml(report.projectTitle || 'Site Readiness Verification');
  const siteNameSafe = escapeHtml(report.siteName || 'Customer Facility');
  const conductedBySafe = escapeHtml(report.conductedBy || 'Field Deployment Engineer');
  const amrModelSafe = escapeHtml(report.amrModel || 'DF Automation AMR/AGV');
  const reportDateSafe = escapeHtml(report.date || new Date().toISOString().split('T')[0]);
  const verifiedBySafe = escapeHtml(report.verifiedBy || 'Pending Lead Engineer');
  const verifierDesigSafe = escapeHtml(report.verifierDesignation || 'Lead Field Engineer');
  const verDateSafe = escapeHtml(report.verificationDate || report.date || 'N/A');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectTitleSafe} - FRM-FLD-003 Site Readiness Report</title>
  <style>
    :root {
      --primary: #00796B;
      --primary-dark: #004D40;
      --primary-light: #E0F2F1;
      --primary-border: #B2DFDB;
      --accent: #26A69A;
      --bg-neutral: #F8FAFC;
      --card-bg: #FFFFFF;
      --text-main: #0F172A;
      --text-muted: #64748B;
      --border-color: #E2E8F0;
      --pass-bg: #E0F2F1;
      --pass-text: #00695C;
      --fail-bg: #FFE4E6;
      --fail-text: #BE123C;
      --na-bg: #F1F5F9;
      --na-text: #475569;
      --pending-bg: #FEF3C7;
      --pending-text: #B45309;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--text-main);
      background-color: var(--bg-neutral);
      line-height: 1.5;
      padding: 24px 16px;
      font-size: 14px;
    }

    .container {
      max-width: 1080px;
      margin: 0 auto;
    }

    /* Floating Action Bar */
    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      padding: 14px 20px;
      border-radius: 18px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
      margin-bottom: 24px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      box-shadow: 0 4px 12px rgba(0, 121, 107, 0.25);
    }

    .btn-primary:hover {
      background: var(--primary-dark);
    }

    .btn-outline {
      background: white;
      border-color: var(--border-color);
      color: var(--text-main);
    }

    .btn-outline:hover {
      background: #F1F5F9;
    }

    /* Main Report Paper */
    .report-card {
      background: var(--card-bg);
      border-radius: 24px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      padding: 36px;
      margin-bottom: 28px;
    }

    /* Header Banner */
    .header-banner {
      background: linear-gradient(135deg, var(--primary-dark), var(--primary));
      color: white;
      padding: 24px;
      border-radius: 18px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .doc-pill {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: inline-block;
      margin-bottom: 8px;
    }

    .header-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .header-subtitle {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 4px;
    }

    /* Meta Details Grid */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      background: #F8FAFC;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 28px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .meta-value {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
    }

    /* Score & Status Summary */
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 16px;
      margin-bottom: 32px;
    }

    @media (max-width: 768px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }

    .score-box {
      background: #F4FAF9;
      border: 1px solid var(--primary-border);
      border-radius: 18px;
      padding: 22px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .score-number {
      font-size: 44px;
      font-weight: 900;
      color: var(--primary-dark);
      line-height: 1;
      margin: 8px 0;
    }

    .stats-breakdown {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 18px;
      padding: 18px;
    }

    .stat-pill {
      text-align: center;
      padding: 12px 8px;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .stat-val {
      font-size: 20px;
      font-weight: 800;
    }

    .stat-lbl {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* Section Tables */
    .section-block {
      margin-bottom: 32px;
    }

    .section-header {
      background: var(--primary-light);
      border: 1px solid var(--primary-border);
      color: var(--primary-dark);
      padding: 12px 18px;
      border-radius: 14px 14px 0 0;
      font-size: 14px;
      font-weight: 800;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .checklist-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border: 1px solid var(--border-color);
      border-top: none;
      border-radius: 0 0 14px 14px;
      overflow: hidden;
      font-size: 13px;
    }

    .checklist-table th {
      background: #F8FAFC;
      color: var(--text-muted);
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-color);
      text-align: left;
    }

    .checklist-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      vertical-align: top;
    }

    .checklist-table tr:last-child td {
      border-bottom: none;
    }

    .checklist-table tr:hover {
      background: #F8FAFC;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      text-align: center;
      min-width: 60px;
    }

    .status-pass {
      background: var(--pass-bg);
      color: var(--pass-text);
    }

    .status-fail {
      background: var(--fail-bg);
      color: var(--fail-text);
    }

    .status-na {
      background: var(--na-bg);
      color: var(--na-text);
    }

    .status-pending {
      background: var(--pending-bg);
      color: var(--pending-text);
    }

    .req-standard {
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .photo-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: var(--primary-dark);
      background: #E0F2F1;
      padding: 2px 8px;
      border-radius: 6px;
      margin-top: 4px;
    }

    /* Action Items Table */
    .action-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 14px;
      overflow: hidden;
      font-size: 13px;
      margin-top: 12px;
    }

    .action-table th {
      background: #F8FAFC;
      color: var(--text-muted);
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-color);
      text-align: left;
    }

    .action-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .action-table tr:last-child td {
      border-bottom: none;
    }

    /* Sign-off Box */
    .signoff-box {
      background: #F8FAFC;
      border: 1px solid var(--border-color);
      border-radius: 18px;
      padding: 24px;
      margin-top: 32px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 640px) {
      .signoff-box {
        grid-template-columns: 1fr;
      }
    }

    .verdict-box {
      padding: 16px 20px;
      border-radius: 14px;
      background: ${verdictBgColor};
      color: ${verdictTextColor};
      font-weight: 800;
      font-size: 14px;
      text-align: center;
      margin-top: 8px;
      border: 1px solid rgba(0,0,0,0.06);
    }

    /* Inline Photographic Evidence within Criteria Remarks */
    .inline-photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 8px;
      margin-top: 8px;
    }

    .inline-photo-card {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      background: #0F172A;
      cursor: pointer;
      display: flex;
      flex-direction: column;
    }

    .inline-photo-thumb {
      height: 90px;
      width: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.2s ease;
    }

    .inline-photo-card:hover .inline-photo-thumb {
      transform: scale(1.05);
    }

    .inline-photo-caption {
      font-size: 10px;
      color: #334155;
      background: white;
      padding: 4px 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-top: 1px solid var(--border-color);
      font-weight: 500;
    }

    .footer-note {
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
    }

    /* Modal for Photo Zoom in HTML */
    .lightbox {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 9999;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .lightbox.active {
      display: flex;
    }

    .lightbox img {
      max-width: 90vw;
      max-height: 85vh;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }

    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 20px;
      color: white;
      font-size: 32px;
      cursor: pointer;
      font-weight: bold;
    }

    /* Print Optimization */
    @media print {
      body {
        background: white;
        padding: 0;
        font-size: 11px;
      }

      .action-bar {
        display: none !important;
      }

      .report-card {
        border: none;
        box-shadow: none;
        padding: 0;
        margin: 0;
      }

      .section-block, .signoff-box, .photo-item-card {
        page-break-inside: avoid;
      }

      .header-banner {
        background: #004D40 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .status-badge, .stat-pill, .score-box, .section-header, .photo-category-header {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .photo-img-wrapper {
        height: 180px;
      }
    }
  </style>
</head>
<body>

<div class="container">
  <!-- Interactive Action Bar -->
  <div class="action-bar">
    <div>
      <span style="font-weight: 800; color: var(--primary-dark); font-size: 14px;">FRM-FLD-003 Report Export</span>
      <span style="color: var(--text-muted); font-size: 12px; margin-left: 8px;">Standalone HTML Document</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-outline" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button class="btn btn-primary" onclick="window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})">
        📸 View Photo Gallery (${attachmentsWithBase64.length})
      </button>
    </div>
  </div>

  <!-- Main Report Card -->
  <div class="report-card">
    <!-- Top Header Banner -->
    <div class="header-banner">
      <div>
        <span class="doc-pill">Standard Form • FRM-FLD-003</span>
        <h1 class="header-title">${projectTitleSafe}</h1>
        <p class="header-subtitle">AMR / AGV Site Readiness & Pre-Deployment Verification Checklist</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 11px; opacity: 0.8; display: block;">DF Automation & Robotics</span>
        <span style="font-size: 13px; font-weight: 700;">Report Date: ${reportDateSafe}</span>
      </div>
    </div>

    <!-- Metadata Details Table -->
    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Project Title</span>
        <span class="meta-value">${projectTitleSafe}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Site / Facility Name</span>
        <span class="meta-value">${siteNameSafe}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Conducted By (Engineer)</span>
        <span class="meta-value">${conductedBySafe}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">AMR / AGV Model</span>
        <span class="meta-value">${amrModelSafe}</span>
      </div>
    </div>

    <!-- Compliance Score & Statistics Overview -->
    <div class="summary-grid">
      <div class="score-box">
        <span style="font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px;">Readiness Score</span>
        <div class="score-number">${scorePercent}%</div>
        <span style="font-size: 12px; font-weight: 700; color: var(--primary-dark);">Compliance Index</span>
      </div>

      <div class="stats-breakdown">
        <div class="stat-pill" style="background: var(--pass-bg); color: var(--pass-text);">
          <div class="stat-val">${passedCount}</div>
          <div class="stat-lbl">Pass</div>
        </div>
        <div class="stat-pill" style="background: var(--fail-bg); color: var(--fail-text);">
          <div class="stat-val">${failedCount}</div>
          <div class="stat-lbl">Fail</div>
        </div>
        <div class="stat-pill" style="background: var(--pending-bg); color: var(--pending-text);">
          <div class="stat-val">${pendingCount}</div>
          <div class="stat-lbl">Pending</div>
        </div>
        <div class="stat-pill" style="background: var(--na-bg); color: var(--na-text);">
          <div class="stat-val">${naCount}</div>
          <div class="stat-lbl">N/A</div>
        </div>
      </div>
    </div>

    <!-- Verification Checklist Sections -->
    ${report.sections
      .map((section, sIdx) => {
        return `
      <div class="section-block">
        <div class="section-header">
          <span>${sIdx + 1}. ${escapeHtml(section.title)}</span>
          <span style="font-size: 11px; opacity: 0.85;">${section.items.length} Requirements</span>
        </div>
        <table class="checklist-table">
          <thead>
            <tr>
              <th style="width: 44px; text-align: center;">No.</th>
              <th>Requirement & Standard Specification</th>
              <th style="width: 90px; text-align: center;">Status</th>
              <th style="width: 38%;">Inspector Remark (Optional) & Evidence</th>
            </tr>
          </thead>
          <tbody>
            ${section.items
              .map((item) => {
                const itemPhotos = attachmentsByItem[`${section.id}_${item.number}`] || [];
                const statusClass =
                  item.status === 'PASS'
                    ? 'status-pass'
                    : item.status === 'FAIL'
                    ? 'status-fail'
                    : item.status === 'NA'
                    ? 'status-na'
                    : 'status-pending';

                const remarkContent = escapeHtml(item.userRemark || item.measuredValue || '-');

                return `
              <tr>
                <td style="text-align: center; font-weight: 800; color: var(--text-muted);">${item.number}</td>
                <td>
                  <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(item.requirement)}</div>
                  ${
                    item.remarkRequirement
                      ? `<div class="req-standard">${escapeHtml(item.remarkRequirement)}</div>`
                      : ''
                  }
                </td>
                <td style="text-align: center;">
                  <span class="status-badge ${statusClass}">${item.status}</span>
                </td>
                <td>
                  <div style="color: ${item.userRemark ? 'var(--text-main)' : 'var(--text-muted)'}; font-size: 12.5px; ${item.userRemark ? 'font-weight: 500;' : 'font-style: italic;'}">
                    ${remarkContent}
                  </div>
                  ${
                    itemPhotos.length > 0
                      ? `
                    <div class="inline-photo-grid">
                      ${itemPhotos
                        .map(
                          (att, pIdx) => `
                        <div class="inline-photo-card" onclick="openLightbox('${att.url}')" title="Click to view photo full size">
                          <img class="inline-photo-thumb" src="${att.url}" alt="${escapeHtml(att.caption || att.originalName)}" loading="lazy">
                          <div class="inline-photo-caption">
                            ${escapeHtml(att.caption || att.originalName || `Photo #${pIdx + 1}`)}
                          </div>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  `
                      : ''
                  }
                </td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      `;
      })
      .join('')}

    <!-- Site Action Items Section -->
    <div class="section-block" style="margin-top: 36px;">
      <div class="section-header" style="background: #F1F5F9; color: #1E293B; border-color: var(--border-color);">
        <span>Site Action Items & Outstanding Tasks</span>
        <span style="font-size: 11px;">${report.actionItems?.length || 0} Open Items</span>
      </div>

      ${
        !report.actionItems || report.actionItems.length === 0
          ? `
        <div style="padding: 24px; text-align: center; background: white; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 14px 14px; color: var(--text-muted); font-size: 13px;">
          ✓ No outstanding site modifications or action items recorded.
        </div>
      `
          : `
        <table class="action-table" style="border-top: none; border-radius: 0 0 14px 14px;">
          <thead>
            <tr>
              <th style="width: 44px; text-align: center;">No.</th>
              <th>Action Item / Task</th>
              <th style="width: 180px;">Person In Charge (PIC)</th>
              <th style="width: 120px;">Due Date</th>
              <th style="width: 110px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${report.actionItems
              .map(
                (act, idx) => `
              <tr>
                <td style="text-align: center; font-weight: 800; color: var(--text-muted);">${idx + 1}</td>
                <td style="font-weight: 600;">${escapeHtml(act.actionItem)}</td>
                <td>${escapeHtml(act.pic || '-')}</td>
                <td>${escapeHtml(act.dueDate || '-')}</td>
                <td>
                  <span style="font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 6px; ${
                    act.status === 'Closed'
                      ? 'background: #E0F2F1; color: #00695C;'
                      : act.status === 'In Progress'
                      ? 'background: #FFF3E0; color: #E65100;'
                      : 'background: #F1F5F9; color: #475569;'
                  }">
                    ${escapeHtml(act.status)}
                  </span>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `
      }
    </div>

    <!-- Verification & Sign-off Box -->
    <div class="signoff-box">
      <div>
        <span class="meta-label">Engineering Sign-off</span>
        <div style="margin-top: 8px; space-y: 6px;">
          <div style="font-size: 13px; margin-bottom: 4px;"><strong>Verified By:</strong> ${verifiedBySafe}</div>
          <div style="font-size: 13px; margin-bottom: 4px;"><strong>Designation:</strong> ${verifierDesigSafe}</div>
          <div style="font-size: 13px; margin-bottom: 4px;"><strong>Verification Date:</strong> ${verDateSafe}</div>
        </div>
      </div>

      <div>
        <span class="meta-label">Overall Readiness Assessment</span>
        <div class="verdict-box">
          ${verdictLabel}
        </div>
      </div>
    </div>

    <!-- Document Footer -->
    <div class="footer-note">
      DF Ultimate Deployment Suite • DF Automation and Robotics • Document Ref: FRM-FLD-003<br>
      Generated on ${generatedDate}
    </div>
  </div>
</div>

<!-- Image Lightbox Modal -->
<div id="lightbox" class="lightbox" onclick="closeLightbox()">
  <span class="lightbox-close">&times;</span>
  <img id="lightbox-img" src="" alt="Full size preview">
</div>

<script>
  function openLightbox(src) {
    var lb = document.getElementById('lightbox');
    var img = document.getElementById('lightbox-img');
    img.src = src;
    lb.classList.add('active');
  }

  function closeLightbox() {
    var lb = document.getElementById('lightbox');
    lb.classList.remove('active');
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
  });
</script>

</body>
</html>`;
}

/**
 * Generates and triggers download of the standalone HTML site readiness report.
 */
export async function generateSiteReadinessHtml(report: SiteReport): Promise<void> {
  const htmlContent = await buildSiteReadinessHtmlString(report);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const filename = `${report.projectTitle || 'DF-Site-Readiness'}-FRM-FLD-003.html`.replace(
    /[^a-zA-Z0-9-_.]/g,
    '_'
  );

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
