import { NextRequest, NextResponse } from "next/server";
import dbConnect, { Candidate, Settings } from "@/lib/mongodb";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import { ShareFieldsSelection } from "@/app/dashboard/jobs/[id]/components/Dialogs/share-candidate-dialog";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

// Helper function to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  hex = hex.replace("#", "");

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return [r, g, b];
}

// Helper function to strip HTML tags and convert to plain text
function stripHTML(html: string): string {
  if (!html) return "";
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, " ");
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

// Helper function to parse HTML and extract structured content
function parseHTMLContent(html: string): {
  text: string;
  isBulletList: boolean;
  items: string[];
} {
  if (!html) return { text: "", isBulletList: false, items: [] };

  // Check if it's a list
  const hasUL = html.includes("<ul") || html.includes("<ol");
  if (hasUL) {
    const items: string[] = [];
    const liMatches = html.match(/<li[^>]*>(.*?)<\/li>/gi);
    if (liMatches) {
      liMatches.forEach((li) => {
        const text = stripHTML(li);
        if (text) items.push(text);
      });
    }
    return { text: "", isBulletList: true, items };
  }

  // Otherwise just strip HTML
  return { text: stripHTML(html), isBulletList: false, items: [] };
}

// Helper function to load image and convert to base64
async function loadImageAsBase64(
  imageUrl: string,
  baseUrl: string
): Promise<string | null> {
  try {
    console.log("Loading logo image from:", imageUrl);

    // Check if it's an API route or remote URL that needs to be fetched
    const needsFetch =
      imageUrl.startsWith("http") ||
      imageUrl.startsWith("/api/") ||
      imageUrl.includes("?pathName=");

    if (needsFetch) {
      // Handle remote URL or API route
      let fetchUrl = imageUrl;

      // If it's a relative URL, make it absolute
      if (imageUrl.startsWith("/")) {
        fetchUrl = `${baseUrl}${imageUrl}`;
      }

      console.log("Fetching logo from:", fetchUrl);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        console.error("Failed to fetch logo:", response.status);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      // Get mime type from response headers
      const contentType = response.headers.get("content-type") || "image/png";

      return `data:${contentType};base64,${base64}`;
    } else {
      // Handle local filesystem
      let filePath = imageUrl;
      if (filePath.startsWith("/")) {
        filePath = filePath.substring(1);
      }

      // Try multiple possible locations
      let absolutePath = path.join(process.cwd(), "public", filePath);

      if (!fs.existsSync(absolutePath)) {
        absolutePath = path.join(process.cwd(), filePath);
      }

      if (!fs.existsSync(absolutePath)) {
        console.error("Logo file not found at:", absolutePath);
        return null;
      }

      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(absolutePath);
      const base64 = fileBuffer.toString("base64");

      // Detect mime type based on extension
      const ext = path.extname(absolutePath).toLowerCase();
      let mimeType = "image/png";
      if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".gif") mimeType = "image/gif";
      else if (ext === ".svg") mimeType = "image/svg+xml";

      return `data:${mimeType};base64,${base64}`;
    }
  } catch (error) {
    console.error("Error loading logo image:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { candidateId, selection } = (await req.json()) as {
      candidateId: string;
      selection: ShareFieldsSelection;
    };

    if (!candidateId || !selection) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch candidate data
    const candidate = await Candidate.findById(candidateId)
      .populate("jobId", "title description skills")
      .populate("assignment.interviewerId", "name email")
      .populate("tags", "name color")
      .lean();

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Fetch organization settings for brand colors and logo
    const settings = await Settings.findOne({
      organizationId: candidate.organizationId,
    }).lean();

    const primaryColorHex = settings?.portalConfigs?.primaryColor || "#6366f1";
    const secondaryColorHex =
      settings?.portalConfigs?.secondaryColor || "#8b5cf6";
    const logoUrl = settings?.portalConfigs?.portalLogo?.url || null;

    // Generate PDF with modern design
    const doc = new jsPDF();
    let yPosition = 20;
    const leftMargin = 15;
    const rightMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - leftMargin - rightMargin;
    const contentWidth = pageWidth - leftMargin - rightMargin;

    // Modern color palette
    const primaryColor: [number, number, number] = hexToRgb(primaryColorHex);
    const secondaryColor: [number, number, number] =
      hexToRgb(secondaryColorHex);

    // Lighter version of primary color for accents (increase RGB values by 85%)
    const accentColor: [number, number, number] = [
      Math.min(255, primaryColor[0] + (255 - primaryColor[0]) * 0.85),
      Math.min(255, primaryColor[1] + (255 - primaryColor[1]) * 0.85),
      Math.min(255, primaryColor[2] + (255 - primaryColor[2]) * 0.85),
    ];

    // Very light background for sections (95% lighter)
    const lightBgColor: [number, number, number] = [
      Math.min(255, primaryColor[0] + (255 - primaryColor[0]) * 0.95),
      Math.min(255, primaryColor[1] + (255 - primaryColor[1]) * 0.95),
      Math.min(255, primaryColor[2] + (255 - primaryColor[2]) * 0.95),
    ];

    const textColor: [number, number, number] = [30, 41, 59]; // Dark slate
    const subtextColor: [number, number, number] = [100, 116, 139]; // Muted gray
    const borderColor: [number, number, number] = [226, 232, 240]; // Light border

    // Get base URL for API calls
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // Load logo if available
    let logoBase64: string | null = null;
    if (logoUrl) {
      logoBase64 = await loadImageAsBase64(logoUrl, baseUrl);
    }

    // Helper function to check if we need a new page
    const checkNewPage = (spaceNeeded: number = 30) => {
      // Leave 25px for footer to prevent text cutoff
      if (yPosition > pageHeight - spaceNeeded - 25) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    // Helper function to add text with word wrap
    const addText = (
      text: string,
      fontSize = 10,
      style: "normal" | "bold" | "italic" = "normal",
      color: [number, number, number] = textColor
    ) => {
      checkNewPage();
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);

      if (style === "bold") {
        doc.setFont("helvetica", "bold");
      } else if (style === "italic") {
        doc.setFont("helvetica", "italic");
      } else {
        doc.setFont("helvetica", "normal");
      }

      const lines = doc.splitTextToSize(text, maxLineWidth);
      doc.text(lines, leftMargin, yPosition);
      yPosition += lines.length * (fontSize * 0.5) + 3;
    };

    // Helper function to add a key-value pair with modern styling
    const addKeyValue = (key: string, value: string, indent: number = 0) => {
      checkNewPage(20);

      const xPos = leftMargin + indent;

      // Subtle accent dot - smaller and more muted
      doc.setFillColor(subtextColor[0], subtextColor[1], subtextColor[2]);
      doc.circle(xPos, yPosition - 1, 0.6, "F");

      // Key label - modern styling with better font and spacing
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(key.toUpperCase(), xPos + 3, yPosition);
      yPosition += 5;

      // Value - clean, readable
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      const valueLines = doc.splitTextToSize(value, maxLineWidth - indent - 3);
      doc.text(valueLines, xPos + 3, yPosition);
      yPosition += valueLines.length * 5 + 5;
    };

    // Helper function to add a bullet point with modern design
    const addBullet = (text: string) => {
      checkNewPage(10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      // Add subtle circular bullet - smaller and muted
      doc.setFillColor(subtextColor[0], subtextColor[1], subtextColor[2]);
      doc.circle(leftMargin + 2, yPosition - 1.5, 0.8, "F");

      // Add text with proper spacing
      const textLines = doc.splitTextToSize(text, maxLineWidth - 8);
      doc.text(textLines, leftMargin + 8, yPosition);
      yPosition += textLines.length * 5 + 1;
    };

    // Helper function to add section header with modern, compact design
    const addSectionHeader = (title: string) => {
      checkNewPage(15);
      yPosition += 4;

      // Title text - compact and bold
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(title.toUpperCase(), leftMargin, yPosition + 2);

      // Subtle underline
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.line(
        leftMargin,
        yPosition + 5,
        pageWidth - rightMargin,
        yPosition + 5
      );

      yPosition += 10;
    };

    // Add professional header (smaller height)
    const headerHeight = 30;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Add logo if available
    if (logoBase64) {
      try {
        // Get image properties to maintain aspect ratio
        const imgProps = doc.getImageProperties(logoBase64);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        const aspectRatio = imgWidth / imgHeight;

        // Max height in header (with some padding)
        const maxLogoHeight = 20;
        const maxLogoWidth = 35; // Max width to prevent too wide logos

        // Calculate dimensions maintaining aspect ratio
        let logoWidth = maxLogoHeight * aspectRatio;
        let logoHeight = maxLogoHeight;

        // If width exceeds max, recalculate based on width
        if (logoWidth > maxLogoWidth) {
          logoWidth = maxLogoWidth;
          logoHeight = maxLogoWidth / aspectRatio;
        }

        const logoX = pageWidth - rightMargin - logoWidth - 5; // Position from right with padding
        const logoY = (headerHeight - logoHeight) / 2; // Center vertically in header

        doc.addImage(logoBase64, "PNG", logoX, logoY, logoWidth, logoHeight);
      } catch (error) {
        console.error("Failed to add logo to PDF header:", error);
        // Continue without logo if there's an error
      }
    }

    // Candidate name
    if (selection.name) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(candidate.name, leftMargin, headerHeight / 2 + 5);
    }

    // Date stamp
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    const dateText = `Generated: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
    doc.text(dateText, leftMargin, headerHeight - 5);

    yPosition = headerHeight + 10;

    // Basic Information
    if (
      selection.name ||
      selection.email ||
      selection.phone ||
      selection.location
    ) {
      addSectionHeader("CONTACT INFORMATION");
      if (selection.email) addKeyValue("Email", candidate.email);
      if (selection.phone) addKeyValue("Phone", candidate.contact || "N/A");
      if (selection.location)
        addKeyValue("Location", candidate.location || "N/A");
      yPosition += 3;
    }

    // Professional Information
    if (
      selection.experience ||
      selection.relevantExperience ||
      selection.skills ||
      selection.currentCTC ||
      selection.expectedCTC ||
      selection.noticePeriod
    ) {
      addSectionHeader("PROFESSIONAL SUMMARY");
      if (selection.experience)
        addKeyValue("Total Experience", `${candidate.experience} years`);
      if (selection.relevantExperience)
        addKeyValue(
          "Relevant Experience",
          `${candidate.relevantExperience} years`
        );
      if (selection.currentCTC && candidate.currentCTC)
        addKeyValue(
          "Current CTC",
          `₹ ${candidate.currentCTC.toLocaleString()}`
        );
      if (selection.expectedCTC && candidate.expectedCTC)
        addKeyValue(
          "Expected CTC",
          `₹ ${candidate.expectedCTC.toLocaleString()}`
        );
      if (selection.noticePeriod)
        addKeyValue("Notice Period", `${candidate.noticePeriod} days`);

      if (selection.skills && candidate.skills?.length > 0) {
        yPosition += 3;
        checkNewPage(20);

        // Modern label styling
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(subtextColor[0], subtextColor[1], subtextColor[2]);
        doc.text("SKILLS", leftMargin, yPosition);
        yPosition += 6;

        // Display skills as modern tags
        const skillsPerRow = 4;
        const skillWidth = (maxLineWidth - 10) / skillsPerRow;
        let currentX = leftMargin;
        let skillsInRow = 0;

        candidate.skills.forEach((skill) => {
          if (skillsInRow >= skillsPerRow) {
            currentX = leftMargin;
            yPosition += 10;
            skillsInRow = 0;
            checkNewPage(15);
          }

          // Draw modern skill tag with subtle styling
          doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
          doc.roundedRect(
            currentX,
            yPosition - 5,
            skillWidth - 3,
            8,
            2,
            2,
            "F"
          );

          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          const skillText =
            skill.length > 18 ? skill.substring(0, 16) + "..." : skill;
          doc.text(skillText, currentX + 2, yPosition);

          currentX += skillWidth;
          skillsInRow++;
        });

        yPosition += 8;
      }
      yPosition += 3;
    }

    // AI Evaluation
    if (
      candidate.scores &&
      (selection.overallScore ||
        selection.experienceScore ||
        selection.skillsScore ||
        selection.strengths ||
        selection.areasForImprovement ||
        selection.recommendation ||
        selection.notes)
    ) {
      addSectionHeader("AI EVALUATION");

      // Scores in a table
      if (
        selection.overallScore ||
        selection.experienceScore ||
        selection.skillsScore
      ) {
        const scoreData: any[] = [];
        if (selection.overallScore)
          scoreData.push(["Overall Match", `${candidate.scores.overall}/10`]);
        if (selection.experienceScore && candidate.scores.experience)
          scoreData.push([
            "Experience Match",
            `${candidate.scores.experience}/10`,
          ]);
        if (selection.skillsScore && candidate.scores.skills)
          scoreData.push(["Skills Match", `${candidate.scores.skills}/10`]);

        if (scoreData.length > 0) {
          checkNewPage(20 + scoreData.length * 8);
          autoTable(doc, {
            startY: yPosition,
            head: [["Evaluation Criteria", "Score"]],
            body: scoreData,
            margin: { left: leftMargin, right: rightMargin },
            headStyles: {
              fillColor: lightBgColor,
              fontSize: 9,
              font: "helvetica",
              fontStyle: "bold",
              textColor: primaryColor,
            },
            bodyStyles: {
              fontSize: 10,
              textColor: textColor,
            },
            alternateRowStyles: {
              fillColor: [249, 250, 251],
            },
            theme: "plain",
            styles: {
              lineColor: borderColor,
              lineWidth: 0.5,
            },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 8;
        }
      }

      if (selection.strengths && candidate.scores.strengths?.length > 0) {
        checkNewPage(15);
        // Modern subsection label
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(subtextColor[0], subtextColor[1], subtextColor[2]);
        doc.text("KEY STRENGTHS", leftMargin, yPosition);
        yPosition += 6;

        candidate.scores.strengths.forEach((strength: string) => {
          addBullet(strength);
        });
        yPosition += 2;
      }

      if (
        selection.areasForImprovement &&
        candidate.scores.areas_for_improvement?.length > 0
      ) {
        checkNewPage(15);
        // Modern subsection label
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(subtextColor[0], subtextColor[1], subtextColor[2]);
        doc.text("AREAS FOR DEVELOPMENT", leftMargin, yPosition);
        yPosition += 6;

        candidate.scores.areas_for_improvement.forEach((area: string) => {
          addBullet(area);
        });
        yPosition += 2;
      }

      if (selection.recommendation && candidate.scores.recommendation) {
        addKeyValue("Recommendation", candidate.scores.recommendation);
      }

      if (selection.notes && candidate.scores.notes) {
        addKeyValue("AI Notes", candidate.scores.notes);
      }
      yPosition += 3;
    }

    // Job & Status
    if (selection.jobDetails || selection.status) {
      addSectionHeader("JOB DETAILS");

      if (selection.jobDetails && candidate.jobId) {
        addKeyValue("Position", (candidate.jobId as any).title);

        if ((candidate.jobId as any).description) {
          yPosition += 3;
          // Modern subsection label
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(subtextColor[0], subtextColor[1], subtextColor[2]);
          doc.text("JOB DESCRIPTION", leftMargin, yPosition);
          yPosition += 6;

          // Parse HTML description
          const parsed = parseHTMLContent((candidate.jobId as any).description);

          if (parsed.isBulletList && parsed.items.length > 0) {
            parsed.items.forEach((item) => {
              addBullet(item);
            });
          } else if (parsed.text) {
            addText(parsed.text, 10, "normal");
          }
        }

        if ((candidate.jobId as any).skills?.length > 0) {
          addKeyValue(
            "Required Skills",
            (candidate.jobId as any).skills.join(", ")
          );
        }
      }

      if (selection.status) {
        addKeyValue("Application Status", candidate.status.toUpperCase());
      }
      yPosition += 3;
    }

    // Assignment - only show if there's actual interview data
    if (selection.assignment && candidate.assignment) {
      const hasInterviewData =
        (typeof candidate.assignment.interviewerId === "object" &&
          candidate.assignment.interviewerId) ||
        candidate.assignment.time ||
        candidate.assignment.googleMeet?.meetingLink;

      if (hasInterviewData) {
        addSectionHeader("INTERVIEW DETAILS");

        if (typeof candidate.assignment.interviewerId === "object") {
          addKeyValue(
            "Interviewer",
            (candidate.assignment.interviewerId as any).name
          );
          addKeyValue(
            "Interviewer Email",
            (candidate.assignment.interviewerId as any).email
          );
        }

        if (candidate.assignment.time) {
          const interviewDate = new Date(candidate.assignment.time);
          addKeyValue(
            "Interview Scheduled",
            interviewDate.toLocaleString("en-US", {
              dateStyle: "full",
              timeStyle: "short",
            })
          );
        }

        if (candidate.assignment.googleMeet?.meetingLink) {
          addKeyValue(
            "Meeting Link",
            candidate.assignment.googleMeet.meetingLink
          );
        }
        yPosition += 3;
      }
    }

    // Follow-up - only show if there's actual data
    if (selection.followUp && candidate.followUp) {
      const hasFollowUpData =
        candidate.followUp.note ||
        candidate.followUp.date ||
        (candidate.followUp.userId &&
          typeof candidate.followUp.userId === "object" &&
          (candidate.followUp.userId as any).name);

      if (hasFollowUpData) {
        addSectionHeader("FOLLOW-UP");

        if (candidate.followUp.note) {
          addKeyValue("Notes", candidate.followUp.note);
        }

        if (candidate.followUp.date) {
          const followUpDate = new Date(candidate.followUp.date);
          addKeyValue(
            "Follow-up Date",
            followUpDate.toLocaleDateString("en-US", { dateStyle: "full" })
          );
        }

        if (
          candidate.followUp.userId &&
          typeof candidate.followUp.userId === "object" &&
          (candidate.followUp.userId as any).name
        ) {
          addKeyValue("Added By", (candidate.followUp.userId as any).name);
        }
        yPosition += 3;
      }
    }

    // Tags - only show if there are valid tag names
    if (selection.tags && candidate.tags?.length > 0) {
      const tagNames = candidate.tags
        .map((tag: any) => tag?.name)
        .filter((name: string) => name && name.trim())
        .join(", ");

      if (tagNames) {
        addSectionHeader("TAGS");
        addText(tagNames, 10, "normal");
        yPosition += 3;
      }
    }

    // Custom Fields - only show if there are valid fields with values
    if (selection.customFields && candidate.customFields) {
      const validFields = Object.entries(candidate.customFields).filter(
        ([key, value]) => {
          if (value === null || value === undefined || value === "")
            return false;
          if (Array.isArray(value) && value.length === 0) return false;
          if (typeof value === "object" && Object.keys(value).length === 0)
            return false;
          return true;
        }
      );

      if (validFields.length > 0) {
        addSectionHeader("ADDITIONAL INFORMATION");

        validFields.forEach(([key, value]) => {
          const displayValue =
            typeof value === "object" ? JSON.stringify(value) : String(value);
          addKeyValue(key, displayValue);
        });
        yPosition += 3;
      }
    }

    // Modern footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Subtle footer line with border color
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.line(
        leftMargin,
        pageHeight - 15,
        pageWidth - rightMargin,
        pageHeight - 15
      );

      // Page numbers with modern styling
      doc.setFontSize(8);
      doc.setTextColor(subtextColor[0], subtextColor[1], subtextColor[2]);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });

      // Subtle branding
      doc.text(
        "Generated by HireTrack",
        pageWidth - rightMargin,
        pageHeight - 10,
        { align: "right" }
      );
    }

    // Get the generated PDF as array buffer
    let finalPdfBytes: Uint8Array;

    if (selection.resume && candidate.resume?.url) {
      try {
        console.log("Attempting to merge CV from:", candidate.resume.url);

        let cvArrayBuffer: ArrayBuffer;

        // Check if it's an API route or remote URL that needs to be fetched
        const needsFetch =
          candidate.resume.url.startsWith("http") ||
          candidate.resume.url.startsWith("/api/") ||
          candidate.resume.url.includes("?pathName=");

        if (needsFetch) {
          // Handle remote URL or API route
          let fetchUrl = candidate.resume.url;

          // If it's a relative URL, make it absolute
          if (candidate.resume.url.startsWith("/")) {
            fetchUrl = `${baseUrl}${candidate.resume.url}`;
          }

          console.log(
            "CV is a remote URL or API route, fetching from:",
            fetchUrl
          );
          const cvResponse = await fetch(fetchUrl);
          if (!cvResponse.ok) {
            console.error(
              "Failed to fetch CV:",
              cvResponse.status,
              cvResponse.statusText
            );
            throw new Error(`Failed to fetch CV: ${cvResponse.status}`);
          }

          cvArrayBuffer = await cvResponse.arrayBuffer();
          console.log(
            "CV fetched successfully, size:",
            cvArrayBuffer.byteLength
          );
        } else {
          // Handle local file from filesystem
          console.log("CV is a local file, reading from filesystem");

          // Convert relative path to absolute path
          let filePath = candidate.resume.url;
          if (filePath.startsWith("/")) {
            filePath = filePath.substring(1);
          }

          // Try multiple possible locations
          let absolutePath = path.join(process.cwd(), "public", filePath);

          // If not found in public, try root uploads
          if (!fs.existsSync(absolutePath)) {
            absolutePath = path.join(process.cwd(), filePath);
          }

          // If still not found, try without any prefix
          if (!fs.existsSync(absolutePath) && filePath.includes("/")) {
            absolutePath = path.join(
              process.cwd(),
              "uploads",
              filePath.split("/").pop() || ""
            );
          }

          console.log("Reading CV from:", absolutePath);

          if (!fs.existsSync(absolutePath)) {
            console.error("CV file not found. Tried paths:");
            console.error("  -", path.join(process.cwd(), "public", filePath));
            console.error("  -", path.join(process.cwd(), filePath));
            throw new Error(`CV file not found at any expected location`);
          }

          // Read file directly from filesystem
          const fileBuffer = fs.readFileSync(absolutePath);
          cvArrayBuffer = fileBuffer.buffer.slice(
            fileBuffer.byteOffset,
            fileBuffer.byteOffset + fileBuffer.byteLength
          );
          console.log(
            "CV read from filesystem, size:",
            cvArrayBuffer.byteLength
          );
        }

        // Convert jsPDF to bytes
        const profilePdfBytes = doc.output("arraybuffer");
        console.log("Profile PDF size:", profilePdfBytes.byteLength);

        // Merge PDFs using pdf-lib
        console.log("Loading PDFs for merging...");
        const profilePdf = await PDFDocument.load(profilePdfBytes);
        const cvPdf = await PDFDocument.load(cvArrayBuffer);

        console.log("Profile pages:", profilePdf.getPageCount());
        console.log("CV pages:", cvPdf.getPageCount());

        // Create new PDF and copy pages
        console.log("Creating merged PDF...");
        const mergedPdf = await PDFDocument.create();

        // Copy profile pages
        const profilePages = await mergedPdf.copyPages(
          profilePdf,
          profilePdf.getPageIndices()
        );
        profilePages.forEach((page) => mergedPdf.addPage(page));
        console.log("Profile pages copied");

        // Copy CV pages
        const cvPages = await mergedPdf.copyPages(
          cvPdf,
          cvPdf.getPageIndices()
        );
        cvPages.forEach((page) => mergedPdf.addPage(page));
        console.log("CV pages copied");

        console.log("Total merged PDF pages:", mergedPdf.getPageCount());

        // Get final PDF bytes
        finalPdfBytes = await mergedPdf.save();
        console.log(
          "✅ CV successfully merged! Final PDF size:",
          finalPdfBytes.length
        );
      } catch (error) {
        console.error("❌ Error merging CV:", error);
        console.error(
          "Error details:",
          error instanceof Error ? error.message : String(error)
        );
        console.error("Stack:", error instanceof Error ? error.stack : "N/A");

        // If merging fails, return profile PDF only
        console.log("Falling back to profile PDF only");
        finalPdfBytes = new Uint8Array(doc.output("arraybuffer"));
      }
    } else {
      console.log("No CV selected or CV URL not available");
      finalPdfBytes = new Uint8Array(doc.output("arraybuffer"));
    }

    // Return PDF
    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${candidate.name.replace(
          /\s+/g,
          "_"
        )}_Profile.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
