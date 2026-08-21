/**
 * High-performance educational SVG diagram and illustration generator for Quiz Questions.
 * Provides crisp, zero-latency vector illustrations tailored to subject, chapter, and question topics.
 */

export interface DiagramConfig {
  subject: string;
  chapter?: string;
  question?: string;
  index?: number;
}

export function generateEducationalDiagramSvg(config: DiagramConfig): string {
  const { subject = '', chapter = '', question = '', index = 0 } = config;
  const subLower = subject.toLowerCase();
  const chapLower = chapter.toLowerCase();
  const qLower = question.toLowerCase();

  const primaryColor = "#2563EB";
  const secondaryColor = "#7C3AED";
  const accentColor = "#06B6D4";
  const emeraldColor = "#10B981";
  const amberColor = "#F59E0B";
  const roseColor = "#F43F5E";

  const safeSubject = escapeXml(subject || 'Academic Study');
  const safeChapter = escapeXml(chapter || 'Concept Analysis');
  const safeTitle = escapeXml((question.length > 55 ? question.slice(0, 52) + '...' : question) || `${subject} Visual Context`);

  // Detect topic domain
  const isMath = subLower.includes('math') || chapLower.includes('algebra') || chapLower.includes('geometry') || chapLower.includes('calculus') || chapLower.includes('trigonometry') || qLower.includes('triangle') || qLower.includes('angle') || qLower.includes('matrix');
  const isPhysics = subLower.includes('physic') || chapLower.includes('motion') || chapLower.includes('light') || chapLower.includes('electric') || chapLower.includes('circuit') || chapLower.includes('force') || chapLower.includes('energy') || qLower.includes('volt') || qLower.includes('ray');
  const isChem = subLower.includes('chem') || chapLower.includes('reaction') || chapLower.includes('acid') || chapLower.includes('bond') || chapLower.includes('organic') || chapLower.includes('periodic') || qLower.includes('element') || qLower.includes('molecule');
  const isBio = subLower.includes('bio') || chapLower.includes('cell') || chapLower.includes('plant') || chapLower.includes('human') || chapLower.includes('genetics') || chapLower.includes('organ') || chapLower.includes('dna') || qLower.includes('photosynthesis');
  const isHistory = subLower.includes('hist') || subLower.includes('civic') || subLower.includes('social') || chapLower.includes('revolution') || chapLower.includes('war') || chapLower.includes('empire') || chapLower.includes('ancient') || chapLower.includes('constitution');
  const isGeo = subLower.includes('geo') || chapLower.includes('climate') || chapLower.includes('earth') || chapLower.includes('river') || chapLower.includes('map') || chapLower.includes('resource') || chapLower.includes('continent');
  const isCS = subLower.includes('computer') || subLower.includes('code') || subLower.includes('program') || chapLower.includes('python') || chapLower.includes('java') || chapLower.includes('binary') || chapLower.includes('data');

  let diagramGraphic = '';

  if (isMath) {
    // Trigonometry / Geometric coordinate / Formula Graphic
    diagramGraphic = `
      <!-- Math Geometric & Coordinate System -->
      <g transform="translate(180, 50)">
        <rect x="0" y="0" width="340" height="200" rx="16" fill="#0F172A" stroke="#334155" stroke-width="2"/>
        <!-- Grid lines -->
        <path d="M 40,20 L 40,180 M 90,20 L 90,180 M 140,20 L 140,180 M 190,20 L 190,180 M 240,20 L 240,180 M 290,20 L 290,180" stroke="#1E293B" stroke-width="1.5" stroke-dasharray="3,3"/>
        <path d="M 20,50 L 320,50 M 20,90 L 320,90 M 20,130 L 320,130 M 20,170 L 320,170" stroke="#1E293B" stroke-width="1.5" stroke-dasharray="3,3"/>
        
        <!-- Axes -->
        <line x1="40" y1="160" x2="310" y2="160" stroke="#94A3B8" stroke-width="2.5" marker-end="url(#arrow)"/>
        <line x1="50" y1="170" x2="50" y2="30" stroke="#94A3B8" stroke-width="2.5" marker-end="url(#arrow)"/>
        <text x="305" y="152" fill="#94A3B8" font-size="12" font-weight="bold">X</text>
        <text x="58" y="38" fill="#94A3B8" font-size="12" font-weight="bold">Y</text>

        <!-- Right Angle / Function Curve / Geometric Shape -->
        <polygon points="70,150 240,150 240,60" fill="rgba(37,99,235,0.18)" stroke="${primaryColor}" stroke-width="3"/>
        <line x1="225" y1="150" x2="225" y2="135" stroke="${accentColor}" stroke-width="2"/>
        <line x1="225" y1="135" x2="240" y2="135" stroke="${accentColor}" stroke-width="2"/>

        <!-- Angle Arc & Label -->
        <path d="M 110,150 A 40,40 0 0,0 102,136" fill="none" stroke="${amberColor}" stroke-width="2.5"/>
        <text x="116" y="142" fill="${amberColor}" font-size="13" font-weight="bold">θ</text>

        <!-- Labels -->
        <text x="145" y="172" fill="#E2E8F0" font-size="13" font-weight="bold">Adjacent (a)</text>
        <text x="250" y="105" fill="#E2E8F0" font-size="13" font-weight="bold">Opposite (b)</text>
        <text x="130" y="95" fill="${accentColor}" font-size="13" font-weight="bold" transform="rotate(-28, 140, 100)">Hypotenuse (c)</text>

        <!-- Formula Badge -->
        <rect x="180" y="12" width="145" height="28" rx="8" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
        <text x="190" y="31" fill="#38BDF8" font-size="12" font-family="monospace" font-weight="bold">a² + b² = c²</text>
      </g>
    `;
  } else if (isPhysics) {
    // Electrical Circuit & Optical Vector Graphic
    diagramGraphic = `
      <!-- Physics Circuit & Force Diagram -->
      <g transform="translate(180, 50)">
        <rect x="0" y="0" width="340" height="200" rx="16" fill="#0F172A" stroke="#334155" stroke-width="2"/>
        
        <!-- Circuit Loop -->
        <rect x="45" y="40" width="250" height="120" rx="6" fill="none" stroke="${primaryColor}" stroke-width="3"/>
        
        <!-- Battery (DC Voltage Source) -->
        <rect x="40" y="80" width="10" height="40" fill="#0F172A"/>
        <line x1="45" y1="85" x2="45" y2="115" stroke="${accentColor}" stroke-width="4"/>
        <line x1="40" y1="92" x2="40" y2="108" stroke="#94A3B8" stroke-width="2.5"/>
        <text x="20" y="97" fill="${accentColor}" font-size="11" font-weight="bold">+ V -</text>

        <!-- Resistor (Zig-zag) -->
        <rect x="130" y="35" width="80" height="10" fill="#0F172A"/>
        <path d="M 130,40 L 140,30 L 150,50 L 160,30 L 170,50 L 180,30 L 190,50 L 200,40 L 210,40" fill="none" stroke="${amberColor}" stroke-width="3"/>
        <text x="155" y="24" fill="${amberColor}" font-size="12" font-weight="bold">R (Ω)</text>

        <!-- Light Bulb / Load -->
        <circle cx="170" cy="160" r="16" fill="rgba(245,158,11,0.15)" stroke="${amberColor}" stroke-width="2.5"/>
        <line x1="160" y1="150" x2="180" y2="170" stroke="${amberColor}" stroke-width="2"/>
        <line x1="160" y1="170" x2="180" y2="150" stroke="${amberColor}" stroke-width="2"/>
        <text x="156" y="192" fill="#E2E8F0" font-size="11" font-weight="bold">Load (I)</text>

        <!-- Current Flow Arrow -->
        <path d="M 75,32 L 105,32" stroke="${emeraldColor}" stroke-width="2.5" marker-end="url(#arrow-emerald)"/>
        <text x="82" y="24" fill="${emeraldColor}" font-size="12" font-weight="bold">I →</text>

        <!-- Formula / Metric -->
        <rect x="235" y="75" width="90" height="50" rx="8" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
        <text x="245" y="96" fill="#F8FAFC" font-size="11" font-weight="bold">Ohm's Law</text>
        <text x="252" y="115" fill="#38BDF8" font-size="13" font-family="monospace" font-weight="bold">V = I · R</text>
      </g>
    `;
  } else if (isChem) {
    // Chemical Molecule / Molecular Orbitals
    diagramGraphic = `
      <!-- Chemistry Molecular Structure -->
      <g transform="translate(180, 50)">
        <rect x="0" y="0" width="340" height="200" rx="16" fill="#0F172A" stroke="#334155" stroke-width="2"/>
        
        <!-- Central Carbon Atom -->
        <circle cx="170" cy="100" r="24" fill="${primaryColor}" stroke="#60A5FA" stroke-width="3"/>
        <text x="163" y="108" fill="#FFFFFF" font-size="20" font-weight="bold">C</text>

        <!-- Hydrogen Atoms connected with covalent bonds -->
        <!-- Top H -->
        <line x1="170" y1="76" x2="170" y2="38" stroke="#64748B" stroke-width="4"/>
        <circle cx="170" cy="30" r="16" fill="${accentColor}" stroke="#A5F3FC" stroke-width="2"/>
        <text x="164" y="36" fill="#0F172A" font-size="15" font-weight="bold">H</text>

        <!-- Bottom H -->
        <line x1="170" y1="124" x2="170" y2="162" stroke="#64748B" stroke-width="4"/>
        <circle cx="170" cy="170" r="16" fill="${accentColor}" stroke="#A5F3FC" stroke-width="2"/>
        <text x="164" y="176" fill="#0F172A" font-size="15" font-weight="bold">H</text>

        <!-- Left H -->
        <line x1="146" y1="100" x2="98" y2="100" stroke="#64748B" stroke-width="4"/>
        <circle cx="88" cy="100" r="16" fill="${accentColor}" stroke="#A5F3FC" stroke-width="2"/>
        <text x="82" y="106" fill="#0F172A" font-size="15" font-weight="bold">H</text>

        <!-- Right H -->
        <line x1="194" y1="100" x2="242" y2="100" stroke="#64748B" stroke-width="4"/>
        <circle cx="252" cy="100" r="16" fill="${accentColor}" stroke="#A5F3FC" stroke-width="2"/>
        <text x="246" y="106" fill="#0F172A" font-size="15" font-weight="bold">H</text>

        <!-- Bond Angle indicator -->
        <path d="M 190,82 A 28,28 0 0,0 182,76" fill="none" stroke="${amberColor}" stroke-width="2"/>
        <text x="194" y="70" fill="${amberColor}" font-size="11" font-weight="bold">109.5°</text>

        <!-- Molecule Details Box -->
        <rect x="230" y="145" width="98" height="42" rx="8" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
        <text x="240" y="162" fill="#E2E8F0" font-size="11" font-weight="bold">Methane (CH₄)</text>
        <text x="240" y="178" fill="#38BDF8" font-size="10" font-weight="medium">Tetrahedral</text>
      </g>
    `;
  } else if (isBio) {
    // Biological Cell / DNA Strand
    diagramGraphic = `
      <!-- Biological Cell & Organelle Diagram -->
      <g transform="translate(180, 50)">
        <rect x="0" y="0" width="340" height="200" rx="16" fill="#0F172A" stroke="#334155" stroke-width="2"/>
        
        <!-- Cell Membrane Outer Boundary -->
        <ellipse cx="160" cy="100" rx="120" ry="75" fill="rgba(16,185,129,0.08)" stroke="${emeraldColor}" stroke-width="3" stroke-dasharray="6,2"/>
        
        <!-- Nucleus with Nucleolus -->
        <circle cx="140" cy="100" r="38" fill="rgba(124,58,237,0.3)" stroke="${secondaryColor}" stroke-width="2.5"/>
        <circle cx="140" cy="100" r="16" fill="${secondaryColor}"/>
        <text x="122" y="104" fill="#FFFFFF" font-size="10" font-weight="bold">Nucleus</text>

        <!-- Mitochondria (Powerhouse) -->
        <g transform="translate(210, 60) rotate(25)">
          <ellipse cx="0" cy="0" rx="22" ry="12" fill="rgba(244,63,94,0.3)" stroke="${roseColor}" stroke-width="2"/>
          <path d="M -14,0 Q -7,5 0,0 Q 7,-5 14,0" stroke="${roseColor}" stroke-width="1.5" fill="none"/>
        </g>
        <text x="220" y="52" fill="${roseColor}" font-size="10" font-weight="bold">Mitochondria</text>

        <!-- Chloroplast / Vacuole -->
        <ellipse cx="90" cy="65" rx="18" ry="10" fill="rgba(16,185,129,0.3)" stroke="${emeraldColor}" stroke-width="2"/>
        <ellipse cx="215" cy="135" rx="24" ry="15" fill="rgba(6,182,212,0.2)" stroke="${accentColor}" stroke-width="2"/>
        <text x="200" y="140" fill="${accentColor}" font-size="10" font-weight="bold">Vacuole</text>

        <!-- Cell Wall / Membrane label -->
        <text x="60" y="165" fill="${emeraldColor}" font-size="11" font-weight="bold">Cell Membrane</text>
      </g>
    `;
  } else if (isHistory || isGeo) {
    // Chronology / Globe / Geography Map Matrix
    diagramGraphic = `
      <!-- Geography & Historical Timeline Matrix -->
      <g transform="translate(180, 50)">
        <rect x="0" y="0" width="340" height="200" rx="16" fill="#0F172A" stroke="#334155" stroke-width="2"/>
        
        <!-- Globe Coordinate Grids -->
        <circle cx="110" cy="100" r="60" fill="rgba(37,99,235,0.15)" stroke="${primaryColor}" stroke-width="2.5"/>
        <ellipse cx="110" cy="100" rx="60" ry="24" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="3,3"/>
        <ellipse cx="110" cy="100" rx="24" ry="60" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="3,3"/>
        <line x1="50" y1="100" x2="170" y2="100" stroke="${amberColor}" stroke-width="2"/>
        <text x="115" y="95" fill="${amberColor}" font-size="9" font-weight="bold">Equator (0°)</text>

        <!-- Key Milestones / Coordinates panel -->
        <g transform="translate(190, 35)">
          <rect x="0" y="0" width="135" height="130" rx="10" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
          <text x="12" y="24" fill="#F8FAFC" font-size="12" font-weight="bold">Key Attributes</text>
          
          <circle cx="20" cy="48" r="4" fill="${emeraldColor}"/>
          <text x="32" y="52" fill="#CBD5E1" font-size="10">Northern Hemisphere</text>

          <circle cx="20" cy="74" r="4" fill="${accentColor}"/>
          <text x="32" y="78" fill="#CBD5E1" font-size="10">Prime Meridian 0°</text>

          <circle cx="20" cy="100" r="4" fill="${amberColor}"/>
          <text x="32" y="104" fill="#CBD5E1" font-size="10">Time Zone Offset</text>
        </g>
      </g>
    `;
  } else if (isCS) {
    // Computer Science Logic Gate & Flowchart
    diagramGraphic = `
      <!-- Computer Science Logic Gates -->
      <g transform="translate(180, 50)">
        <rect x="0" y="0" width="340" height="200" rx="16" fill="#0F172A" stroke="#334155" stroke-width="2"/>
        
        <!-- AND Gate -->
        <path d="M 60,60 L 90,60 A 25,25 0 0,1 90,110 L 60,110 Z" fill="rgba(37,99,235,0.2)" stroke="${primaryColor}" stroke-width="2.5"/>
        <!-- Inputs A, B -->
        <line x1="35" y1="75" x2="60" y2="75" stroke="#94A3B8" stroke-width="2"/>
        <line x1="35" y1="95" x2="60" y2="95" stroke="#94A3B8" stroke-width="2"/>
        <text x="22" y="79" fill="#E2E8F0" font-size="11" font-weight="bold">A</text>
        <text x="22" y="99" fill="#E2E8F0" font-size="11" font-weight="bold">B</text>

        <!-- Output -->
        <line x1="115" y1="85" x2="160" y2="85" stroke="${accentColor}" stroke-width="2.5"/>
        <text x="125" y="78" fill="${accentColor}" font-size="11" font-weight="bold">A ∧ B</text>

        <!-- Inverter (NOT gate) -->
        <polygon points="160,70 195,85 160,100" fill="rgba(124,58,237,0.2)" stroke="${secondaryColor}" stroke-width="2.5"/>
        <circle cx="200" cy="85" r="4.5" fill="#0F172A" stroke="${secondaryColor}" stroke-width="2"/>
        <line x1="205" y1="85" x2="245" y2="85" stroke="${emeraldColor}" stroke-width="2.5"/>
        <text x="215" y="78" fill="${emeraldColor}" font-size="11" font-weight="bold">Q = (A·B)'</text>

        <!-- Truth Table Preview -->
        <rect x="255" y="45" width="70" height="90" rx="8" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
        <text x="262" y="62" fill="#38BDF8" font-size="10" font-weight="bold">A B | Q</text>
        <text x="262" y="78" fill="#94A3B8" font-size="9" font-family="monospace">0 0 | 1</text>
        <text x="262" y="92" fill="#94A3B8" font-size="9" font-family="monospace">0 1 | 1</text>
        <text x="262" y="106" fill="#94A3B8" font-size="9" font-family="monospace">1 0 | 1</text>
        <text x="262" y="120" fill="#94A3B8" font-size="9" font-family="monospace">1 1 | 0</text>
      </g>
    `;
  } else {
    // General Academic Concept Matrix & Insight Graphic
    diagramGraphic = `
      <!-- General Academic Diagram -->
      <g transform="translate(180, 50)">
        <rect x="0" y="0" width="340" height="200" rx="16" fill="#0F172A" stroke="#334155" stroke-width="2"/>
        
        <!-- Central Core Hub -->
        <circle cx="170" cy="100" r="32" fill="rgba(37,99,235,0.25)" stroke="${primaryColor}" stroke-width="2.5"/>
        <text x="148" y="104" fill="#FFFFFF" font-size="11" font-weight="bold">Concept</text>

        <!-- Surrounding Connected Nodes -->
        <!-- Node 1: Principles -->
        <line x1="170" y1="68" x2="170" y2="35" stroke="#475569" stroke-width="2"/>
        <rect x="125" y="15" width="90" height="26" rx="6" fill="#1E293B" stroke="${accentColor}" stroke-width="1.5"/>
        <text x="138" y="32" fill="#E2E8F0" font-size="10" font-weight="bold">Key Principle</text>

        <!-- Node 2: Applications -->
        <line x1="198" y1="116" x2="245" y2="145" stroke="#475569" stroke-width="2"/>
        <rect x="215" y="145" width="95" height="26" rx="6" fill="#1E293B" stroke="${emeraldColor}" stroke-width="1.5"/>
        <text x="226" y="162" fill="#E2E8F0" font-size="10" font-weight="bold">Application</text>

        <!-- Node 3: Analysis -->
        <line x1="142" y1="116" x2="95" y2="145" stroke="#475569" stroke-width="2"/>
        <rect x="30" y="145" width="95" height="26" rx="6" fill="#1E293B" stroke="${amberColor}" stroke-width="1.5"/>
        <text x="45" y="162" fill="#E2E8F0" font-size="10" font-weight="bold">Analytical Step</text>
      </g>
    `;
  }

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 280" width="100%" height="100%">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090D16" />
          <stop offset="50%" stop-color="#0F172A" />
          <stop offset="100%" stop-color="#1E293B" />
        </linearGradient>

        <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3B82F6" />
          <stop offset="100%" stop-color="#8B5CF6" />
        </linearGradient>

        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
        </marker>

        <marker id="arrow-emerald" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="${emeraldColor}" />
        </marker>
      </defs>

      <!-- Background Canvas -->
      <rect width="700" height="280" rx="20" fill="url(#bgGrad)" stroke="#334155" stroke-width="2"/>

      <!-- Decorative Ambient Glows -->
      <circle cx="80" cy="60" r="90" fill="rgba(37,99,235,0.08)" />
      <circle cx="620" cy="220" r="110" fill="rgba(124,58,237,0.08)" />

      <!-- Left Info Panel -->
      <g transform="translate(30, 45)">
        <!-- Topic Tag Badge -->
        <rect x="0" y="0" width="125" height="26" rx="13" fill="url(#badgeGrad)"/>
        <text x="12" y="17" fill="#FFFFFF" font-size="11" font-weight="900" letter-spacing="0.5">QUESTION ${index + 1}</text>

        <!-- Subject Header -->
        <text x="0" y="55" fill="#38BDF8" font-size="15" font-weight="bold">${safeSubject}</text>
        <text x="0" y="78" fill="#F8FAFC" font-size="13" font-weight="semibold">${safeChapter}</text>

        <!-- Divider -->
        <line x1="0" y1="94" x2="130" y2="94" stroke="#334155" stroke-width="1.5"/>

        <!-- Prompt hint / Question Subtext -->
        <text x="0" y="118" fill="#94A3B8" font-size="11" font-weight="medium">${safeTitle.slice(0, 24)}</text>
        <text x="0" y="134" fill="#94A3B8" font-size="11" font-weight="medium">Contextual Reference</text>

        <rect x="0" y="152" width="130" height="32" rx="8" fill="#1E293B" stroke="#475569" stroke-width="1"/>
        <text x="10" y="172" fill="#A78BFA" font-size="10" font-weight="bold">🔍 Visual Reference</text>
      </g>

      <!-- Center / Right Diagram Body -->
      ${diagramGraphic}

      <!-- Bottom Status Bar -->
      <g transform="translate(30, 255)">
        <text x="0" y="0" fill="#64748B" font-size="10" font-weight="semibold">SJ TUTOR AI • EXAM VISUALIZATION MATRIX</text>
        <text x="640" y="0" text-anchor="end" fill="#64748B" font-size="10" font-family="monospace">FIG-${index + 1}.0</text>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
