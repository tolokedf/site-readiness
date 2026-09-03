"""
Site Readiness Verification Checklist - ReportLab PDF Generator
Generates official PDF replica of FRM-FLD-003 Site Readiness Verification Checklist.
Supports item-level evidence photos and handwritten signature embedding.
"""
import io
import os
import base64
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, PageBreak, HRFlowable
)

BASE_DIR = Path(__file__).resolve().parent
ROOT_DATABASE_DIR = BASE_DIR.parent / "Database" / "site_readiness"
if ROOT_DATABASE_DIR.parent.exists():
    DATA_DIR = ROOT_DATABASE_DIR
else:
    DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"

# Styling Colors
DARK_NAVY = colors.HexColor("#0f172a")
CYAN_BRAND = colors.HexColor("#0891b2")
LIGHT_GRAY = colors.HexColor("#f8fafc")
BORDER_GRAY = colors.HexColor("#cbd5e1")
TEXT_MAIN = colors.HexColor("#1e293b")
TEXT_MUTED = colors.HexColor("#64748b")

STATUS_COLORS = {
    'PASS': colors.HexColor('#059669'),
    'ACTION_REQUIRED': colors.HexColor('#d97706'),
    'FAIL': colors.HexColor('#dc2626'),
    'NOT_APPLICABLE': colors.HexColor('#64748b'),
    'PENDING': colors.HexColor('#475569')
}

def create_styles():
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=DARK_NAVY,
        alignment=1
    ))
    
    styles.add(ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    ))

    styles.add(ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9,
        textColor=TEXT_MAIN
    ))

    styles.add(ParagraphStyle(
        'CellTextBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9,
        textColor=TEXT_MAIN
    ))

    styles.add(ParagraphStyle(
        'RemarkText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=6.5,
        leading=8,
        textColor=TEXT_MUTED
    ))

    styles.add(ParagraphStyle(
        'PhotoCaption',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=6.5,
        leading=8,
        textColor=DARK_NAVY,
        alignment=1
    ))

    return styles

def format_dmy(date_str) -> str:
    if not date_str or not isinstance(date_str, str):
        return '-'
    parts = date_str.strip().split('-')
    if len(parts) == 3 and len(parts[0]) == 4:
        return f"{parts[2]}/{parts[1]}/{parts[0]}"
    return date_str

