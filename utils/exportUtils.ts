import { jsPDF } from 'jspdf';
import { NoteItem, QuizQuestion, ChatMessage } from '../types';

export type ExportContentType = 'notes' | 'quiz' | 'summary' | 'homework' | 'tutor';

export interface ExportMetadata {
  title?: string;
  subject?: string;
  grade?: string;
  chapter?: string;
  date?: number;
  score?: string;
  query?: string;
}

// Escapes CSV cell value (wraps in quotes and doubles inner quotes)
const escapeCSV = (val: string): string => {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

// Formats a date timestamp cleanly
const formatDate = (ts?: number): string => {
  return new Date(ts || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'i': 'ⁱ'
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', 'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'h': 'ₕ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'p': 'ₚ', 's': 'ₛ', 't': 'ₜ'
};

export const toUnicodeSuperscript = (str: string): string => {
  return str.split('').map(char => SUPERSCRIPT_MAP[char] || char).join('');
};

export const toUnicodeSubscript = (str: string): string => {
  return str.split('').map(char => SUBSCRIPT_MAP[char] || char).join('');
};

export const formatLaTeXToUnicode = (text: string): string => {
  if (!text) return '';
  let processed = text;

  // 1. Triple superscript/subscript with \text{...}
  processed = processed.replace(/\^\{([^}]+)\}_\{([^}]+)\}\\text\{([^}]+)\}/g, (_, sup, sub, txt) => {
    return toUnicodeSuperscript(sup) + toUnicodeSubscript(sub) + txt;
  });
  processed = processed.replace(/\^\{([^}]+)\}_\{([^}]+)\}([A-Za-z])/g, (_, sup, sub, char) => {
    return toUnicodeSuperscript(sup) + toUnicodeSubscript(sub) + char;
  });

  processed = processed.replace(/_\{([^}]+)\}\^\{([^}]+)\}\\text\{([^}]+)\}/g, (_, sub, sup, txt) => {
    return toUnicodeSubscript(sub) + toUnicodeSuperscript(sup) + txt;
  });
  processed = processed.replace(/_\{([^}]+)\}\^\{([^}]+)\}([A-Za-z])/g, (_, sub, sup, char) => {
    return toUnicodeSubscript(sub) + toUnicodeSuperscript(sup) + char;
  });

  // 2. Simple superscript/subscript with curly braces
  processed = processed.replace(/\^\{([^}]+)\}/g, (_, sup) => toUnicodeSuperscript(sup));
  processed = processed.replace(/_\{([^}]+)\}/g, (_, sub) => toUnicodeSubscript(sub));

  // 3. Simple single-char superscript/subscript
  processed = processed.replace(/([A-Za-z0-9])\^([0-9a-zA-Z+-])/g, (_, char, sup) => char + toUnicodeSuperscript(sup));
  processed = processed.replace(/([A-Za-z0-9])_([0-9a-zA-Z+-])/g, (_, char, sub) => char + toUnicodeSubscript(sub));

  // 4. Clean up remaining \text{} and $ signs
  processed = processed.replace(/\\text\{([^}]+)\}/g, '$1');
  processed = processed.replace(/\$([^$]+)\$/g, '$1');

  return processed;
};

export const formatLaTeX = (text: string): string => {
  if (!text) return '';
  let processed = text;
  
  // 1. Double superscript/subscript with \text{...} or letters
  processed = processed.replace(/\^\{([^}]+)\}_\{([^}]+)\}\\text\{([^}]+)\}/g, '<sup>$1</sup><sub>$2</sub>$3');
  processed = processed.replace(/\^\{([^}]+)\}_\{([^}]+)\}([A-Za-z])/g, '<sup>$1</sup><sub>$2</sub>$3');
  
  processed = processed.replace(/_\{([^}]+)\}\^\{([^}]+)\}\\text\{([^}]+)\}/g, '<sub>$1</sub><sup>$2</sup>$3');
  processed = processed.replace(/_\{([^}]+)\}\^\{([^}]+)\}([A-Za-z])/g, '<sub>$1</sub><sup>$2</sup>$3');

  // 2. Simple superscript/subscript with curly braces
  processed = processed.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
  processed = processed.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');

  // 3. Simple superscript/subscript single characters
  processed = processed.replace(/([A-Za-z0-9])\^([0-9a-zA-Z+-])/g, '$1<sup>$2</sup>');
  processed = processed.replace(/([A-Za-z0-9])_([0-9a-zA-Z+-])/g, '$1<sub>$2</sub>');

  // 4. Remove \text{...} wrappers
  processed = processed.replace(/\\text\{([^}]+)\}/g, '$1');

  // 5. Remove math block / inline dollar signs
  processed = processed.replace(/\$([^$]+)\$/g, '$1');

  return processed;
};

export const markdownToHtml = (md: string): string => {
  if (!md) return '';
  
  // Format LaTeX in the markdown to HTML!
  const html = formatLaTeX(md);

  // Split into lines
  const lines = html.split('\n');
  let inList = false;
  let inOrderedList = false;
  let inBlockquote = false;
  const resultLines: string[] = [];

  const closePendingTags = () => {
    if (inList) {
      resultLines.push('</ul>');
      inList = false;
    }
    if (inOrderedList) {
      resultLines.push('</ol>');
      inOrderedList = false;
    }
    if (inBlockquote) {
      resultLines.push('</blockquote>');
      inBlockquote = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line === '') {
      closePendingTags();
      resultLines.push('<br/>');
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      closePendingTags();
      resultLines.push(`<h1 class="text-2xl font-black text-slate-900 mt-6 mb-3 border-b pb-2 border-slate-100">${line.substring(2)}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closePendingTags();
      resultLines.push(`<h2 class="text-xl font-bold text-primary-600 mt-5 mb-2">${line.substring(3)}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      closePendingTags();
      resultLines.push(`<h3 class="text-lg font-bold text-slate-800 mt-4 mb-2">${line.substring(4)}</h3>`);
      continue;
    }

    // Horizontal Rule
    if (line === '---' || line === '***' || line === '___') {
      closePendingTags();
      resultLines.push('<hr class="my-6 border-slate-200" />');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      if (!inBlockquote) {
        closePendingTags();
        resultLines.push('<blockquote class="border-l-4 border-primary-500 bg-slate-50 p-4 italic text-slate-600 my-4 rounded-r-lg">');
        inBlockquote = true;
      }
      const content = line.substring(2)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-rose-600 rounded text-xs">$1</code>');
      resultLines.push(`<p class="my-1">${content}</p>`);
      continue;
    }

    // Unordered List Items
    const listMatch = line.match(/^([*-])\s+(.*)/);
    if (listMatch) {
      if (!inList) {
        closePendingTags();
        resultLines.push('<ul class="list-disc pl-6 space-y-1.5 my-3 text-slate-700">');
        inList = true;
      }
      const content = listMatch[2]
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-rose-600 rounded text-xs">$1</code>');
      resultLines.push(`<li>${content}</li>`);
      continue;
    }

    // Ordered List Items
    const oListMatch = line.match(/^([0-9]+)\.\s+(.*)/);
    if (oListMatch) {
      if (!inOrderedList) {
        closePendingTags();
        resultLines.push('<ol class="list-decimal pl-6 space-y-1.5 my-3 text-slate-700">');
        inOrderedList = true;
      }
      const content = oListMatch[2]
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-rose-600 rounded text-xs">$1</code>');
      resultLines.push(`<li>${content}</li>`);
      continue;
    }

    // Normal paragraph line
    closePendingTags();
    
    const formattedLine = line
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-rose-600 rounded text-xs">$1</code>');

    resultLines.push(`<p class="my-2 text-slate-700 leading-relaxed">${formattedLine}</p>`);
  }

  closePendingTags();

  return resultLines.join('\n');
};

export const stripMarkdownAndFormat = (md: string): string => {
  if (!md) return '';
  
  // Format LaTeX in the markdown to Unicode!
  const text = formatLaTeXToUnicode(md);

  // Process line-by-line
  const lines = text.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line === '') {
      result.push('');
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      result.push(`=== ${line.substring(2).toUpperCase()} ===`);
      continue;
    }
    if (line.startsWith('## ')) {
      result.push(`--- ${line.substring(3)} ---`);
      continue;
    }
    if (line.startsWith('### ')) {
      result.push(`> ${line.substring(4)}`);
      continue;
    }

    // List items
    const listMatch = line.match(/^([*-])\s+(.*)/);
    if (listMatch) {
      result.push(`  • ${listMatch[2]}`);
      continue;
    }

    const oListMatch = line.match(/^([0-9]+)\.\s+(.*)/);
    if (oListMatch) {
      result.push(`  ${oListMatch[1]}. ${oListMatch[2]}`);
      continue;
    }

    // Normal line - strip bold/italic markup
    const cleaned = line
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1');

    result.push(cleaned);
  }

  return result.join('\n');
};

