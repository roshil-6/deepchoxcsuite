'use client';

import { jsPDF } from 'jspdf';
import { Project } from '@/lib/db';

interface ReportGeneratorProps {
  project: Project;
  fileName?: string;
}

/**
 * Generate a professional 4-page branded PDF report from project data
 */
export function generatePDFReport({ project, fileName }: ReportGeneratorProps) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = (doc as any).internal.pageSize.getWidth();
  const pageHeight = (doc as any).internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Color palette
  const colors = {
    cream: '#050505',
    teal: '#0D9488',
    obsidian: '#0a0a0a',
    espresso: '#E5E5E5',
  };

  let yPosition = margin;

  /**
   * Add a new page with header
   */
  const addNewPage = (pageNumber: number) => {
    if (pageNumber > 1) {
      doc.addPage();
      yPosition = margin;
    }

    // Page header with branding
    doc.setFillColor(13, 148, 136); // teal (#0D9488)
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(44, 27, 24); // espresso
    doc.text('DEEPCHOX', margin, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(44, 27, 24);
    doc.text('Zero-Data Virtual AI Office', margin, 22);

    // Page number
    doc.setFontSize(8);
    doc.setTextColor(44, 27, 24, 100);
    doc.text(`Page ${pageNumber}`, pageWidth - margin - 20, 22);

    yPosition = 40;
  };

  /**
   * Add section with title and content
   */
  const addSection = (
    icon: string,
    title: string,
    content: string,
    currentPage: number
  ): number => {
    // Check if we need a new page (leave 20mm for footer)
    if (yPosition > pageHeight - 40) {
      addNewPage(++currentPage);
    }

    // Section title with icon
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(44, 27, 24);
    doc.text(`${icon} ${title}`, margin, yPosition);
    yPosition += 8;

    // Divider
    doc.setDrawColor(44, 27, 24);
    (doc as any).setLineDash([1, 1]);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;
    (doc as any).setLineDash([]);

    // Content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(44, 27, 24);

    if (content?.trim()) {
      const splitContent = doc.splitTextToSize(content, contentWidth);
      const contentHeight = doc.getTextDimensions(splitContent).h;

      // Check if content fits on current page
      if (yPosition + contentHeight > pageHeight - 30) {
        addNewPage(++currentPage);
      }

      doc.text(splitContent, margin, yPosition);
      yPosition += contentHeight + 6;
    } else {
      doc.setTextColor(44, 27, 24, 150);
      doc.setFont('helvetica', 'italic');
      doc.text('[Not provided]', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      yPosition += 6;
    }

    yPosition += 4; // Extra space between sections

    return currentPage;
  };

  // =====================
  // PAGE 1: TITLE & OVERVIEW
  // =====================
  addNewPage(1);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(44, 27, 24);
  doc.text(project.name, margin, yPosition);
  yPosition += 14;

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(44, 27, 24, 200);
  doc.text('Comprehensive Business Plan Report', margin, yPosition);
  yPosition += 8;

  // Metadata box
  doc.setFillColor(10, 10, 20); // very dark
  doc.rect(margin, yPosition, contentWidth, 20, 'F');
  doc.setFontSize(9);
  doc.setTextColor(44, 27, 24);
  doc.text(
    `Generated: ${new Date(project.timestamp).toLocaleDateString()} | Status: Complete`,
    margin + 3,
    yPosition + 7
  );
  doc.text(
    `Database: Secure Local Storage (IndexedDB) | Format: Multi-Agent Analysis`,
    margin + 3,
    yPosition + 14
  );
  yPosition += 28;

  // Overview intro
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(44, 27, 24, 200);
  const intro = doc.splitTextToSize(
    'This report synthesizes insights from four specialized AI agents: the CEO Strategist (vision), Product Manager (execution), Accountant (financials), and Business Scout (market intelligence). All data is stored locally in your browser with zero server transmission.',
    contentWidth
  );
  doc.text(intro, margin, yPosition);
  yPosition += doc.getTextDimensions(intro).h + 10;

  // Quick stats
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Report Composition:', margin, yPosition);
  yPosition += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const sections_info = [
    '🎯 CEO Strategic Vision',
    '📋 Product Manager Roadmap',
    '💰 Financial Analysis',
    '🔍 Market Intelligence',
  ];
  sections_info.forEach((section) => {
    doc.text(`• ${section}`, margin + 5, yPosition);
    yPosition += 5;
  });

  let currentPage = 1;

  // =====================
  // PAGE 2: STRATEGY
  // =====================
  currentPage = addSection('🎯', 'CEO Strategic Vision', project.strategy || '', currentPage);

  // =====================
  // PAGE 3: PRODUCT PLAN
  // =====================
  currentPage = addSection('📋', 'Product Manager Roadmap', project.productPlan || '', currentPage);

  // =====================
  // PAGE 4: BUDGET & SCOUT
  // =====================
  // Add budget section
  currentPage = addSection('💰', 'Financial Analysis (Accountant)', project.budget || '', currentPage);

  // Add market insights section on same page if space
  currentPage = addSection('🔍', 'Market Intelligence (Scout)', project.marketInsights || '', currentPage);

  // =====================
  // FOOTER ON ALL PAGES
  // =====================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(44, 27, 24, 100);
    doc.text(
      'DEEPCHOX © 2026 | Zero-Data, Privacy-First Business Intelligence',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Save PDF
  const pdfFileName = fileName || `DEEPCHOX_${project.name}_${Date.now()}.pdf`;
  doc.save(pdfFileName);
}

/**
 * React component wrapper for PDF generation
 */
export function ReportGeneratorButton({ project }: { project: Project }) {
  const handleDownload = () => {
    generatePDFReport({ project });
  };

  return (
    <button
      onClick={handleDownload}
      className="w-full px-4 py-3 rounded-card bg-[#0D9488] text-white font-semibold hover:bg-[#0F766E] transition-all"
    >
      📄 Download PDF Report
    </button>
  );
}
