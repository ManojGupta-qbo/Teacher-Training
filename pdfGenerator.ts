import { jsPDF } from "jspdf";
import { TeacherProfile, ChatMessage, WellBeingTopic } from "../types";

/**
 * Utility to generate a high-fidelity, beautifully styled PDF Journal of the teacher's session.
 * Handles page flow, word wrapping, multi-page indexing, and professional aesthetics.
 */
export const generateWellBeingPDF = (
  profile: TeacherProfile,
  messages: ChatMessage[],
  selectedHacks: WellBeingTopic[],
  language: string
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  let pageNum = 1;

  // Professional Slate & Teal Color Palette
  const tealColor = [0, 126, 138]; // #007E8A
  const slateColor = [28, 49, 68]; // #1C3144
  const lightBgColor = [248, 250, 252]; // #F8FAFC
  const textColor = [51, 65, 85]; // Slate-700
  const boldTextColor = [15, 23, 42]; // Slate-900

  let y = 20;

  // Helper to draw a modern, clean header on each page (except first page which has a prominent cover header)
  const drawPageHeader = () => {
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.line(margin, 12, pageWidth - margin, 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("SHIKSAK SATHI (WELL-BEING COMPANION JOURNAL)", margin, 9);
    
    doc.setFont("helvetica", "normal");
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(today, pageWidth - margin - 35, 9);
  };

  // Helper to draw footer with page numbers
  const drawPageFooter = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFont("helvetica", "oblique");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Labhya Foundation Socio-Emotional Learning Program", margin, pageHeight - 10);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 10);
  };

  const checkPageOverflow = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      drawPageFooter();
      doc.addPage();
      pageNum++;
      y = 20;
      drawPageHeader();
    }
  };

  // 1. Cover / Top Banner Page Header
  // Top thick colored banner block
  doc.setFillColor(slateColor[0], slateColor[1], slateColor[2]);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Title in the header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(254, 215, 102); // #FED766 Accent Gold
  doc.text("SHIKSAK SATHI JOURNAL", margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("National Initiative for Educators Socio-Emotional Learning Support", margin, 25);

  doc.setFont("helvetica", "oblique");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text("Generated in partnership with Labhya Foundation", margin, 32);

  y = 52;

  // 2. Teacher Profile Section
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, 42, "FD");

  // Profile Header Title inside block
  doc.setFillColor(tealColor[0], tealColor[1], tealColor[2]);
  doc.rect(margin + 0.1, y + 0.1, contentWidth - 0.2, 7, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("EDUCATOR ACTIVE PROFILE", margin + 4, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9.5);

  // Profile Elements
  let labelX = margin + 5;
  let valX = margin + 45;
  let rowHeight = 6.2;
  let py = y + 14;

  const profileRows = [
    { label: "Educator Full Name:", val: profile.name || "Guest Teacher Saathi" },
    { label: "Teaching Segment / Class:", val: profile.gradeClass || "Not Specified" },
    { label: "Professional Experience:", val: profile.experience || "Not Specified" },
    { label: "Demographic State / Region:", val: profile.region || "Delhi NCR" },
    { label: "Administrative Contacts:", val: [profile.phone, profile.email].filter(Boolean).join(" / ") || "Not Shared" }
  ];

  profileRows.forEach((row) => {
    doc.setFont("helvetica", "bold");
    doc.text(row.label, labelX, py);
    doc.setFont("helvetica", "normal");
    doc.text(row.val, valX, py);
    py += rowHeight;
  });

  y = 104;

  // 3. Wellness Hacks Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(tealColor[0], tealColor[1], tealColor[2]);
  doc.text("CLASSROOM WELL-BEING ACTION ROUTINES", margin, y);
  
  doc.setDrawColor(tealColor[0], tealColor[1], tealColor[2]);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 2, margin + 40, y + 2);

  y += 8;

  if (selectedHacks.length === 0) {
    // If no hacks explicitly checked, write a small disclaimer
    doc.setFont("helvetica", "oblique");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("No specific well-being topics were checked. The standard default recommendations are listed below.", margin, y);
    y += 8;
  }

  // Iterate over selected or default well-being hacks
  selectedHacks.forEach((hack) => {
    // Check space required for title + description
    checkPageOverflow(50);

    // Topic heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(boldTextColor[0], boldTextColor[1], boldTextColor[2]);
    doc.text(`${hack.emoji} ${hack.englishTitle}`, margin, y);
    y += 5;

    // Action Routine box
    const boxMargin = margin + 2;
    const boxWidth = contentWidth - 4;
    
    // Split texts to calculate height
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const hackLines = doc.splitTextToSize(`Action Hack Routine: ${hack.teacherHack}`, boxWidth - 6);
    const insightLines = doc.splitTextToSize(`Neuro-Pedagogical Insight: ${hack.insight}`, boxWidth - 6);
    
    const hackHeight = hackLines.length * 4.5;
    const insightHeight = insightLines.length * 4.5;
    const boxHeight = hackHeight + insightHeight + 14;

    checkPageOverflow(boxHeight + 10);

    // Draw background outline for hack card
    doc.setFillColor(241, 245, 249); // light grey slate-100
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(boxMargin, y, boxWidth, boxHeight, "FD");

    // Inside left accent line (teal border representation)
    doc.setDrawColor(tealColor[0], tealColor[1], tealColor[2]);
    doc.setLineWidth(1.2);
    doc.line(boxMargin + 0.6, y + 0.6, boxMargin + 0.6, y + boxHeight - 0.6);

    let innerY = y + 5;

    // Print elements inside hack card
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(tealColor[0], tealColor[1], tealColor[2]);
    doc.text("CLASSROOM PRACTICAL ROUTINE", boxMargin + 4, innerY);
    innerY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(hackLines, boxMargin + 4, innerY);
    innerY += hackHeight + 3;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
    doc.text("NEURO-PEDAGOGICAL INSIGHT", boxMargin + 4, innerY);
    innerY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(insightLines, boxMargin + 4, innerY);

    y += boxHeight + 4;

    // Sources and citations
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Bibliographical Sources:", margin + 2, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    hack.sources.forEach((src) => {
      const srcLines = doc.splitTextToSize(`• ${src}`, contentWidth - 4);
      checkPageOverflow(srcLines.length * 3.5 + 4);
      doc.text(srcLines, margin + 4, y);
      y += (srcLines.length * 3.5) + 0.5;
    });

    y += 5;
  });

  // 4. Mentorial Dialogue History
  checkPageOverflow(30);
  y += 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(tealColor[0], tealColor[1], tealColor[2]);
  doc.text("AI MENTORIAL DIALOGUE RECORDS", margin, y);
  
  doc.setDrawColor(tealColor[0], tealColor[1], tealColor[2]);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 2, margin + 40, y + 2);

  y += 8;

  const chatMessagesToExport = messages.filter(
    (m) => m.sender === "user" || m.sender === "bot"
  );

  if (chatMessagesToExport.length === 0) {
    doc.setFont("helvetica", "oblique");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("No active dialogue conversation was registered in this session.", margin, y);
    y += 8;
  } else {
    chatMessagesToExport.forEach((msg) => {
      const speakerLabel = msg.sender === "user" ? "TEACHER" : "AI WELLNESS EXPERT";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(msg.sender === "user" ? slateColor[0] : tealColor[0], msg.sender === "user" ? slateColor[1] : tealColor[1], msg.sender === "user" ? slateColor[2] : tealColor[2]);
      
      const headerLine = `${speakerLabel} (${msg.timestamp})`;
      checkPageOverflow(12);
      doc.text(headerLine, margin, y);
      y += 4.5;

      // Clean the text from emojis and non UTF-8 compatible chars if any to prevent empty blocks inside standard pdf font
      const sanitizedText = msg.text
        .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "") // remove emoji unicode ranges
        .trim();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      
      const textLines = doc.splitTextToSize(sanitizedText || "(Action and emotion signals logged)", contentWidth - 4);
      const textHeight = textLines.length * 4.2;

      checkPageOverflow(textHeight + 8);
      doc.setDrawColor(241, 245, 249);
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, contentWidth, textHeight + 2, "FD");

      // Left bracket boundary line to group statement
      doc.setDrawColor(msg.sender === "user" ? slateColor[0] : tealColor[0], msg.sender === "user" ? slateColor[1] : tealColor[1], msg.sender === "user" ? slateColor[2] : tealColor[2]);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin, y + textHeight + 2);

      doc.text(textLines, margin + 4, y + 4);
      y += textHeight + 6;
    });
  }

  // Draw final page footer
  drawPageFooter();

  // Save/Download operation
  const cleanedFileName = `${profile.name ? profile.name.replace(/\s+/g, "_") : "Teacher"}_WellBeing_Journal.pdf`;
  doc.save(cleanedFileName);
  return cleanedFileName;
};