export const generateBeautifulPdf = (
  markdownText: string,
  title: string,
  subject: string,
  dateStr: string,
  fileName: string
) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = { r: 183, g: 149, b: 11 }; // Gold accent #B7950B
    const textColor = { r: 33, g: 37, b: 41 }; // Dark charcoal

    const drawPageDecorations = (pdfDoc: jsPDF, pageNum: number, totalPages: number) => {
      // Draw Header Banner
      pdfDoc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      pdfDoc.rect(0, 0, 210, 15, 'F');
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setFontSize(10);
      pdfDoc.text('SJ TUTOR AI - YOUR PREMIUM PERSONAL STUDY BUDDY', 15, 10);

      // Draw Footer Banner
      pdfDoc.setFillColor(245, 245, 245);
      pdfDoc.rect(0, 282, 210, 15, 'F');
      pdfDoc.setTextColor(120, 120, 120);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setFontSize(8);
      pdfDoc.text(`Generated by SJ Tutor AI on ${dateStr}`, 15, 291);
      pdfDoc.text(`Page ${pageNum} of ${totalPages}`, 180, 291);
    };

    const lines: { text: string; size: number; font: string; style: string; color: { r: number; g: number; b: number }; indent: number; spacingAfter: number }[] = [];
    const paragraphs = markdownText.split('\n');

    paragraphs.forEach((p) => {
      const trimmed = p.trim();
      if (!trimmed) {
        lines.push({ text: '', size: 10, font: 'helvetica', style: 'normal', color: textColor, indent: 15, spacingAfter: 3 });
        return;
      }

      let size = 10;
      const font = 'helvetica';
      let style = 'normal';
      let color = textColor;
      let indent = 15;
      let spacingAfter = 4;
      let text = trimmed;

      if (trimmed.startsWith('# ')) {
        size = 18;
        style = 'bold';
        color = { r: 15, g: 23, b: 42 };
        text = trimmed.substring(2);
        spacingAfter = 6;
      } else if (trimmed.startsWith('## ')) {
        size = 14;
        style = 'bold';
        color = { r: 183, g: 149, b: 11 };
        text = trimmed.substring(3);
        spacingAfter = 5;
      } else if (trimmed.startsWith('### ')) {
        size = 11;
        style = 'bold';
        color = { r: 71, g: 85, b: 105 };
        text = trimmed.substring(4);
        spacingAfter = 4;
      } else if (trimmed.startsWith('> ')) {
        size = 10;
        style = 'italic';
        color = { r: 100, g: 116, b: 139 };
        text = trimmed.substring(2);
        indent = 20;
        spacingAfter = 4;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        size = 10;
        style = 'normal';
        text = '•  ' + trimmed.substring(2);
        indent = 20;
        spacingAfter = 4;
      } else if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
        size = 10;
        style = 'normal';
        const isChecked = trimmed.toLowerCase().startsWith('- [x]');
        text = (isChecked ? '[X] ' : '[ ] ') + trimmed.substring(6);
        indent = 20;
        spacingAfter = 4;
      }

      doc.setFont(font, style);
      doc.setFontSize(size);
      const wrapWidth = 210 - 15 - indent;
      const wrapped = doc.splitTextToSize(text, wrapWidth);

      wrapped.forEach((wrappedLine: string, idx: number) => {
        lines.push({
          text: wrappedLine,
          size,
          font,
          style,
          color,
          indent,
          spacingAfter: idx === wrapped.length - 1 ? spacingAfter : 0
        });
      });
    });

    // Calculate total pages
    let testY = 25;
    let totalPages = 1;
    lines.forEach((line) => {
      const lineSpacing = (line.size * 0.3527) + 1.5;
      const totalSpacing = lineSpacing + line.spacingAfter;
      if (testY + totalSpacing > 270) {
        totalPages++;
        testY = 25;
      }
      testY += totalSpacing;
    });

    // Render the actual pages
    let y = 25;
    let pageNum = 1;
    drawPageDecorations(doc, pageNum, totalPages);

    lines.forEach((line) => {
      const lineSpacing = (line.size * 0.3527) + 1.5;
      const totalSpacing = lineSpacing + line.spacingAfter;

      if (y + totalSpacing > 270) {
        doc.addPage();
        pageNum++;
        y = 25;
        drawPageDecorations(doc, pageNum, totalPages);
      }

      if (line.text) {
        doc.setFont(line.font, line.style);
        doc.setFontSize(line.size);
        doc.setTextColor(line.color.r, line.color.g, line.color.b);
        doc.text(line.text, line.indent, y + (line.size * 0.3527));
      }

      y += totalSpacing;
    });

    doc.save(`${fileName}.pdf`);
  } catch (e) {
    console.error("PDF generation failed:", e);
    alert("PDF generation encountered an error.");
  }
};

/**
 * Generates and triggers the download for any of the 20 requested formats.
 */
