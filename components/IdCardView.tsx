import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserProfile } from '../types';
import Logo from './Logo';
import {
  Download,
  Share2,
  ShieldCheck,
  User,
  Sparkles,
  Printer,
  RotateCw,
  CheckCircle2,
  Award,
  Building,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Copy,
  Check,
  QrCode,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface IdCardViewProps {
  userProfile: UserProfile;
  email?: string | null;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
): number {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return y;
  let line = '';
  let linesDrawn = 0;
  let currY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      linesDrawn += 1;
      if (linesDrawn >= maxLines) {
        let truncated = line;
        while (ctx.measureText(`${truncated}…`).width > maxWidth && truncated.length > 1) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(`${truncated}…`, x, currY);
        return currY + lineHeight;
      }
      ctx.fillText(line, x, currY);
      line = words[i];
      currY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currY);
    currY += lineHeight;
  }
  return currY;
}

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    const timer = setTimeout(() => resolve(null), 4000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function renderSvgToImage(svgEl: SVGSVGElement | null): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!svgEl) {
      resolve(null);
      return;
    }
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgEl);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

const IdCardView: React.FC<IdCardViewProps> = ({ userProfile, email }) => {
  const hiddenQrSvgRef = useRef<SVGSVGElement | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('front');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Generate a consistent student ID when not yet stored, reacting to sjTutorId updates
  const studentId = useMemo(() => {
    if (userProfile.sjTutorId) return userProfile.sjTutorId.trim().toUpperCase();
    if (userProfile.registrationNumber) return userProfile.registrationNumber.trim().toUpperCase();
    const base = userProfile.uid || email || userProfile.email || userProfile.displayName || 'student';
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = (hash << 5) - hash + base.charCodeAt(i);
      hash |= 0;
    }
    const suffix = Math.abs(hash).toString().substring(0, 6).padStart(6, '0');

    const displayName = userProfile.displayName || userProfile.name || '';
    const names = displayName.trim().split(/\s+/).filter(Boolean);
    const firstName = names[0] || 'S';
    const lastName = names[names.length - 1] || 'J';
    const firstLetter = firstName.charAt(0).toUpperCase() || 'S';
    const surnameLetter = lastName.charAt(0).toUpperCase() || 'J';

    return `SJ-${firstLetter}${surnameLetter}-${suffix}`;
  }, [
    userProfile.sjTutorId,
    userProfile.registrationNumber,
    userProfile.uid,
    email,
    userProfile.email,
    userProfile.displayName,
    userProfile.name,
  ]);

  const effectiveEmail = email || userProfile.email || 'student@sjtutor.ai';
  const effectiveName = userProfile.displayName || userProfile.name || 'SJ Tutor Student';
  const effectivePlan = userProfile.planType || 'Scholar';
  const effectiveInstitution = userProfile.institution || 'SJ Tutor AI Academy';
  const effectiveGrade = userProfile.grade || (userProfile as any).classGrade || '10th Grade';
  const effectiveBoard = userProfile.board || '';
  const effectivePhone = userProfile.phoneNumber || 'Not Provided';
  const effectiveRegion = `${userProfile.district ? `${userProfile.district}, ` : ''}${userProfile.state || 'India'}`;

  // Auto-persist generated studentId to Firestore & localStorage so QR / manual ID Card login always finds this user
  useEffect(() => {
    const uid = userProfile.uid;
    if (!uid || !studentId || studentId.includes('/')) return;

    const persistIdMapping = async () => {
      try {
        // Update local cached profile if missing sjTutorId
        const cacheKey = `profile_${uid}`;
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (!parsed.sjTutorId || !parsed.registrationNumber)) {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                ...parsed,
                sjTutorId: parsed.sjTutorId || studentId,
                registrationNumber: parsed.registrationNumber || studentId,
              })
            );
          }
        }
      } catch {
        // ignore storage errors
      }

      try {
        await Promise.allSettled([
          !userProfile.sjTutorId
            ? setDoc(
                doc(db, 'users', uid),
                {
                  sjTutorId: studentId,
                  registrationNumber: userProfile.registrationNumber || studentId,
                },
                { merge: true }
              )
            : Promise.resolve(),
          setDoc(
            doc(db, 'sj_tutor_ids', studentId.toUpperCase()),
            {
              sjTutorId: studentId.toUpperCase(),
              userId: uid,
              displayName: effectiveName,
              email: effectiveEmail.toLowerCase(),
              phoneNumber: userProfile.phoneNumber || '',
              updatedAt: Date.now(),
            },
            { merge: true }
          ),
        ]);
      } catch {
        // ignore offline Firestore write error
      }
    };

    persistIdMapping();
  }, [
    userProfile.uid,
    userProfile.sjTutorId,
    userProfile.registrationNumber,
    userProfile.phoneNumber,
    studentId,
    effectiveName,
    effectiveEmail,
  ]);

  // Valid until calculation (1 year from now)
  const validUntilDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  }, []);

  // Compact, reliable QR payload (fits cleanly in low-density QR for effortless scanning)
  const qrData = useMemo(
    () =>
      JSON.stringify({
        app: 'SJ Tutor AI',
        id: studentId,
        uid: userProfile.uid || undefined,
        name: effectiveName,
        email: effectiveEmail,
        grade: effectiveGrade,
        plan: effectivePlan,
        institution: effectiveInstitution,
        phone: userProfile.phoneNumber || undefined,
        verified: true,
      }),
    [
      studentId,
      userProfile.uid,
      effectiveName,
      effectiveEmail,
      effectiveGrade,
      effectivePlan,
      effectiveInstitution,
      userProfile.phoneNumber,
    ]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyStudentId = async () => {
    try {
      await navigator.clipboard.writeText(studentId);
      setCopiedId(true);
      showToast(`Copied ID: ${studentId}`);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      showToast(`Your ID: ${studentId}`);
    }
  };

  /**
   * Self-contained high-definition HTML5 Canvas ID Card renderer (1360x840px).
   * Immune to Tailwind v4 oklch() incompatibilities and external CORS image taints.
   */
  const renderCardToCanvas = async (side: 'front' | 'back'): Promise<HTMLCanvasElement> => {
    const W = 1360;
    const H = 840;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Outer card clipping
    drawRoundedRect(ctx, 0, 0, W, H, 48);
    ctx.save();
    ctx.clip();

    // Rich dark navy background
    ctx.fillStyle = '#090E17';
    ctx.fillRect(0, 0, W, H);

    // Ambient radial glows
    const glow1 = ctx.createRadialGradient(
      side === 'front' ? W * 0.85 : W * 0.15,
      H * 0.15,
      10,
      side === 'front' ? W * 0.85 : W * 0.15,
      H * 0.15,
      540
    );
    glow1.addColorStop(0, 'rgba(59, 130, 246, 0.24)');
    glow1.addColorStop(1, 'rgba(9, 14, 23, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(
      side === 'front' ? W * 0.15 : W * 0.85,
      H * 0.85,
      10,
      side === 'front' ? W * 0.15 : W * 0.85,
      H * 0.85,
      460
    );
    glow2.addColorStop(
      0,
      side === 'front' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.18)'
    );
    glow2.addColorStop(1, 'rgba(9, 14, 23, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // Subtle security dot pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let gx = 24; gx < W; gx += 36) {
      for (let gy = 24; gy < H; gy += 36) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const qrImg = await renderSvgToImage(hiddenQrSvgRef.current);

    if (side === 'front') {
      // Top header bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(0, 0, W, 136);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 136);
      ctx.lineTo(W, 136);
      ctx.stroke();

      // Brand Emblem Circle
      const brandGrad = ctx.createLinearGradient(56, 28, 136, 108);
      brandGrad.addColorStop(0, '#46D8D1');
      brandGrad.addColorStop(1, '#2563EB');
      drawRoundedRect(ctx, 56, 28, 80, 80, 22);
      ctx.fillStyle = brandGrad;
      ctx.fill();
      ctx.fillStyle = '#08235C';
      drawRoundedRect(ctx, 62, 34, 68, 68, 18);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 32px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SJ', 96, 70);

      // Brand title & subtitle
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 38px system-ui, -apple-system, sans-serif';
      ctx.fillText('SJ Tutor AI', 160, 68);

      // Official pill
      drawRoundedRect(ctx, 372, 40, 114, 32, 8);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#FCD34D';
      ctx.font = '800 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OFFICIAL', 429, 62);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 17px system-ui, -apple-system, sans-serif';
      ctx.fillText('STUDENT IDENTITY CARD  •  GLOBAL ACADEMIC PASS', 160, 104);

      // Right verified badge
      drawRoundedRect(ctx, W - 220, 44, 164, 48, 14);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#6EE7B7';
      ctx.font = '800 19px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓ ID CARD', W - 138, 75);

      // Left column: Photo frame
      const photoX = 64;
      const photoY = 184;
      const photoSize = 264;

      const ringGrad = ctx.createLinearGradient(photoX, photoY + photoSize, photoX + photoSize, photoY);
      ringGrad.addColorStop(0, '#F59E0B');
      ringGrad.addColorStop(1, '#3B82F6');
      drawRoundedRect(ctx, photoX - 6, photoY - 6, photoSize + 12, photoSize + 12, 34);
      ctx.fillStyle = ringGrad;
      ctx.fill();

      ctx.save();
      drawRoundedRect(ctx, photoX, photoY, photoSize, photoSize, 28);
      ctx.clip();
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(photoX, photoY, photoSize, photoSize);

      const avatarImg = await loadImageSafe(userProfile.photoURL || '');
      if (avatarImg) {
        // Cover-crop photo cleanly
        const scale = Math.max(photoSize / avatarImg.width, photoSize / avatarImg.height);
        const dw = avatarImg.width * scale;
        const dh = avatarImg.height * scale;
        ctx.drawImage(
          avatarImg,
          photoX + (photoSize - dw) / 2,
          photoY + (photoSize - dh) / 2,
          dw,
          dh
        );
      } else {
        const initials = effectiveName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0].toUpperCase())
          .join('') || 'ST';
        ctx.fillStyle = '#94A3B8';
        ctx.font = '900 92px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, photoX + photoSize / 2, photoY + photoSize / 2);
      }
      ctx.restore();

      // Plan Badge under photo
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 16px system-ui, -apple-system, sans-serif';
      ctx.fillText('PLAN TYPE', photoX + photoSize / 2, photoY + photoSize + 44);

      const isAchiever = effectivePlan === 'Achiever';
      const isScholar = effectivePlan === 'Scholar';
      drawRoundedRect(ctx, photoX + 12, photoY + photoSize + 58, photoSize - 24, 52, 16);
      ctx.fillStyle = isAchiever
        ? 'rgba(147, 51, 234, 0.32)'
        : isScholar
        ? 'rgba(37, 99, 235, 0.32)'
        : 'rgba(217, 119, 6, 0.32)';
      ctx.fill();
      ctx.strokeStyle = isAchiever
        ? 'rgba(192, 132, 252, 0.6)'
        : isScholar
        ? 'rgba(96, 165, 250, 0.6)'
        : 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(effectivePlan.toUpperCase(), photoX + photoSize / 2, photoY + photoSize + 92);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '600 18px system-ui, -apple-system, sans-serif';
      ctx.fillText('🎓 Active Student', photoX + photoSize / 2, photoY + photoSize + 144);

      // Right details column
      const colX = 388;
      const colW = W - colX - 60;
      ctx.textAlign = 'left';

      // Name & Email
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 46px system-ui, -apple-system, sans-serif';
      const afterNameY = drawWrappedText(ctx, effectiveName.toUpperCase(), colX, 224, colW, 50, 2);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '500 24px system-ui, -apple-system, sans-serif';
      ctx.fillText(effectiveEmail, colX, afterNameY + 2);

      // Divider
      const div1Y = afterNameY + 26;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(colX, div1Y);
      ctx.lineTo(W - 60, div1Y);
      ctx.stroke();

      // Institution
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 17px system-ui, -apple-system, sans-serif';
      ctx.fillText('INSTITUTION / SCHOOL', colX, div1Y + 34);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '700 24px system-ui, -apple-system, sans-serif';
      drawWrappedText(ctx, effectiveInstitution, colX, div1Y + 66, colW, 30, 1);

      // Grade & Phone row
      const row2Y = div1Y + 116;
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 17px system-ui, -apple-system, sans-serif';
      ctx.fillText('GRADE & BOARD', colX, row2Y);
      ctx.fillText('PHONE', colX + 440, row2Y);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '700 24px system-ui, -apple-system, sans-serif';
      const gradeDisplay = `${effectiveGrade}${effectiveBoard ? ` (${effectiveBoard})` : ''}`;
      drawWrappedText(ctx, gradeDisplay, colX, row2Y + 32, 410, 28, 1);
      ctx.font = '700 23px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(effectivePhone, colX + 440, row2Y + 32);

      // Region
      const row3Y = row2Y + 78;
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 17px system-ui, -apple-system, sans-serif';
      ctx.fillText('REGION / STATE', colX, row3Y);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '700 23px system-ui, -apple-system, sans-serif';
      drawWrappedText(ctx, effectiveRegion, colX, row3Y + 30, 560, 28, 1);

      // Bottom divider
      const div2Y = 582;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(colX, div2Y);
      ctx.lineTo(W - 60, div2Y);
      ctx.stroke();

      // Registration ID & Validity
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 17px system-ui, -apple-system, sans-serif';
      ctx.fillText('REGISTRATION ID', colX, div2Y + 36);
      ctx.fillStyle = '#FBBF24';
      ctx.font = '900 32px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(studentId, colX, div2Y + 76);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 16px system-ui, -apple-system, sans-serif';
      ctx.fillText('VALID UNTIL', colX, div2Y + 124);
      ctx.fillText('STATUS', colX + 220, div2Y + 124);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 22px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(validUntilDate, colX, div2Y + 154);

      ctx.fillStyle = '#34D399';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('✓ Active', colX + 220, div2Y + 154);

      // Large crisp QR Card Box in bottom-right
      const qrBoxSize = 204;
      const qrBoxX = W - qrBoxSize - 56;
      const qrBoxY = H - qrBoxSize - 84;
      drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize + 24, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      if (qrImg) {
        ctx.drawImage(qrImg, qrBoxX + 10, qrBoxY + 8, qrBoxSize - 20, qrBoxSize - 20);
      }
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 14px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN TO VERIFY', qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize + 12);

      // Footer bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, H - 56, W, 56);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SJ TUTOR AI ACADEMIC SYSTEM', 56, H - 22);
      ctx.textAlign = 'right';
      ctx.font = '700 16px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText('VERIFIED  •  DIGITAL CREDENTIAL', W - 56, H - 22);
    } else {
      // BACK SIDE RENDERING
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, W, 96);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 96);
      ctx.lineTo(W, 96);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 18px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText('SECURITY STRIPE  •  ACADEMIC VERIFICATION TOKEN', 56, 56);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FBBF24';
      ctx.font = '800 22px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(studentId, W - 56, 56);

      // Terms heading
      ctx.textAlign = 'left';
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('🛡️  TERMS & CONDITIONS OF DIGITAL MEMBERSHIP', 56, 156);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('1. This Digital Identity Card is non-transferable and remains official property of SJ Tutor AI.', 56, 200);
      ctx.fillText('2. Cardholder is entitled to personalized AI tutoring, interactive quizzes, and study tools.', 56, 234);
      ctx.fillText('3. For verification inquiries or credential support, contact support@sjtutor.ai.', 56, 268);

      // Two info panels + Verification QR on right
      const panelY = 314;
      const panelH = 228;

      // Helpline panel
      drawRoundedRect(ctx, 56, panelY, 440, panelH, 24);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 16px system-ui, -apple-system, sans-serif';
      ctx.fillText('ACADEMIC SUPPORT HELPLINE', 84, panelY + 42);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('SJ Tutor AI Learning Support', 84, panelY + 86);
      ctx.fillStyle = '#FCD34D';
      ctx.font = '700 24px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText('+91 8105423488', 84, panelY + 130);
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('sjtutorai@gmail.com', 84, panelY + 170);

      // Issuing Authority panel
      drawRoundedRect(ctx, 524, panelY, 470, panelH, 24);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 16px system-ui, -apple-system, sans-serif';
      ctx.fillText('ISSUING AUTHORITY', 552, panelY + 42);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('Office of Academic Credentials', 552, panelY + 86);
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('SJ Tutor AI Global Education', 552, panelY + 122);

      ctx.fillStyle = '#34D399';
      ctx.font = '800 18px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText('✓ DIGITALLY SIGNED', 552, panelY + 188);
      ctx.fillStyle = '#64748B';
      ctx.fillText('AUTH-ID: 25112011', 790, panelY + 188);

      // Back QR code box (so scanning EITHER front or back logs in!)
      const backQrSize = 228;
      const backQrX = W - backQrSize - 56;
      drawRoundedRect(ctx, backQrX, panelY, backQrSize, backQrSize, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      if (qrImg) {
        ctx.drawImage(qrImg, backQrX + 12, panelY + 10, backQrSize - 24, backQrSize - 40);
      }
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 14px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QUICK LOGIN QR', backQrX + backQrSize / 2, panelY + backQrSize - 12);

      // Barcode Strip
      const barW = 540;
      const barX = (W - barW) / 2;
      const barY = 602;
      drawRoundedRect(ctx, barX, barY, barW, 84, 14);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.stroke();

      // Draw crisp vector barcode bars
      ctx.fillStyle = '#E2E8F0';
      let bx = barX + 34;
      const pattern = [4, 2, 6, 2, 3, 5, 2, 4, 6, 3, 2, 5, 4, 2, 6, 2, 4, 3, 5, 2, 4, 6, 2, 3, 5, 4, 2, 6, 3, 2, 4];
      for (let i = 0; i < pattern.length && bx < barX + barW - 40; i++) {
        const w = pattern[i] * 2;
        if (i % 2 === 0) {
          ctx.fillRect(bx, barY + 16, w, 52);
        }
        bx += w + 4;
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 17px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(`${studentId}  •  VALID IN ALL LEARNING HUBS`, W / 2, barY + 118);

      // Footer
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, H - 56, W, 56);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 16px system-ui, -apple-system, sans-serif';
      ctx.fillText('WWW.SJTUTOR.AI  •  OFFICIAL DIGITAL VERIFICATION SYSTEM', W / 2, H - 22);
    }

    ctx.restore();

    // Subtle crisp outer border
    drawRoundedRect(ctx, 1, 1, W - 2, H - 2, 48);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();

    return canvas;
  };

  const triggerPngDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSide = async (side: 'front' | 'back') => {
    setIsDownloading(true);
    try {
      const canvas = await renderCardToCanvas(side);
      const dataUrl = canvas.toDataURL('image/png');
      const cleanName = effectiveName.replace(/[^a-zA-Z0-9]/g, '_') || 'Student';
      triggerPngDownload(dataUrl, `SJ_Tutor_ID_${cleanName}_${side.toUpperCase()}.png`);
      showToast(`Downloaded ${side} side in Ultra-HD PNG!`);
    } catch (err) {
      console.error('Failed to download ID card:', err);
      showToast('Could not generate image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      const cleanName = effectiveName.replace(/[^a-zA-Z0-9]/g, '_') || 'Student';
      const frontCanvas = await renderCardToCanvas('front');
      triggerPngDownload(frontCanvas.toDataURL('image/png'), `SJ_Tutor_ID_${cleanName}_FRONT.png`);
      await new Promise((r) => setTimeout(r, 350));
      const backCanvas = await renderCardToCanvas('back');
      triggerPngDownload(backCanvas.toDataURL('image/png'), `SJ_Tutor_ID_${cleanName}_BACK.png`);
      showToast('Downloaded complete Front & Back ID Card set!');
    } catch (err) {
      console.error('Failed to download ID card set:', err);
      showToast('Could not generate ID card set. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadQrOnly = async () => {
    setIsDownloading(true);
    try {
      const qrImg = await renderSvgToImage(hiddenQrSvgRef.current);
      if (!qrImg) throw new Error('QR not ready');
      const size = 600;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size + 90;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(qrImg, 30, 20, size - 60, size - 60);
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 24px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(studentId, size / 2, size + 25);
      ctx.fillStyle = '#475569';
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillText(`${effectiveName} • SJ Tutor AI`, size / 2, size + 58);

      const cleanName = effectiveName.replace(/[^a-zA-Z0-9]/g, '_') || 'Student';
      triggerPngDownload(canvas.toDataURL('image/png'), `SJ_Tutor_QR_${cleanName}.png`);
      showToast('Downloaded high-contrast QR code!');
    } catch (err) {
      console.error('Failed to download QR:', err);
      showToast('Could not export QR code.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `Official Verified Student ID Card — SJ Tutor AI\nStudent: ${effectiveName}\nID: ${studentId}\nPlan: ${effectivePlan}\nInstitution: ${effectiveInstitution}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${effectiveName}'s SJ Tutor AI Student ID`,
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard if cancelled or blocked in iframe
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Student ID details copied to clipboard!');
    } catch {
      showToast(`Student ID: ${studentId}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Offscreen crisp QR SVG always mounted for Canvas HD exports */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: 240,
          height: 240,
          pointerEvents: 'none',
          opacity: 0,
        }}
      >
        <QRCodeSVG
          ref={hiddenQrSvgRef}
          value={qrData}
          size={240}
          level="M"
          includeMargin={true}
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-400/40 text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            <span>Student Identity Card</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Verified Credential
            </span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official high-definition verifiable student badge with instant QR login support.
          </p>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveSide('front')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSide === 'front'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Front Side
          </button>
          <button
            type="button"
            onClick={() => setActiveSide('back')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSide === 'back'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Back Side
          </button>
          <button
            type="button"
            onClick={() => setActiveSide('both')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSide === 'both'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Both Sides
          </button>
        </div>
      </div>

      {/* Main ID Cards Canvas Container */}
      <div className="flex flex-col items-center justify-center gap-8 my-4">
        {/* FRONT SIDE ID CARD */}
        {(activeSide === 'front' || activeSide === 'both') && (
          <div className="w-full flex flex-col items-center">
            {activeSide === 'both' && (
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Card Front
              </span>
            )}

            <div
              id="student-id-card-front"
              className="relative w-full max-w-[680px] rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-950 text-white select-none transition-all duration-300"
              style={{
                background:
                  'radial-gradient(circle at 85% 15%, rgba(59, 130, 246, 0.18), transparent 45%), radial-gradient(circle at 15% 85%, rgba(245, 158, 11, 0.15), transparent 45%), #090E17',
              }}
            >
              {/* Micro Guilloché Security Wave Pattern Background */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #090e17 1px)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px',
                }}
              />

              {/* Decorative Accent Glows */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* TOP HEADER BAR */}
              <div className="relative z-10 px-6 sm:px-8 pt-6 pb-4 flex items-center justify-between border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg p-1 overflow-hidden">
                    <Logo className="w-full h-full" iconOnly noBorder />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg sm:text-xl tracking-tight text-white">SJ Tutor AI</h3>
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                        Official
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Student Identity Card • Global Academic Pass
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <div className="bg-emerald-500/15 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black border border-emerald-400/40 text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ID CARD</span>
                  </div>
                </div>
              </div>

              {/* MAIN CONTENT BODY */}
              <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                {/* LEFT PHOTO COLUMN */}
                <div className="flex flex-row sm:flex-col items-center gap-4 sm:gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="relative group">
                    <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-500 to-blue-500 rounded-3xl blur-xs opacity-60 group-hover:opacity-100 transition duration-300" />
                    <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-slate-900 border-2 border-white/40 overflow-hidden shadow-2xl flex items-center justify-center">
                      {userProfile.photoURL ? (
                        <img
                          src={userProfile.photoURL}
                          alt={effectiveName}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                          <User className="w-14 h-14" />
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-1 text-slate-500">
                            Student
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-60 pointer-events-none" />
                    </div>
                  </div>

                  {/* Plan Badge & Status */}
                  <div className="flex flex-col items-center sm:w-36 text-center space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Plan Type
                    </span>
                    <span
                      className={`px-4 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-md w-full border ${
                        effectivePlan === 'Achiever'
                          ? 'bg-purple-600/30 text-purple-200 border-purple-400/50 shadow-purple-900/30'
                          : effectivePlan === 'Scholar'
                          ? 'bg-blue-600/30 text-blue-200 border-blue-400/50 shadow-blue-900/30'
                          : 'bg-amber-600/30 text-amber-200 border-amber-400/50 shadow-amber-900/30'
                      }`}
                    >
                      {effectivePlan}
                    </span>

                    <span className="text-[10px] text-slate-400 font-medium pt-0.5 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-amber-400" />
                      Active Student
                    </span>
                  </div>
                </div>

                {/* RIGHT DETAILS COLUMN */}
                <div className="flex-1 w-full flex flex-col justify-between space-y-4">
                  {/* Name & Email */}
                  <div className="space-y-0.5">
                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-none drop-shadow-sm break-words">
                      {effectiveName}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium truncate pt-1 opacity-90">
                      {effectiveEmail}
                    </p>
                  </div>

                  {/* Academic Details 2-Column Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t border-white/10">
                    <div className="sm:col-span-2">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Building className="w-3 h-3 text-amber-400" /> Institution / School
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug mt-0.5 break-words">
                        {effectiveInstitution}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Award className="w-3 h-3 text-blue-400" /> Grade &amp; Board
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug mt-0.5">
                        {effectiveGrade} {effectiveBoard ? `(${effectiveBoard})` : ''}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" /> Phone
                      </span>
                      <p className="text-xs sm:text-sm font-mono font-bold text-slate-100 leading-snug mt-0.5">
                        {effectivePhone}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-400" /> Region / State
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug mt-0.5">
                        {effectiveRegion}
                      </p>
                    </div>
                  </div>

                  {/* BOTTOM ROW: REGISTRATION ID, VALIDITY, QR CODE */}
                  <div className="pt-3 border-t border-white/10 flex items-end justify-between gap-4">
                    <div className="space-y-2">
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Registration ID
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm sm:text-base font-mono font-black tracking-wider text-amber-400 leading-none select-all">
                            {studentId}
                          </p>
                          <button
                            type="button"
                            onClick={handleCopyStudentId}
                            title="Copy Registration ID"
                            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
                          >
                            {copiedId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 text-slate-400" /> Valid Until
                          </span>
                          <p className="text-[11px] sm:text-xs font-mono font-bold text-slate-200 mt-0.5">
                            {validUntilDate}
                          </p>
                        </div>

                        <div>
                          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Status
                          </span>
                          <p className="text-[11px] sm:text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* High Contrast Scannable QR Code Container */}
                    <div className="flex flex-col items-center bg-white p-1.5 rounded-2xl shadow-xl border-2 border-white/90 shrink-0">
                      <QRCodeSVG
                        value={qrData}
                        size={104}
                        level="M"
                        includeMargin={true}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                      <span className="text-[7px] font-black text-slate-800 uppercase tracking-tighter mt-0.5 font-mono">
                        SCAN TO VERIFY
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD FOOTER WATERMARK BAR */}
              <div className="px-6 sm:px-8 py-2.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                <span>SJ TUTOR AI ACADEMIC SYSTEM</span>
                <span className="font-mono">VERIFIED • DIGITAL CREDENTIAL</span>
              </div>
            </div>
          </div>
        )}

        {/* BACK SIDE ID CARD */}
        {(activeSide === 'back' || activeSide === 'both') && (
          <div className="w-full flex flex-col items-center">
            {activeSide === 'both' && (
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Card Back
              </span>
            )}

            <div
              id="student-id-card-back"
              className="relative w-full max-w-[680px] rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-950 text-white select-none transition-all duration-300"
              style={{
                background:
                  'radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.15), transparent 40%), radial-gradient(circle at 85% 85%, rgba(16, 185, 129, 0.15), transparent 40%), #090E17',
              }}
            >
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #090e17 1px)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px',
                }}
              />

              <div className="w-full h-12 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6">
                <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                  SECURITY STRIPE • ACADEMIC VERIFICATION TOKEN
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">{studentId}</span>
              </div>

              <div className="p-6 sm:p-8 space-y-5 relative z-10">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Terms &amp; Conditions of Digital Membership
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    1. This Digital Identity Card is non-transferable and remains the official digital property of SJ Tutor AI.
                    <br />
                    2. Cardholder is entitled to personalized AI tutoring sessions, interactive quiz evaluations, and study resource access.
                    <br />
                    3. For verification inquiries or loss of credentials, contact the academic helpline at{' '}
                    <strong>support@sjtutor.ai</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10 items-stretch">
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Academic Support Helpline
                    </span>
                    <p className="text-xs font-bold text-white">SJ Tutor AI Support</p>
                    <p className="text-xs font-mono text-amber-300 mt-0.5">+91 8105423488</p>
                    <p className="text-[11px] text-slate-400 truncate">sjtutorai@gmail.com</p>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Issuing Authority
                      </span>
                      <p className="text-xs font-bold text-white">Academic Credentials</p>
                      <p className="text-[11px] text-slate-400">SJ Tutor AI Global</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-2">
                      <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> SIGNED
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">25112011</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-white p-2 rounded-2xl border border-white/80">
                    <QRCodeSVG
                      value={qrData}
                      size={88}
                      level="M"
                      includeMargin={true}
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                    <span className="text-[7px] font-black text-slate-800 uppercase tracking-tighter font-mono">
                      QUICK LOGIN QR
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col items-center justify-center">
                  <div className="h-10 w-64 bg-white/20 rounded flex items-center justify-center tracking-[6px] font-mono text-xs text-slate-300 font-bold border border-white/20">
                    ||| | |||| || ||| |||| | ||
                  </div>
                  <span className="text-[8px] font-mono text-slate-400 mt-1 uppercase tracking-wider">
                    {studentId} • VALID IN ALL LEARNING HUBS
                  </span>
                </div>
              </div>

              <div className="px-6 sm:px-8 py-2.5 bg-black/40 border-t border-white/5 text-center text-[9px] text-slate-400">
                WWW.SJTUTOR.AI • OFFICIAL DIGITAL VERIFICATION SYSTEM
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons Toolbar */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => handleDownloadSide('front')}
          disabled={isDownloading}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Front ID (HD PNG)</span>
        </button>

        <button
          type="button"
          onClick={() => handleDownloadSide('back')}
          disabled={isDownloading}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Back Side</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl font-bold text-sm shadow-md transition-all border border-slate-700 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Download Complete Set</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadQrOnly}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span>Download QR</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
          className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-bold text-sm transition-all cursor-pointer"
        >
          <RotateCw className="w-4 h-4 text-slate-500" />
          <span>Flip Card</span>
        </button>
      </div>

      {/* Helpful Info Banner */}
      <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          Scan or upload your downloaded SJ Tutor AI ID Card PNG anytime on the Login screen for instant 1-tap sign-in.
        </p>
      </div>
    </div>
  );
};

export default IdCardView;
