import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FactorBreakdown {
    raw: number;
    weighted: number;
    weight: number;
    contribution: string;
}

interface CriticalIssue {
    id: string;
    title: string;
    explanation: string;
    score: number;
    rank: number;
    category: string;
    region: string;
}

interface DelayedCommitment {
    id: string;
    title: string;
    department: string;
    daysPending: number;
    status: string;
}

interface EscalationRisk {
    id: string;
    title: string;
    escalationRisk: number;
}

interface SummaryPoint {
    title: string;
    content: string;
}

interface BriefData {
    topCriticalIssues: CriticalIssue[];
    mostDelayedCommitments: DelayedCommitment[];
    highEscalationRisks: EscalationRisk[];
    executiveSummary: SummaryPoint[];
    healthScore?: number; // Optional if we want to pass it
}

export const generateBriefPDF = (data: BriefData, healthScore: number | string = "N/A") => {
    // 1. Initialize Document
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // 2. Add Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("EXECUTIVE INTELLIGENCE BRIEF", margin, 30);

    // Confidential stamp (Moved down slightly to avoid overlap on narrow screens)
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text("CONFIDENTIAL - RESTRICTED ACCESS", pageWidth - margin - 65, 22);

    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    const dateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    doc.text(`Generated: ${dateStr}`, margin, 40);

    // Health Score
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Governance Health Score: ${healthScore}/100`, margin, 50);

    // Draw separator line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, 55, pageWidth - margin, 55);

    let currentY = 65;

    // 3. Executive Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("EXECUTIVE SUMMARY", margin, currentY);
    currentY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-700

    // Standardize unicode characters that jsPDF helvetica struggles with
    const cleanText = (str: string) => {
        if (!str) return "";
        return str
            .replace(/[^\x20-\x7E]/g, '') // Strip aggressive non-ASCII characters that break standard fonts
            .replace(/ +(?= )/g, '');     // Remove extra spaces
    };

    // Auto-wrap and style bullet points
    if (data.executiveSummary && Array.isArray(data.executiveSummary)) {
        data.executiveSummary.forEach(point => {
            // Draw Bold Title Inline
            doc.setFont("helvetica", "bold");
            const title = cleanText(`${point.title}: `);
            doc.text(title, margin, currentY);

            const titleWidth = doc.getTextWidth(title);

            // Draw content
            doc.setFont("helvetica", "normal");
            const content = cleanText(point.content);

            // The first line starts after the title, subsequent lines wrap to the margin
            const wrapWidth = pageWidth - (margin * 2);
            let contentLines = doc.splitTextToSize(content, wrapWidth - titleWidth);

            // First line prints inline with title
            doc.text(contentLines[0], margin + titleWidth, currentY);

            // Subsequent lines print normally
            if (contentLines.length > 1) {
                const remainingLines = contentLines.slice(1);
                // Re-wrap remaining text at full width
                const fullWrapLines = doc.splitTextToSize(remainingLines.join(' '), wrapWidth);
                doc.text(fullWrapLines, margin, currentY + 5);
                currentY += (fullWrapLines.length * 5) + 8; // add space for remaining lines
            } else {
                currentY += 8; // standard spacing if only 1 line
            }
        });
        currentY += 4; // Add extra padding after the whole summary section
    } else {
        doc.text("No summary available.", margin, currentY);
        currentY += 12;
    }

    // 4. Top Critical Issues
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("TOP CRITICAL ISSUES", margin, currentY);
    currentY += 6;

    if (data.topCriticalIssues && data.topCriticalIssues.length > 0) {
        const issuesTableData = data.topCriticalIssues.map(issue => [
            issue.rank ? `#${issue.rank}` : "-",
            cleanText(issue.title),
            issue.score || "-",
            cleanText(issue.explanation)
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Rank', 'Issue', 'AI Score', 'Explanation']],
            body: issuesTableData,
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 9 }, // slate-50
            bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' }, // Rank
                1: { cellWidth: 50, fontStyle: 'bold' }, // Title
                2: { cellWidth: 20, halign: 'center', textColor: [220, 38, 38], fontStyle: 'bold' }, // Score (red text)
                3: { cellWidth: 'auto' } // Explanation
            },
            margin: { left: margin, right: margin }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text("No critical issues on record.", margin, currentY);
        currentY += 15;
    }

    // Check pagination before next section
    if (currentY > 230) {
        doc.addPage();
        currentY = margin;
    }

    // 5. Most Delayed Commitments
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("MOST DELAYED COMMITMENTS", margin, currentY);
    currentY += 6;

    if (data.mostDelayedCommitments && data.mostDelayedCommitments.length > 0) {
        const commitmentsTableData = data.mostDelayedCommitments.map(c => [
            cleanText(c.title),
            cleanText(c.department || c.status || "-"),
            `${c.daysPending} days`
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Commitment', 'Department / Status', 'Delay Duration']],
            body: commitmentsTableData,
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
            columnStyles: {
                0: { cellWidth: 80, fontStyle: 'bold' },
                1: { cellWidth: 50 },
                2: { cellWidth: 'auto', halign: 'center', textColor: [217, 119, 6], fontStyle: 'bold' } // amber-600
            },
            margin: { left: margin, right: margin }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text("No delayed commitments on record.", margin, currentY);
        currentY += 15;
    }

    // Check pagination before next section
    if (currentY > 230) {
        doc.addPage();
        currentY = margin;
    }

    // 6. Escalation Risks
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("HIGH ESCALATION RISKS", margin, currentY);
    currentY += 6;

    if (data.highEscalationRisks && data.highEscalationRisks.length > 0) {
        const riskTableData = data.highEscalationRisks.map(r => [
            cleanText(r.title),
            `${r.escalationRisk}/10`
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Risk Area', 'Escalation Probability']],
            body: riskTableData,
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
            columnStyles: {
                0: { cellWidth: 130, fontStyle: 'bold' },
                1: { cellWidth: 'auto', halign: 'center', textColor: [220, 38, 38], fontStyle: 'bold' } // red-600
            },
            margin: { left: margin, right: margin }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text("No high escalation risks detected.", margin, currentY);
        currentY += 15;
    }

    // 7. Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400

        doc.line(margin, doc.internal.pageSize.getHeight() - 15, pageWidth - margin, doc.internal.pageSize.getHeight() - 15);

        doc.text(
            `Generated by AI Governance Priority Engine • Page ${i} of ${pageCount}`,
            margin,
            doc.internal.pageSize.getHeight() - 10
        );
        doc.text(
            dateStr,
            pageWidth - margin - 15,
            doc.internal.pageSize.getHeight() - 10
        );
    }

    // 8. Save Document
    doc.save(`Executive_Brief_${new Date().toISOString().split("T")[0]}.pdf`);
};
