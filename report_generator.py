"""
Site Readiness Verification Checklist - ReportLab PDF Generator
Generates official PDF replica of FRM-FLD-003 Site Readiness Verification Checklist.
"""
import io
import os
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, PageBreak, HRFlowable
)

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "data" / "uploads"

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
        fontSize=13,
        leading=16,
        textColor=DARK_NAVY,
        alignment=1
    ))
    
    styles.add(ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    ))

    styles.add(ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=TEXT_MAIN
    ))

    styles.add(ParagraphStyle(
        'CellTextBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=TEXT_MAIN
    ))

    styles.add(ParagraphStyle(
        'RemarkText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7,
        leading=8.5,
        textColor=TEXT_MUTED
    ))

    return styles

def generate_site_readiness_pdf(report: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=26,
        rightMargin=26,
        topMargin=26,
        bottomMargin=26
    )
    
    styles = create_styles()
    story = []
    
    # 1. Header
    header_data = [
        [
            Paragraph("<b>DF AUTOMATION & ROBOTICS</b>", ParagraphStyle('DFH', fontName='Helvetica-Bold', fontSize=12, textColor=CYAN_BRAND)),
            Paragraph("<b>DOC NO:</b> FRM-FLD-003", ParagraphStyle('DFDoc', fontName='Helvetica-Bold', fontSize=8.5, textColor=TEXT_MAIN, alignment=2))
        ],
        [
            Paragraph("<b>SITE READINESS VERIFICATION CHECKLIST</b>", styles['DocTitle']),
            Paragraph(f"<b>Date:</b> {report.get('date', datetime.now().strftime('%Y-%m-%d'))}", ParagraphStyle('DFDate', fontName='Helvetica', fontSize=8, textColor=TEXT_MUTED, alignment=2))
        ]
    ]
    t_header = Table(header_data, colWidths=[360, 180])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=CYAN_BRAND, spaceAfter=6))
    
    # 2. Metadata Grid (Project Title, Conducted By, Date, Site, Model)
    meta_data = [
        [
            Paragraph(f"<b>Project Title:</b> {report.get('projectTitle', 'AGV Site Assessment')}", styles['CellTextBold']),
            Paragraph(f"<b>Conducted By:</b> {report.get('conductedBy', 'DF Field Engineer')}", styles['CellTextBold']),
            Paragraph(f"<b>Date:</b> {report.get('date', '-')}", styles['CellTextBold'])
        ],
        [
            Paragraph(f"<b>Site Name / Facility:</b> {report.get('siteName', '-')}", styles['CellText']),
            Paragraph(f"<b>Customer PIC:</b> {report.get('customerName', '-')}", styles['CellText']),
            Paragraph(f"<b>AMR Model:</b> {report.get('amrModel', 'DFleet Standard')}", styles['CellText'])
        ]
    ]
    t_meta = Table(meta_data, colWidths=[200, 180, 160])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_GRAY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 6))

    # 3. 8 Standard Checklist Sections
    sections = report.get('sections', [])
    for sec in sections:
        sec_title = sec.get('title', 'Section')
        items = sec.get('items', [])
        photo = sec.get('photo')
        
        sec_table_data = [
            [
                Paragraph(f"<b>{sec_title.upper()}</b>", styles['SectionHeader']),
                "",
                "",
                ""
            ],
            [
                Paragraph("<b>No.</b>", ParagraphStyle('HNo', fontName='Helvetica-Bold', fontSize=7.5, textColor=DARK_NAVY, alignment=1)),
                Paragraph("<b>Requirement</b>", ParagraphStyle('HReq', fontName='Helvetica-Bold', fontSize=7.5, textColor=DARK_NAVY)),
                Paragraph("<b>Status</b>", ParagraphStyle('HStat', fontName='Helvetica-Bold', fontSize=7.5, textColor=DARK_NAVY, alignment=1)),
                Paragraph("<b>Remark / Findings</b>", ParagraphStyle('HRem', fontName='Helvetica-Bold', fontSize=7.5, textColor=DARK_NAVY))
            ]
        ]
        
        for itm in items:
            num = str(itm.get('number', '1.0'))
            req = itm.get('requirement', '')
            status = itm.get('status', 'PENDING')
            user_remark = itm.get('userRemark', '').strip()
            def_remark = itm.get('defaultRemark', '').strip()
            
            remark_display = user_remark
            if def_remark:
                if remark_display:
                    remark_display = f"{remark_display} (Note: {def_remark})"
                else:
                    remark_display = f"Standard: {def_remark}"
                    
            status_color = STATUS_COLORS.get(status, DARK_NAVY)
            status_text = status.replace('_', ' ')
            
            sec_table_data.append([
                Paragraph(num, ParagraphStyle('NCol', fontName='Helvetica-Bold', fontSize=7.5, alignment=1)),
                Paragraph(req, styles['CellText']),
                Paragraph(f"<font color='{status_color.hexval()}'><b>{status_text}</b></font>", ParagraphStyle('StatCol', fontName='Helvetica-Bold', fontSize=7, alignment=1)),
                Paragraph(remark_display if remark_display else "-", styles['RemarkText'] if not user_remark else styles['CellText'])
            ])
            
        t_sec = Table(sec_table_data, colWidths=[32, 275, 75, 158])
        t_sec.setStyle(TableStyle([
            ('SPAN', (0,0), (3,0)),
            ('BACKGROUND', (0,0), (3,0), DARK_NAVY),
            ('BACKGROUND', (0,1), (3,1), colors.HexColor('#e2e8f0')),
            ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
            ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
            ('TOPPADDING', (0,0), (-1,-1), 2.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        
        flowables = [t_sec]
        
        # If Section has Photo Uploaded (Max 1 photo)
        if photo and isinstance(photo, dict) and photo.get('filename'):
            img_path = UPLOADS_DIR / photo.get('filename')
            if img_path.exists():
                try:
                    p_img = Image(str(img_path), width=180, height=110)
                    caption = photo.get('caption', f"Section Evidence Photo - {sec_title}")
                    photo_block = Table([
                        [p_img],
                        [Paragraph(f"<b>📷 Evidence:</b> {caption}", styles['RemarkText'])]
                    ], colWidths=[190])
                    photo_block.setStyle(TableStyle([
                        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                        ('TOPPADDING', (0,0), (-1,-1), 2),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                    ]))
                    flowables.append(Spacer(1, 3))
                    flowables.append(photo_block)
                except Exception:
                    pass
                    
        flowables.append(Spacer(1, 6))
        story.append(KeepTogether(flowables))

    # 4. Action Items Table
    action_items = report.get('actionItems', [])
    act_data = [
        [Paragraph("<b>ACTION ITEMS / PENDING SITE RECTIFICATIONS</b>", styles['SectionHeader']), "", "", ""],
        [
            Paragraph("<b>No.</b>", ParagraphStyle('ANo', fontName='Helvetica-Bold', fontSize=7.5, textColor=DARK_NAVY, alignment=1)),
            Paragraph("<b>Action Item Required</b>", ParagraphStyle('AItem', fontName='Helvetica-Bold', fontSize=7.5, textColor=DARK_NAVY)),
            Paragraph("<b>PIC / Responsible</b>", ParagraphStyle('APic', fontName='Helvetica-Bold', fontSize=7.5, textColor=DARK_NAVY)),
            Paragraph("<b>Due Date</b>", ParagraphStyle('ADate', fontName='Helvetica-Bold', fontSize=7.5, textColor=DARK_NAVY, alignment=1))
        ]
    ]
    
    if action_items and len(action_items) > 0:
        for idx, act in enumerate(action_items, 1):
            act_data.append([
                Paragraph(str(idx), ParagraphStyle('AN', fontName='Helvetica', fontSize=7.5, alignment=1)),
                Paragraph(act.get('description', act.get('action', '-')), styles['CellText']),
                Paragraph(act.get('pic', '-'), styles['CellText']),
                Paragraph(act.get('dueDate', act.get('date', '-')), ParagraphStyle('AD', fontName='Helvetica', fontSize=7.5, alignment=1))
            ])
    else:
        act_data.append([
            Paragraph("1", ParagraphStyle('AN', fontName='Helvetica', fontSize=7.5, alignment=1)),
            Paragraph("No critical blockers recorded. Proceed with standard AMR mapping & commissioning schedule.", styles['CellText']),
            Paragraph("DF Deployment Team", styles['CellText']),
            Paragraph(report.get('date', '-'), ParagraphStyle('AD', fontName='Helvetica', fontSize=7.5, alignment=1))
        ])
        
    t_act = Table(act_data, colWidths=[32, 285, 120, 103])
    t_act.setStyle(TableStyle([
        ('SPAN', (0,0), (3,0)),
        ('BACKGROUND', (0,0), (3,0), CYAN_BRAND),
        ('BACKGROUND', (0,1), (3,1), colors.HexColor('#e2e8f0')),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(KeepTogether([t_act, Spacer(1, 8)]))

    # 5. Verified By Sign-off Box
    verified_by = report.get('verifiedBy', report.get('conductedBy', 'DF Certified Specialist'))
    verifier_desig = report.get('verifierDesignation', 'Robotics Application Engineer')
    v_date = report.get('verificationDate', report.get('date', datetime.now().strftime('%Y-%m-%d')))
    
    sign_data = [
        [Paragraph("<b>VERIFICATION & SIGN-OFF</b>", styles['SectionHeader'])],
        [Paragraph(f"<b>Verified by:</b> {verified_by} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Designation:</b> {verifier_desig} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Date:</b> {v_date}<br/>"
                   f"<i>This document confirms that physical, electrical, and network facility readiness have been evaluated for autonomous mobile robot operations.</i>", styles['CellText'])]
    ]
    t_sign = Table(sign_data, colWidths=[540])
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), DARK_NAVY),
        ('BACKGROUND', (0,1), (0,1), LIGHT_GRAY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(KeepTogether([t_sign]))

    doc.build(story)
    return buffer.getvalue()