export const exportContent = async (
  type: ExportContentType,
  format: string,
  data: any,
  meta: ExportMetadata = {}
) => {
  const title = meta.title || 'SJ Tutor AI Export';
  const subject = meta.subject || 'General';
  const grade = meta.grade || 'General';
  const chapter = meta.chapter || 'Study Guide';
  const dateStr = formatDate(meta.date);
  const fileNameBase = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_export`;

  let contentStr = '';
  let mimeType = 'text/plain;charset=utf-8';
  let extension = format.toLowerCase();

  // 1. Plain Text Exporter (.txt)
  if (format === 'txt') {
    mimeType = 'text/plain;charset=utf-8';
    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      contentStr = `=== STUDY NOTES: ${note.title || title} ===\nSubject: ${note.subject || subject} | Chapter: ${note.chapter || chapter}\nDate: ${dateStr}\n\n${stripMarkdownAndFormat(note.content || '')}`;
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      contentStr = `=== INTERACTIVE QUIZ: ${title} ===\nSubject: ${subject} | Grade: ${grade}\nDate: ${dateStr}\nScore achieved: ${meta.score || 'N/A'}\n\n`;
      questions.forEach((q, i) => {
        contentStr += `Q${i + 1}. ${formatLaTeXToUnicode(q.question)}\n`;
        q.options.forEach((opt, idx) => {
          contentStr += `  [${idx === q.correctAnswerIndex ? 'X' : ' '}] ${String.fromCharCode(65 + idx)}. ${formatLaTeXToUnicode(opt)}\n`;
        });
        contentStr += `Explanation: ${formatLaTeXToUnicode(q.explanation)}\n\n`;
      });
    } else if (type === 'summary') {
      contentStr = `=== TOPIC SUMMARY: ${title} ===\nSubject: ${subject} | Grade: ${grade}\nDate: ${dateStr}\n\n${stripMarkdownAndFormat(String(data))}`;
    } else if (type === 'homework') {
      contentStr = `=== HOMEWORK ANSWER: ${title} ===\nSubject: ${subject} | Grade: ${grade}\nDate: ${dateStr}\nQuestion/Query: ${meta.query || 'N/A'}\n\n=== Solution ===\n${stripMarkdownAndFormat(String(data))}`;
    } else if (type === 'tutor') {
      const msgs = data as ChatMessage[];
      contentStr = `=== AI TUTOR CHAT TRANSCIPT: ${title} ===\nSubject: ${subject} | Date: ${dateStr}\n\n`;
      msgs.forEach(m => {
        const roleName = m.role === 'user' ? 'Student' : 'AI Tutor';
        const msgDate = formatDate(m.timestamp);
        contentStr += `[${msgDate}] ${roleName}:\n${stripMarkdownAndFormat(m.text)}\n\n`;
      });
    }
  }

  // 2. Markdown Exporter (.md)
  else if (format === 'md') {
    mimeType = 'text/markdown;charset=utf-8';
    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      contentStr = `---\ntitle: ${note.title || title}\nsubject: ${note.subject || subject}\nchapter: ${note.chapter || chapter}\ndate: ${dateStr}\n---\n\n# ${note.title || title}\n\n${formatLaTeXToUnicode(note.content || '')}`;
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      contentStr = `# Quiz Challenge: ${title}\n**Subject:** ${subject} | **Grade:** ${grade} | **Date:** ${dateStr}\n**Score:** ${meta.score || 'Not taken yet'}\n\n---\n\n`;
      questions.forEach((q, i) => {
        contentStr += `### Q${i + 1}. ${formatLaTeXToUnicode(q.question)}\n\n`;
        q.options.forEach((opt, idx) => {
          const check = idx === q.correctAnswerIndex ? ' - [x]' : ' - [ ]';
          contentStr += `${check} **${String.fromCharCode(65 + idx)}.** ${formatLaTeXToUnicode(opt)}\n`;
        });
        contentStr += `\n> **Explanation:** ${formatLaTeXToUnicode(q.explanation)}\n\n---\n\n`;
      });
    } else if (type === 'summary') {
      contentStr = `# Topic Summary: ${title}\n**Subject:** ${subject} | **Grade:** ${grade} | **Date:** ${dateStr}\n\n---\n\n${formatLaTeXToUnicode(String(data))}`;
    } else if (type === 'homework') {
      contentStr = `# Homework Solution: ${title}\n**Subject:** ${subject} | **Grade:** ${grade} | **Date:** ${dateStr}\n\n### Query:\n> ${meta.query || 'N/A'}\n\n---\n\n### Solution:\n${formatLaTeXToUnicode(String(data))}`;
    } else if (type === 'tutor') {
      const msgs = data as ChatMessage[];
      contentStr = `# AI Tutor Session: ${title}\n**Subject:** ${subject} | **Date:** ${dateStr}\n\n---\n\n`;
      msgs.forEach(m => {
        const isUser = m.role === 'user';
        contentStr += `### ${isUser ? '👤 Student' : '🤖 AI Tutor'} *(${formatDate(m.timestamp)})*\n\n${formatLaTeXToUnicode(m.text)}\n\n---\n\n`;
      });
    }
  }

  // 3. HTML Exporter (.html)
  else if (format === 'html') {
    mimeType = 'text/html;charset=utf-8';
    let bodyContent = '';

    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      bodyContent = `
        <div class="max-w-3xl mx-auto my-10 bg-white p-8 rounded-2xl shadow-md border border-slate-100">
          <div class="border-b border-amber-200 pb-5 mb-6">
            <span class="text-[10px] font-black tracking-widest text-primary-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase">Study Note</span>
            <h1 class="text-3xl font-extrabold text-slate-800 mt-2">${note.title || title}</h1>
            <div class="flex gap-4 mt-3 text-xs text-slate-500 font-semibold">
              <span>📚 Subject: ${note.subject || subject}</span>
              <span>•</span>
              <span>📖 Chapter: ${note.chapter || chapter}</span>
              <span>•</span>
              <span>📅 Date: ${dateStr}</span>
            </div>
          </div>
          <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">${markdownToHtml(note.content || '')}</div>
        </div>
      `;
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      let questionsHtml = '';
      questions.forEach((q, i) => {
        let optionsHtml = '';
        q.options.forEach((opt, idx) => {
          const isCorrect = idx === q.correctAnswerIndex;
          optionsHtml += `
            <div class="flex items-start gap-3 p-3 rounded-lg border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-700'}">
              <span class="font-bold uppercase w-6 h-6 flex items-center justify-center rounded-full ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'}">${String.fromCharCode(65 + idx)}</span>
              <span>${formatLaTeX(opt)}</span>
            </div>
          `;
        });
        questionsHtml += `
          <div class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 class="font-bold text-slate-800 text-base">Q${i + 1}. ${formatLaTeX(q.question)}</h3>
            <div class="grid gap-2">${optionsHtml}</div>
            <div class="mt-3 p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-xs text-slate-600">
              <strong>Explanation:</strong> ${formatLaTeX(q.explanation)}
            </div>
          </div>
        `;
      });
      bodyContent = `
        <div class="max-w-3xl mx-auto my-10 space-y-6">
          <div class="bg-white p-8 rounded-2xl shadow-md border border-slate-100">
            <span class="text-[10px] font-black tracking-widest text-primary-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase">Practice Quiz</span>
            <h1 class="text-3xl font-extrabold text-slate-800 mt-2">${title}</h1>
            <div class="flex gap-4 mt-3 text-xs text-slate-500 font-semibold">
              <span>📚 Subject: ${subject}</span>
              <span>•</span>
              <span>🎓 Grade: ${grade}</span>
              <span>•</span>
              <span>📝 Score: ${meta.score || 'Not Graded'}</span>
            </div>
          </div>
          <div class="space-y-4">${questionsHtml}</div>
        </div>
      `;
    } else if (type === 'summary') {
      bodyContent = `
        <div class="max-w-3xl mx-auto my-10 bg-white p-8 rounded-2xl shadow-md border border-slate-100">
          <div class="border-b border-amber-200 pb-5 mb-6">
            <span class="text-[10px] font-black tracking-widest text-primary-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase">Topic Summary</span>
            <h1 class="text-3xl font-extrabold text-slate-800 mt-2">${title}</h1>
            <div class="flex gap-4 mt-3 text-xs text-slate-500 font-semibold">
              <span>📚 Subject: ${subject}</span>
              <span>•</span>
              <span>🎓 Grade: ${grade}</span>
              <span>•</span>
              <span>📅 Date: ${dateStr}</span>
            </div>
          </div>
          <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">${markdownToHtml(String(data))}</div>
        </div>
      `;
    } else if (type === 'homework') {
      bodyContent = `
        <div class="max-w-3xl mx-auto my-10 space-y-6">
          <div class="bg-white p-8 rounded-2xl shadow-md border border-slate-100">
            <span class="text-[10px] font-black tracking-widest text-primary-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase">Homework Solver</span>
            <h1 class="text-3xl font-extrabold text-slate-800 mt-2">${title}</h1>
            <div class="flex gap-4 mt-3 text-xs text-slate-500 font-semibold">
              <span>📚 Subject: ${subject}</span>
              <span>•</span>
              <span>🎓 Grade: ${grade}</span>
              <span>•</span>
              <span>📅 Date: ${dateStr}</span>
            </div>
          </div>
          <div class="bg-amber-50/50 border border-amber-100 p-6 rounded-2xl">
            <h4 class="text-xs font-black text-amber-800 uppercase tracking-wider mb-2">My Query:</h4>
            <p class="text-slate-700 text-sm italic font-medium">"${meta.query || 'N/A'}"</p>
          </div>
          <div class="bg-white p-8 rounded-2xl shadow-md border border-slate-100">
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Detailed Solution:</h4>
            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">${markdownToHtml(String(data))}</div>
          </div>
        </div>
      `;
    } else if (type === 'tutor') {
      const msgs = data as ChatMessage[];
      let chatHtml = '';
      msgs.forEach(m => {
        const isUser = m.role === 'user';
        chatHtml += `
          <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[80%] rounded-2xl p-4 shadow-sm ${isUser ? 'bg-amber-500 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'}">
              <span class="text-[9px] block font-extrabold uppercase mb-1 ${isUser ? 'text-amber-100' : 'text-slate-400'}">${isUser ? 'Student' : 'AI Tutor'}</span>
              <div class="text-sm leading-relaxed space-y-2">${markdownToHtml(m.text)}</div>
              <span class="text-[8px] block text-right mt-1.5 ${isUser ? 'text-amber-100' : 'text-slate-400'}">${formatDate(m.timestamp)}</span>
            </div>
          </div>
        `;
      });
      bodyContent = `
        <div class="max-w-3xl mx-auto my-10 space-y-6">
          <div class="bg-white p-8 rounded-2xl shadow-md border border-slate-100">
            <span class="text-[10px] font-black tracking-widest text-primary-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase">Tutor Transcript</span>
            <h1 class="text-3xl font-extrabold text-slate-800 mt-2">${title}</h1>
            <div class="flex gap-4 mt-3 text-xs text-slate-500 font-semibold">
              <span>📚 Subject: ${subject}</span>
              <span>•</span>
              <span>📅 Date: ${dateStr}</span>
            </div>
          </div>
          <div class="flex flex-col gap-4">${chatHtml}</div>
        </div>
      `;
    }

    contentStr = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { background-color: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
        </style>
      </head>
      <body class="p-4 sm:p-8">
        ${bodyContent}
        <footer class="text-center text-slate-400 text-xs mt-12 pb-10">
          Generated with ❤️ by <strong>SJ Tutor AI</strong> • Your Personal AI Study Buddy
        </footer>
      </body>
      </html>
    `;
  }

  // 4. Microsoft Word Doc Exporter (.docx / .doc)
  else if (format === 'docx' || format === 'doc') {
    mimeType = 'application/msword;charset=utf-8';
    let bodyHtml = '';

    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      bodyHtml = `
        <h1>${note.title || title}</h1>
        <p><strong>Subject:</strong> ${note.subject || subject} &bull; <strong>Chapter:</strong> ${note.chapter || chapter}</p>
        <p><strong>Date Generated:</strong> ${dateStr}</p>
        <hr />
        <div style="font-family: Calibri, sans-serif;">${markdownToHtml(note.content || '')}</div>
      `;
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      let questionsMarkup = '';
      questions.forEach((q, i) => {
        let optList = '';
        q.options.forEach((opt, idx) => {
          const isCorrect = idx === q.correctAnswerIndex;
          optList += `<li>[${isCorrect ? 'X' : ' '}] ${formatLaTeX(opt)}</li>`;
        });
        questionsMarkup += `
          <h3>Q${i + 1}. ${formatLaTeX(q.question)}</h3>
          <ul>${optList}</ul>
          <p><em>Explanation:</em> ${formatLaTeX(q.explanation)}</p>
          <br/>
        `;
      });
      bodyHtml = `
        <h1>${title}</h1>
        <p><strong>Subject:</strong> ${subject} &bull; <strong>Grade:</strong> ${grade}</p>
        <p><strong>Score achieved:</strong> ${meta.score || 'N/A'}</p>
        <hr />
        ${questionsMarkup}
      `;
    } else if (type === 'summary') {
      bodyHtml = `
        <h1>Topic Summary: ${title}</h1>
        <p><strong>Subject:</strong> ${subject} &bull; <strong>Grade:</strong> ${grade}</p>
        <p><strong>Date:</strong> ${dateStr}</p>
        <hr />
        <div>${markdownToHtml(String(data))}</div>
      `;
    } else if (type === 'homework') {
      bodyHtml = `
        <h1>Homework Solution: ${title}</h1>
        <p><strong>Subject:</strong> ${subject} &bull; <strong>Grade:</strong> ${grade}</p>
        <p><strong>Date:</strong> ${dateStr}</p>
        <hr />
        <p><strong>Query Asked:</strong> <em>"${meta.query || 'N/A'}"</em></p>
        <hr />
        <h2>Solution</h2>
        <div>${markdownToHtml(String(data))}</div>
      `;
    } else if (type === 'tutor') {
      const msgs = data as ChatMessage[];
      let dialogue = '';
      msgs.forEach(m => {
        const isUser = m.role === 'user';
        dialogue += `<p><strong>[${isUser ? 'Student' : 'AI Tutor'}] (${formatDate(m.timestamp)}):</strong><br/>${markdownToHtml(m.text)}</p><br/>`;
      });
      bodyHtml = `
        <h1>AI Tutor Chat Transcript</h1>
        <p><strong>Subject:</strong> ${subject} &bull; <strong>Date:</strong> ${dateStr}</p>
        <hr />
        ${dialogue}
      `;
    }

    contentStr = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; }
          h1 { color: #2B6CB0; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; font-size: 24px; }
          h2 { color: #2D3748; font-size: 18px; margin-top: 20px; }
          h3 { color: #4A5568; font-size: 15px; margin-top: 15px; }
          p, li { color: #333333; font-size: 11pt; }
          hr { border: none; border-top: 1px solid #CBD5E0; margin: 20px 0; }
          .footer { font-size: 9pt; color: #718096; text-align: center; margin-top: 40px; }
        </style>
      </head>
      <body>
        ${bodyHtml}
        <hr />
        <p class="footer">Generated by SJ Tutor AI - Keep Studying & Succeeding!</p>
      </body>
      </html>
    `;
    extension = 'doc'; // Microsoft Word handles styled HTML inside .doc seamlessly
  }

  // 5. Rich Text Format Exporter (.rtf)
  else if (format === 'rtf') {
    mimeType = 'application/rtf';
    let plainContent = '';
    
    if (type === 'notes') {
      plainContent = stripMarkdownAndFormat((data as Partial<NoteItem>).content || '');
    } else if (type === 'quiz') {
      (data as QuizQuestion[]).forEach((q, i) => {
        plainContent += `Q${i+1}: ${stripMarkdownAndFormat(q.question)}\\line `;
        q.options.forEach((opt, idx) => {
          plainContent += `  [${idx === q.correctAnswerIndex ? 'X' : ' '}] ${String.fromCharCode(65+idx)}. ${stripMarkdownAndFormat(opt)}\\line `;
        });
        plainContent += `Explanation: ${stripMarkdownAndFormat(q.explanation)}\\line\\line `;
      });
    } else if (type === 'summary' || type === 'homework') {
      plainContent = stripMarkdownAndFormat(String(data));
    } else if (type === 'tutor') {
      (data as ChatMessage[]).forEach(m => {
        plainContent += `[${m.role === 'user' ? 'Student' : 'AI Tutor'}]: ${stripMarkdownAndFormat(m.text)}\\line\\line `;
      });
    }

    contentStr = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}\\viewkind4\\uc1\\pard\\lang1033\\f0\\fs24{\\b\\fs32 ${title}}\\par\\line **Subject:** ${subject} | **Date:** ${dateStr}\\par\\line-------------------------------------------------\\par\\line ${plainContent.replace(/\n/g, '\\line ')} }`;
  }

  // 6. CSV Exporter (.csv)
  else if (format === 'csv') {
    mimeType = 'text/csv;charset=utf-8';
    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      contentStr = `Title,Subject,Chapter,Date,Content\n${escapeCSV(note.title || '')},${escapeCSV(note.subject || '')},${escapeCSV(note.chapter || '')},${escapeCSV(dateStr)},${escapeCSV(note.content || '')}`;
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      contentStr = `Question No,Question,Option A,Option B,Option C,Option D,Correct Option Index,Explanation\n`;
      questions.forEach((q, i) => {
        contentStr += `${i + 1},${escapeCSV(q.question)},${escapeCSV(q.options[0] || '')},${escapeCSV(q.options[1] || '')},${escapeCSV(q.options[2] || '')},${escapeCSV(q.options[3] || '')},${q.correctAnswerIndex},${escapeCSV(q.explanation)}\n`;
      });
    } else if (type === 'summary') {
      contentStr = `Title,Subject,Grade,Date,SummaryContent\n${escapeCSV(title)},${escapeCSV(subject)},${escapeCSV(grade)},${escapeCSV(dateStr)},${escapeCSV(String(data))}`;
    } else if (type === 'homework') {
      contentStr = `Title,Subject,Grade,Date,Query,Solution\n${escapeCSV(title)},${escapeCSV(subject)},${escapeCSV(grade)},${escapeCSV(dateStr)},${escapeCSV(meta.query || '')},${escapeCSV(String(data))}`;
    } else if (type === 'tutor') {
      const msgs = data as ChatMessage[];
      contentStr = `Timestamp,Speaker,Message\n`;
      msgs.forEach(m => {
        contentStr += `${m.timestamp},${m.role === 'user' ? 'Student' : 'AI Tutor'},${escapeCSV(m.text)}\n`;
      });
    }
  }

  // 7. Microsoft Excel Exporter (.xlsx) - represented as formatted SpreadsheetML XML
  else if (format === 'xlsx' || format === 'xls') {
    mimeType = 'application/vnd.ms-excel';
    let rowsXml = '';

    const addCell = (val: string, type: 'String' | 'Number' = 'String') => {
      // Escape XML characters
      const escaped = val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      return `<Cell><Data ss:Type="${type}">${escaped}</Data></Cell>`;
    };

    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      rowsXml += `<Row>${addCell('Title')}${addCell('Subject')}${addCell('Chapter')}${addCell('Date')}${addCell('Content')}</Row>`;
      rowsXml += `<Row>${addCell(note.title || '')}${addCell(note.subject || '')}${addCell(note.chapter || '')}${addCell(dateStr)}${addCell(note.content || '')}</Row>`;
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      rowsXml += `<Row>${addCell('Q#')}${addCell('Question')}${addCell('Option A')}${addCell('Option B')}${addCell('Option C')}${addCell('Option D')}${addCell('Correct Index', 'Number')}${addCell('Explanation')}</Row>`;
      questions.forEach((q, i) => {
        rowsXml += `<Row>${addCell(String(i+1), 'Number')}${addCell(q.question)}${addCell(q.options[0] || '')}${addCell(q.options[1] || '')}${addCell(q.options[2] || '')}${addCell(q.options[3] || '')}${addCell(String(q.correctAnswerIndex), 'Number')}${addCell(q.explanation)}</Row>`;
      });
    } else if (type === 'summary') {
      rowsXml += `<Row>${addCell('Title')}${addCell('Subject')}${addCell('Grade')}${addCell('Date')}${addCell('Summary')}</Row>`;
      rowsXml += `<Row>${addCell(title)}${addCell(subject)}${addCell(grade)}${addCell(dateStr)}${addCell(String(data))}</Row>`;
    } else if (type === 'homework') {
      rowsXml += `<Row>${addCell('Title')}${addCell('Subject')}${addCell('Grade')}${addCell('Date')}${addCell('Query')}${addCell('Solution')}</Row>`;
      rowsXml += `<Row>${addCell(title)}${addCell(subject)}${addCell(grade)}${addCell(dateStr)}${addCell(meta.query || '')}${addCell(String(data))}</Row>`;
    } else if (type === 'tutor') {
      const msgs = data as ChatMessage[];
      rowsXml += `<Row>${addCell('Timestamp')}${addCell('Role')}${addCell('Message')}</Row>`;
      msgs.forEach(m => {
        rowsXml += `<Row>${addCell(formatDate(m.timestamp))}${addCell(m.role === 'user' ? 'Student' : 'AI Tutor')}${addCell(m.text)}</Row>`;
      });
    }

    contentStr = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Worksheet ss:Name="SJ Tutor AI Export"><Table>${rowsXml}</Table></Worksheet></Workbook>`;
    extension = 'xls';
  }

  // 8. OpenDocument Text Exporter (.odt) - FODT Flat format
  else if (format === 'odt') {
    mimeType = 'application/vnd.oasis.opendocument.text';
    let bodyContent = `<text:h text:outline-level="1">${title}</text:h><text:p>Subject: ${subject} | Grade: ${grade} | Date: ${dateStr}</text:p><text:p></text:p>`;
    
    if (type === 'notes') {
      const paragraphs = ((data as Partial<NoteItem>).content || '').split('\n');
      paragraphs.forEach(p => {
        bodyContent += `<text:p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text:p>`;
      });
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      questions.forEach((q, i) => {
        bodyContent += `<text:h text:outline-level="2">Q${i+1}. ${q.question.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text:h>`;
        q.options.forEach((opt, idx) => {
          bodyContent += `<text:p>   ${String.fromCharCode(65+idx)}. ${opt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text:p>`;
        });
        bodyContent += `<text:p><text:span text:style-name="Emphasis">Explanation:</text:span> ${q.explanation.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text:p>`;
      });
    } else if (type === 'summary' || type === 'homework') {
      const paragraphs = String(data).split('\n');
      paragraphs.forEach(p => {
        bodyContent += `<text:p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text:p>`;
      });
    } else if (type === 'tutor') {
      const msgs = data as ChatMessage[];
      msgs.forEach(m => {
        bodyContent += `<text:p><text:span text:style-name="Strong">${m.role === 'user' ? 'Student' : 'AI Tutor'}:</text:span> ${m.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text:p>`;
      });
    }

    contentStr = `<?xml version="1.0" encoding="UTF-8"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.text"><office:body><office:text>${bodyContent}</office:text></office:body></office:document>`;
  }

  // 9. OpenDocument Spreadsheet Exporter (.ods) - FODS Flat format
  else if (format === 'ods') {
    mimeType = 'application/vnd.oasis.opendocument.spreadsheet';
    let rowsHtml = '';

    const addCellOds = (v: string) => {
      const esc = v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<table:table-cell office:value-type="string"><text:p>${esc}</text:p></table:table-cell>`;
    };

    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      rowsHtml += `<table:table-row>${addCellOds('Title')}${addCellOds('Subject')}${addCellOds('Chapter')}${addCellOds('Date')}${addCellOds('Content')}</table:table-row>`;
      rowsHtml += `<table:table-row>${addCellOds(note.title || '')}${addCellOds(note.subject || '')}${addCellOds(note.chapter || '')}${addCellOds(dateStr)}${addCellOds(note.content || '')}</table:table-row>`;
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      rowsHtml += `<table:table-row>${addCellOds('Q#')}${addCellOds('Question')}${addCellOds('Option A')}${addCellOds('Option B')}${addCellOds('Option C')}${addCellOds('Option D')}${addCellOds('Correct Index')}${addCellOds('Explanation')}</table:table-row>`;
      questions.forEach((q, i) => {
        rowsHtml += `<table:table-row>${addCellOds(String(i+1))}${addCellOds(q.question)}${addCellOds(q.options[0] || '')}${addCellOds(q.options[1] || '')}${addCellOds(q.options[2] || '')}${addCellOds(q.options[3] || '')}${addCellOds(String(q.correctAnswerIndex))}${addCellOds(q.explanation)}</table:table-row>`;
      });
    } else if (type === 'summary') {
      rowsHtml += `<table:table-row>${addCellOds('Title')}${addCellOds('Subject')}${addCellOds('Grade')}${addCellOds('Date')}${addCellOds('Summary')}</table:table-row>`;
      rowsHtml += `<table:table-row>${addCellOds(title)}${addCellOds(subject)}${addCellOds(grade)}${addCellOds(dateStr)}${addCellOds(String(data))}</table:table-row>`;
    } else if (type === 'homework') {
      rowsHtml += `<table:table-row>${addCellOds('Title')}${addCellOds('Subject')}${addCellOds('Grade')}${addCellOds('Date')}${addCellOds('Query')}${addCellOds('Solution')}</table:table-row>`;
      rowsHtml += `<table:table-row>${addCellOds(title)}${addCellOds(subject)}${addCellOds(grade)}${addCellOds(dateStr)}${addCellOds(meta.query || '')}${addCellOds(String(data))}</table:table-row>`;
    } else if (type === 'tutor') {
      const msgs = data as ChatMessage[];
      rowsHtml += `<table:table-row>${addCellOds('Timestamp')}${addCellOds('Role')}${addCellOds('Message')}</table:table-row>`;
      msgs.forEach(m => {
        rowsHtml += `<table:table-row>${addCellOds(formatDate(m.timestamp))}${addCellOds(m.role === 'user' ? 'Student' : 'AI Tutor')}${addCellOds(m.text)}</table:table-row>`;
      });
    }

    contentStr = `<?xml version="1.0" encoding="UTF-8"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet"><office:body><office:spreadsheet><table:table table:name="SJ Tutor AI Export">${rowsHtml}</table:table></office:spreadsheet></office:body></office:document>`;
  }

  // 10. PowerPoint & OpenDocument Presentation Exporter (.pptx & .odp) - Flat Presentation FODP format
  else if (format === 'pptx' || format === 'odp' || format === 'ppt') {
    mimeType = 'application/vnd.oasis.opendocument.presentation';
    let slidesHtml = '';

    const formatEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Slide 1: Title Slide
    slidesHtml += `
      <draw:page draw:name="Slide1">
        <draw:frame svg:width="25cm" svg:height="5cm" svg:x="2cm" svg:y="2cm">
          <draw:text-box>
            <text:h text:outline-level="1">${formatEsc(title)}</text:h>
            <text:p>SJ Tutor AI Study Session</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame svg:width="25cm" svg:height="4cm" svg:x="2cm" svg:y="10cm">
          <draw:text-box>
            <text:p>Subject: ${formatEsc(subject)} | Grade: ${formatEsc(grade)}</text:p>
            <text:p>Date Generated: ${formatEsc(dateStr)}</text:p>
          </draw:text-box>
        </draw:frame>
      </draw:page>
    `;

    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      const segments = (note.content || '').substring(0, 2000).split('\n\n');
      segments.forEach((seg, index) => {
        slidesHtml += `
          <draw:page draw:name="Slide${index + 2}">
            <draw:frame svg:width="25cm" svg:height="3cm" svg:x="2cm" svg:y="1cm">
              <draw:text-box>
                <text:h text:outline-level="2">${formatEsc(note.title || title)} - Slide ${index + 1}</text:h>
              </draw:text-box>
            </draw:frame>
            <draw:frame svg:width="25cm" svg:height="12cm" svg:x="2cm" svg:y="5cm">
              <draw:text-box>
                <text:p>${formatEsc(seg)}</text:p>
              </draw:text-box>
            </draw:frame>
          </draw:page>
        `;
      });
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      questions.forEach((q, i) => {
        let listStr = '';
        q.options.forEach((opt, idx) => {
          listStr += `<text:p>[${idx === q.correctAnswerIndex ? 'X' : ' '}] ${String.fromCharCode(65+idx)}. ${formatEsc(opt)}</text:p>`;
        });
        slidesHtml += `
          <draw:page draw:name="Question${i + 1}">
            <draw:frame svg:width="25cm" svg:height="3cm" svg:x="2cm" svg:y="1cm">
              <draw:text-box>
                <text:h text:outline-level="2">Quiz Question ${i + 1}</text:h>
              </draw:text-box>
            </draw:frame>
            <draw:frame svg:width="25cm" svg:height="12cm" svg:x="2cm" svg:y="4cm">
              <draw:text-box>
                <text:p>${formatEsc(q.question)}</text:p>
                ${listStr}
                <text:p></text:p>
                <text:p>Explanation: ${formatEsc(q.explanation)}</text:p>
              </draw:text-box>
            </draw:frame>
          </draw:page>
        `;
      });
    } else if (type === 'summary' || type === 'homework') {
      const segments = String(data).substring(0, 3000).split('\n\n');
      segments.forEach((seg, index) => {
        slidesHtml += `
          <draw:page draw:name="Summary${index + 1}">
            <draw:frame svg:width="25cm" svg:height="3cm" svg:x="2cm" svg:y="1cm">
              <draw:text-box>
                <text:h text:outline-level="2">${formatEsc(title)} - Section ${index + 1}</text:h>
              </draw:text-box>
            </draw:frame>
            <draw:frame svg:width="25cm" svg:height="12cm" svg:x="2cm" svg:y="5cm">
              <draw:text-box>
                <text:p>${formatEsc(seg)}</text:p>
              </draw:text-box>
            </draw:frame>
          </draw:page>
        `;
      });
    } else if (type === 'tutor') {
      const msgs = (data as ChatMessage[]).slice(0, 10); // limited slides
      msgs.forEach((m, index) => {
        slidesHtml += `
          <draw:page draw:name="Chat${index + 1}">
            <draw:frame svg:width="25cm" svg:height="3cm" svg:x="2cm" svg:y="1cm">
              <draw:text-box>
                <text:h text:outline-level="2">${m.role === 'user' ? 'Student Question' : 'AI Tutor Response'}</text:h>
              </draw:text-box>
            </draw:frame>
            <draw:frame svg:width="25cm" svg:height="12cm" svg:x="2cm" svg:y="4cm">
              <draw:text-box>
                <text:p>${formatEsc(m.text)}</text:p>
              </draw:text-box>
            </draw:frame>
          </draw:page>
        `;
      });
    }

    contentStr = `<?xml version="1.0" encoding="UTF-8"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.presentation"><office:body><office:presentation>${slidesHtml}</office:presentation></office:body></office:document>`;
    extension = 'odp';
  }

  // 11. JSON Exporter (.json)
  else if (format === 'json') {
    mimeType = 'application/json';
    contentStr = JSON.stringify({
      exportType: type,
      title,
      subject,
      grade,
      chapter,
      generatedDate: dateStr,
      meta,
      data
    }, null, 2);
  }

  // 12. XML Exporter (.xml)
  else if (format === 'xml') {
    mimeType = 'application/xml';
    
    const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let xmlBody = '';

    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      xmlBody = `<note><id>${note.id}</id><title>${xmlEsc(note.title || '')}</title><subject>${xmlEsc(note.subject || '')}</subject><chapter>${xmlEsc(note.chapter || '')}</chapter><content>${xmlEsc(note.content || '')}</content></note>`;
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      xmlBody = `<quiz><questions>`;
      questions.forEach((q, idx) => {
        xmlBody += `<question_item index="${idx}"><text>${xmlEsc(q.question)}</text><options>`;
        q.options.forEach((o, oidx) => {
          xmlBody += `<option index="${oidx}">${xmlEsc(o)}</option>`;
        });
        xmlBody += `</options><correct_index>${q.correctAnswerIndex}</correct_index><explanation>${xmlEsc(q.explanation)}</explanation></question_item>`;
      });
      xmlBody += `</questions></quiz>`;
    } else if (type === 'summary') {
      xmlBody = `<summary>${xmlEsc(String(data))}</summary>`;
    } else if (type === 'homework') {
      xmlBody = `<homework><query>${xmlEsc(meta.query || '')}</query><solution>${xmlEsc(String(data))}</solution></homework>`;
    } else if (type === 'tutor') {
      xmlBody = `<chat_session>`;
      (data as ChatMessage[]).forEach(m => {
        xmlBody += `<message role="${m.role}" timestamp="${m.timestamp}">${xmlEsc(m.text)}</message>`;
      });
      xmlBody += `</chat_session>`;
    }

    contentStr = `<?xml version="1.0" encoding="UTF-8"?><sjtutor_export><metadata><title>${xmlEsc(title)}</title><subject>${xmlEsc(subject)}</subject><grade>${xmlEsc(grade)}</grade><date>${xmlEsc(dateStr)}</date></metadata>${xmlBody}</sjtutor_export>`;
  }

  // 13. YAML Exporter (.yaml)
  else if (format === 'yaml') {
    mimeType = 'text/yaml;charset=utf-8';
    
    const yamlEsc = (s: string) => {
      // Indent multi-line string
      const lines = s.split('\n');
      return '|\n' + lines.map(line => '    ' + line).join('\n');
    };

    contentStr = `export_metadata:\n  title: "${title}"\n  subject: "${subject}"\n  grade: "${grade}"\n  date: "${dateStr}"\n`;
    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      contentStr += `notes_data:\n  title: "${note.title || ''}"\n  subject: "${note.subject || ''}"\n  chapter: "${note.chapter || ''}"\n  content: ${yamlEsc(note.content || '')}`;
    } else if (type === 'quiz') {
      const questions = data as QuizQuestion[];
      contentStr += `quiz_data:\n  score: "${meta.score || ''}"\n  questions:\n`;
      questions.forEach((q, idx) => {
        contentStr += `    - index: ${idx}\n      question: "${q.question.replace(/"/g, '\\"')}"\n      correct_index: ${q.correctAnswerIndex}\n      explanation: "${q.explanation.replace(/"/g, '\\"')}"\n      options:\n`;
        q.options.forEach(o => {
          contentStr += `        - "${o.replace(/"/g, '\\"')}"\n`;
        });
      });
    } else if (type === 'summary') {
      contentStr += `summary_data:\n  content: ${yamlEsc(String(data))}`;
    } else if (type === 'homework') {
      contentStr += `homework_data:\n  query: "${(meta.query || '').replace(/"/g, '\\"')}"\n  solution: ${yamlEsc(String(data))}`;
    } else if (type === 'tutor') {
      const msgs = data as ChatMessage[];
      contentStr += `chat_transcript:\n`;
      msgs.forEach(m => {
        contentStr += `  - role: "${m.role}"\n    timestamp: ${m.timestamp}\n    text: ${yamlEsc(m.text)}\n`;
      });
    }
  }

  // 14. Python Exporter (.py)
  else if (format === 'py') {
    mimeType = 'text/plain;charset=utf-8';
    contentStr = `#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n"""\nSJ Tutor AI Export - Python representation of ${title}\nGenerated on: ${dateStr}\n"""\n\n`;
    contentStr += `export_metadata = {\n    "title": "${title}",\n    "subject": "${subject}",\n    "grade": "${grade}",\n    "date": "${dateStr}"\n}\n\n`;

    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      contentStr += `study_notes = {\n    "title": ${JSON.stringify(note.title || '')},\n    "subject": ${JSON.stringify(note.subject || '')},\n    "chapter": ${JSON.stringify(note.chapter || '')},\n    "content": ${JSON.stringify(note.content || '')}\n}\n\ndef print_summary():\n    print("Study Note:", study_notes["title"])\n    print("=" * 40)\n    print(study_notes["content"])\n\nif __name__ == "__main__":\n    print_summary()\n`;
    } else if (type === 'quiz') {
      contentStr += `quiz_questions = ${JSON.stringify(data, null, 4)}\n\ndef start_quiz():\n    print(f"Starting Quiz: {export_metadata['title']}")\n    score = 0\n    for i, q in enumerate(quiz_questions):\n        print(f"\\nQ{i+1}: {q['question']}")\n        for j, opt in enumerate(q['options']):\n            print(f"  {chr(65+j)}. {opt}")\n        ans = input("Your answer (A/B/C/D): ").strip().upper()\n        correct_letter = chr(65 + q['correctAnswerIndex'])\n        if ans == correct_letter:\n            print("Correct!")\n            score += 1\n        else:\n            print(f"Incorrect. The correct answer was {correct_letter}.")\n        print("Explanation:", q['explanation'])\n    print(f"\\nQuiz finished! Score: {score}/{len(quiz_questions)}")\n\nif __name__ == "__main__":\n    start_quiz()\n`;
    } else if (type === 'summary' || type === 'homework') {
      contentStr += `content = ${JSON.stringify(data)}\n\nif __name__ == "__main__":\n    print(export_metadata["title"])\n    print("=" * len(export_metadata["title"]))\n    print(content)\n`;
    } else if (type === 'tutor') {
      contentStr += `chat_transcript = ${JSON.stringify(data, null, 4)}\n\nif __name__ == "__main__":\n    for m in chat_transcript:\n        role = "Student" if m["role"] == "user" else "AI Tutor"\n        print(f"[{role}]: {m['text']}\\n")\n`;
    }
  }

  // 15. JavaScript Exporter (.js)
  else if (format === 'js') {
    mimeType = 'application/javascript;charset=utf-8';
    contentStr = `/**\n * SJ Tutor AI Export\n * Generated on: ${dateStr}\n */\n\n`;
    contentStr += `const metadata = {\n  title: "${title}",\n  subject: "${subject}",\n  grade: "${grade}",\n  date: "${dateStr}"\n};\n\n`;
    contentStr += `const studyData = ${JSON.stringify(data, null, 2)};\n\n`;
    contentStr += `module.exports = { metadata, studyData };\n`;
  }

  // 16. TypeScript Exporter (.ts)
  else if (format === 'ts') {
    mimeType = 'application/typescript;charset=utf-8';
    contentStr = `/**\n * SJ Tutor AI Export\n * Generated on: ${dateStr}\n */\n\n`;
    contentStr += `export interface StudyMetadata {\n  title: string;\n  subject: string;\n  grade: string;\n  date: string;\n}\n\n`;
    contentStr += `export const metadata: StudyMetadata = {\n  title: "${title}",\n  subject: "${subject}",\n  grade: "${grade}",\n  date: "${dateStr}"\n};\n\n`;
    contentStr += `export const studyData: any = ${JSON.stringify(data, null, 2)};\n`;
  }

  // 17. CSS Exporter (.css)
  else if (format === 'css') {
    mimeType = 'text/css;charset=utf-8';
    contentStr = `/* SJ Tutor AI Export - CSS Variables representation of ${title} */\n`;
    contentStr += `/* Generated on: ${dateStr} */\n\n`;
    contentStr += `:root {\n`;
    contentStr += `  --sjtutor-title: "${title}";\n`;
    contentStr += `  --sjtutor-subject: "${subject}";\n`;
    contentStr += `  --sjtutor-grade: "${grade}";\n`;
    contentStr += `  --sjtutor-date: "${dateStr}";\n`;
    
    if (type === 'notes') {
      const note = data as Partial<NoteItem>;
      contentStr += `  --sjtutor-note-title: "${(note.title || '').replace(/"/g, '\\"')}";\n`;
      contentStr += `  --sjtutor-note-subject: "${(note.subject || '').replace(/"/g, '\\"')}";\n`;
      contentStr += `  --sjtutor-note-content: "${(note.content || '').substring(0, 500).replace(/\n/g, ' ').replace(/"/g, '\\"')}";\n`;
    } else if (type === 'quiz') {
      contentStr += `  --sjtutor-quiz-questions-count: "${(data as QuizQuestion[]).length}";\n`;
    } else if (type === 'summary') {
      contentStr += `  --sjtutor-summary-preview: "${String(data).substring(0, 500).replace(/\n/g, ' ').replace(/"/g, '\\"')}";\n`;
    } else if (type === 'homework') {
      contentStr += `  --sjtutor-homework-query: "${(meta.query || '').replace(/"/g, '\\"')}";\n`;
    }
    
    contentStr += `}\n\n`;
    contentStr += `.sjtutor-export-card {\n  font-family: 'Helvetica Neue', Arial, sans-serif;\n  border-radius: 12px;\n  border: 1px solid #e2e8f0;\n  padding: 24px;\n  background: #ffffff;\n}\n`;
  }

  // 18. SQL Exporter (.sql)
  else if (format === 'sql') {
    mimeType = 'text/plain;charset=utf-8';
    contentStr = `-- SJ Tutor AI Export - SQL Dump\n`;
    contentStr += `-- Generated on: ${dateStr}\n\n`;
    contentStr += `CREATE TABLE IF NOT EXISTS sj_tutor_export (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  content_type VARCHAR(50),\n  title VARCHAR(255),\n  subject VARCHAR(255),\n  grade VARCHAR(50),\n  date_created VARCHAR(100),\n  raw_content TEXT\n);\n\n`;
    
    const escapeSQL = (s: string) => s.replace(/'/g, "''");
    let serializedData = '';
    
    if (type === 'notes') {
      serializedData = (data as Partial<NoteItem>).content || '';
    } else {
      serializedData = JSON.stringify(data);
    }

    contentStr += `INSERT INTO sj_tutor_export (content_type, title, subject, grade, date_created, raw_content) \nVALUES ('${type}', '${escapeSQL(title)}', '${escapeSQL(subject)}', '${escapeSQL(grade)}', '${escapeSQL(dateStr)}', '${escapeSQL(serializedData)}');\n`;
  }

  // 19. PDF Exporter (.pdf) - Uses jsPDF with markdown parsing to create a beautiful multipage document
  else if (format === 'pdf') {
    try {
      let markdown = '';
      if (type === 'notes') {
        const note = data as Partial<NoteItem>;
        markdown = `# STUDY NOTES: ${note.title || title}\n\n## Metadata\n- **Subject:** ${note.subject || subject}\n- **Chapter:** ${note.chapter || chapter}\n- **Date:** ${dateStr}\n\n---\n\n${note.content || ''}`;
      } else if (type === 'quiz') {
        const questions = data as QuizQuestion[];
        markdown = `# QUIZ CHALLENGE: ${title}\n\n## Metadata\n- **Subject:** ${subject}\n- **Grade:** ${grade}\n- **Date:** ${dateStr}\n- **Score:** ${meta.score || 'N/A'}\n\n---\n\n`;
        questions.forEach((q, i) => {
          markdown += `### Q${i + 1}. ${formatLaTeXToUnicode(q.question)}\n`;
          q.options.forEach((opt, idx) => {
            markdown += `- [${idx === q.correctAnswerIndex ? 'x' : ' '}] ${String.fromCharCode(65 + idx)}. ${formatLaTeXToUnicode(opt)}\n`;
          });
          markdown += `\n> **Explanation:** ${formatLaTeXToUnicode(q.explanation)}\n\n---\n\n`;
        });
      } else if (type === 'summary') {
        markdown = `# TOPIC SUMMARY: ${title}\n\n## Metadata\n- **Subject:** ${subject}\n- **Grade:** ${grade}\n- **Date:** ${dateStr}\n\n---\n\n${String(data)}`;
      } else if (type === 'homework') {
        markdown = `# HOMEWORK SOLUTION: ${title}\n\n## Metadata\n- **Subject:** ${subject}\n- **Grade:** ${grade}\n- **Date:** ${dateStr}\n- **Query Asked:** "${meta.query || 'N/A'}"\n\n---\n\n## Solution\n${String(data)}`;
      } else if (type === 'tutor') {
        const msgs = data as ChatMessage[];
        markdown = `# AI TUTOR CHAT TRANSCRIPT: ${title}\n\n## Metadata\n- **Subject:** ${subject}\n- **Grade:** ${grade}\n- **Date:** ${dateStr}\n\n---\n\n`;
        msgs.forEach(m => {
          const roleName = m.role === 'user' ? 'Student' : 'AI Tutor';
          markdown += `### ${roleName} (${formatDate(m.timestamp)})\n${m.text}\n\n`;
        });
      }

      generateBeautifulPdf(markdown, title, subject, dateStr, fileNameBase);
      return;
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("PDF generation encountered an error. Falling back to plain text download.");
      // Fallback to plain text
      format = 'txt';
      mimeType = 'text/plain;charset=utf-8';
      extension = 'txt';
    }
  }

  // Fallback / Download Trigger
  const element = document.createElement("a");
  const file = new Blob([contentStr], { type: mimeType });
  element.href = URL.createObjectURL(file);
  element.download = `${fileNameBase}.${extension}`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