def generate_site_readiness_pdf(report: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=24,
        rightMargin=24,
        topMargin=24,
        bottomMargin=24
    )
    
    styles = create_styles()
    story = []
    
    # 1. Header
    report_date_dmy = format_dmy(report.get('date', datetime.now().strftime('%Y-%m-%d')))
    header_data = [
        [
            Paragraph("<b>DF AUTOMATION & ROBOTICS</b>", ParagraphStyle('DFH', fontName='Helvetica-Bold', fontSize=11, textColor=CYAN_BRAND)),
            Paragraph("<b>DOC NO:</b> FRM-FLD-003", ParagraphStyle('DFDoc', fontName='Helvetica-Bold', fontSize=8, textColor=TEXT_MAIN, alignment=2))
        ],
        [
            Paragraph("<b>SITE READINESS VERIFICATION CHECKLIST</b>", styles['DocTitle']),
            Paragraph(f"<b>Date:</b> {report_date_dmy}", ParagraphStyle('DFDate', fontName='Helvetica', fontSize=7.5, textColor=TEXT_MUTED, alignment=2))
        ]
    ]
    t_header = Table(header_data, colWidths=[370, 175])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 3))
    story.append(HRFlowable(width="100%", thickness=1.5, color=CYAN_BRAND, spaceAfter=5))
    
    # 2. Metadata Grid (Project Title, Conducted By, Date, Site, Model)
    overall_stat = report.get('overallStatus', 'ACTION_REQUIRED')
    stat_color = STATUS_COLORS.get(overall_stat, DARK_NAVY)
    
    meta_data = [
        [
            Paragraph(f"<b>Project Title:</b> {report.get('projectTitle') or '-'}", styles['CellTextBold']),
            Paragraph(f"<b>Conducted By:</b> {report.get('conductedBy') or '-'}", styles['CellTextBold']),
            Paragraph(f"<b>Date:</b> {format_dmy(report.get('date'))}", styles['CellTextBold'])
        ],
        [
            Paragraph(f"<b>Site Name / Facility:</b> {report.get('siteName') or '-'}", styles['CellText']),
            Paragraph(f"<b>AMR Model:</b> {report.get('amrModel') or '-'}", styles['CellText']),
            Paragraph(f"<b>Readiness Verdict:</b> <font color='{stat_color.hexval()}'><b>{overall_stat.replace('_', ' ')}</b></font>", styles['CellTextBold'])
        ]
    ]
    t_meta = Table(meta_data, colWidths=[205, 180, 160])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_GRAY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 6))

    # 3. Standard Checklist Sections
    sections = report.get('sections', [])
    for sec in sections:
        sec_title = sec.get('title', 'Section')
        items = sec.get('items', [])
        
        sec_table_data = [
            [
                Paragraph(f"<b>{sec_title.upper()}</b>", styles['SectionHeader']),
                "",
                "",
                ""
            ],
            [
                Paragraph("<b>No.</b>", ParagraphStyle('HNo', fontName='Helvetica-Bold', fontSize=7, textColor=DARK_NAVY, alignment=1)),
                Paragraph("<b>Requirement</b>", ParagraphStyle('HReq', fontName='Helvetica-Bold', fontSize=7, textColor=DARK_NAVY)),
                Paragraph("<b>Status</b>", ParagraphStyle('HStat', fontName='Helvetica-Bold', fontSize=7, textColor=DARK_NAVY, alignment=1)),
                Paragraph("<b>Remark / Findings & Evidence</b>", ParagraphStyle('HRem', fontName='Helvetica-Bold', fontSize=7, textColor=DARK_NAVY))
            ]
        ]
        
        item_photos = []

        for itm in items:
            num = str(itm.get('number', '1.0'))
            req = itm.get('requirement', '')
            status = itm.get('status', 'PENDING')
            user_remark = itm.get('userRemark', '').strip()
            def_remark = itm.get('defaultRemark', '').strip()
            itm_photo = itm.get('photo')
            
            remark_display = user_remark
            if def_remark:
                if remark_display:
                    remark_display = f"{remark_display} ({def_remark})"
                else:
                    remark_display = f"{def_remark}"
                    
            if itm_photo and isinstance(itm_photo, dict) and itm_photo.get('filename'):
                img_path = UPLOADS_DIR / itm_photo.get('filename')
                if img_path.exists():
                    item_photos.append({
                        'number': num,
                        'req': req,
                        'path': str(img_path),
                        'caption': itm_photo.get('caption') or f"Item {num} Photo"
                    })
                    if remark_display:
                        remark_display = f"{remark_display} [📷 Photo Attached]"
                    else:
                        remark_display = "[📷 Photo Attached]"
                    
            status_color = STATUS_COLORS.get(status, DARK_NAVY)
            status_text = status.replace('_', ' ')
            
            sec_table_data.append([
                Paragraph(num, ParagraphStyle('NCol', fontName='Helvetica-Bold', fontSize=7, alignment=1)),
                Paragraph(req, styles['CellText']),
                Paragraph(f"<font color='{status_color.hexval()}'><b>{status_text}</b></font>", ParagraphStyle('StatCol', fontName='Helvetica-Bold', fontSize=6.5, alignment=1)),
                Paragraph(remark_display if remark_display else "-", styles['RemarkText'] if not user_remark and not itm_photo else styles['CellText'])
            ])
            
        t_sec = Table(sec_table_data, colWidths=[28, 272, 70, 175])
        t_sec.setStyle(TableStyle([
            ('SPAN', (0,0), (3,0)),
            ('BACKGROUND', (0,0), (3,0), DARK_NAVY),
            ('BACKGROUND', (0,1), (3,1), colors.HexColor('#e2e8f0')),
            ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
            ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING', (0,0), (-1,-1), 3.5),
            ('RIGHTPADDING', (0,0), (-1,-1), 3.5),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        
        flowables = [t_sec]
        
        # If any item in this section has remark evidence photo attached
        if item_photos:
            photo_cells = []
            row = []
            for p_info in item_photos:
                try:
                    p_img = Image(p_info['path'], width=150, height=95)
                    caption_p = Paragraph(f"<b>Item {p_info['number']}:</b> {p_info['caption']}", styles['PhotoCaption'])
                    card = Table([[p_img], [caption_p]], colWidths=[160])
                    card.setStyle(TableStyle([
                        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                        ('TOPPADDING', (0,0), (-1,-1), 1),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                        ('BACKGROUND', (0,0), (-1,-1), LIGHT_GRAY),
                        ('BOX', (0,0), (-1,-1), 0.5, BORDER_GRAY),
                    ]))
                    row.append(card)
                    if len(row) == 3:
                        photo_cells.append(row)
                        row = []
                except Exception as e:
                    print(f"Error embedding item photo in PDF: {e}")
            
            if row:
                while len(row) < 3:
                    row.append("")
                photo_cells.append(row)
                
            if photo_cells:
                t_photos = Table(photo_cells, colWidths=[180, 180, 180])
                t_photos.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('LEFTPADDING', (0,0), (-1,-1), 2),
                    ('RIGHTPADDING', (0,0), (-1,-1), 2),
                    ('TOPPADDING', (0,0), (-1,-1), 2),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                ]))
                flowables.append(Spacer(1, 3))
                flowables.append(t_photos)
                    
        flowables.append(Spacer(1, 5))
        story.append(KeepTogether(flowables))

    # 4. Action Items Table
    action_items = report.get('actionItems', [])
    act_data = [
        [Paragraph("<b>ACTION ITEMS / PENDING SITE RECTIFICATIONS</b>", styles['SectionHeader']), "", "", ""],
        [
            Paragraph("<b>No.</b>", ParagraphStyle('ANo', fontName='Helvetica-Bold', fontSize=7, textColor=DARK_NAVY, alignment=1)),
            Paragraph("<b>Action Item Required</b>", ParagraphStyle('AItem', fontName='Helvetica-Bold', fontSize=7, textColor=DARK_NAVY)),
            Paragraph("<b>PIC / Responsible</b>", ParagraphStyle('APic', fontName='Helvetica-Bold', fontSize=7, textColor=DARK_NAVY)),
            Paragraph("<b>Due Date</b>", ParagraphStyle('ADate', fontName='Helvetica-Bold', fontSize=7, textColor=DARK_NAVY, alignment=1))
        ]
    ]
    
    if action_items and len(action_items) > 0:
        for idx, act in enumerate(action_items, 1):
            act_data.append([
                Paragraph(str(idx), ParagraphStyle('AN', fontName='Helvetica', fontSize=7, alignment=1)),
                Paragraph(act.get('description', act.get('actionItem', act.get('action', '-'))), styles['CellText']),
                Paragraph(act.get('pic', '-'), styles['CellText']),
                Paragraph(format_dmy(act.get('dueDate') or act.get('date')), ParagraphStyle('AD', fontName='Helvetica', fontSize=7, alignment=1))
            ])
    else:
        act_data.append([
            Paragraph("1", ParagraphStyle('AN', fontName='Helvetica', fontSize=7, alignment=1)),
            Paragraph("No critical blockers recorded. Proceed with standard AMR mapping & commissioning schedule.", styles['CellText']),
            Paragraph("DF Deployment Team", styles['CellText']),
            Paragraph(format_dmy(report.get('date')), ParagraphStyle('AD', fontName='Helvetica', fontSize=7, alignment=1))
        ])
        
    t_act = Table(act_data, colWidths=[28, 287, 120, 110])
    t_act.setStyle(TableStyle([
        ('SPAN', (0,0), (3,0)),
        ('BACKGROUND', (0,0), (3,0), CYAN_BRAND),
        ('BACKGROUND', (0,1), (3,1), colors.HexColor('#e2e8f0')),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3.5),
        ('RIGHTPADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(KeepTogether([t_act, Spacer(1, 6)]))

    # 5. Verified By Sign-off Box (with Handwritten Signature embedding)
    verified_by = report.get('verifiedBy') or report.get('conductedBy') or '-'
    verifier_desig = report.get('verifierDesignation') or '-'
    v_date = format_dmy(report.get('verificationDate') or report.get('date') or datetime.now().strftime('%Y-%m-%d'))
    signature_data = report.get('signature', '')
    
    sig_img_flowable = None
    if signature_data and isinstance(signature_data, str) and signature_data.startswith('data:image'):
        try:
            header, encoded = signature_data.split(',', 1)
            sig_bytes = base64.b64decode(encoded)
            sig_img_flowable = Image(io.BytesIO(sig_bytes), width=120, height=42)
        except Exception as e:
            print(f"Error parsing signature image in PDF: {e}")
            
    sign_text_content = (
        f"<b>Verified by:</b> {verified_by}<br/>"
        f"<b>Designation:</b> {verifier_desig}<br/>"
        f"<b>Verification Date:</b> {v_date}<br/>"
        f"<font color='#64748b'><i>This document confirms that physical, electrical, and network facility readiness have been evaluated for autonomous mobile robot operations.</i></font>"
    )
    
    if sig_img_flowable:
        sig_box_content = [
            Paragraph("<b>Handwritten Signature:</b>", styles['CellTextBold']),
            sig_img_flowable
        ]
    else:
        sig_box_content = [
            Paragraph("<b>Handwritten Signature:</b>", styles['CellTextBold']),
            Spacer(1, 14),
            Paragraph("<font color='#94a3b8'>_________________________<br/>(Sign-off Complete)</font>", styles['RemarkText'])
        ]
        
    t_sig_box = Table([[sig_box_content]], colWidths=[140])
    t_sig_box.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    
    sign_table_data = [
        [
            Paragraph("<b>VERIFICATION & OFFICIAL SIGN-OFF</b>", styles['SectionHeader']),
            ""
        ],
        [
            Paragraph(sign_text_content, styles['CellText']),
            t_sig_box
        ]
    ]
    t_sign = Table(sign_table_data, colWidths=[395, 150])
    t_sign.setStyle(TableStyle([
        ('SPAN', (0,0), (1,0)),
        ('BACKGROUND', (0,0), (1,0), DARK_NAVY),
        ('BACKGROUND', (0,1), (-1,-1), LIGHT_GRAY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(KeepTogether([t_sign]))

    doc.build(story)
    return buffer.getvalue()
