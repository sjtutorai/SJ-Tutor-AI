/**
 * SJ Tutor AI - SEO Service & Dynamic Metadata Engine
 * Ensures canonical consistency (https://sjtutorai.vercel.app), dynamic title/meta synchronization,
 * Open Graph, Twitter cards, and Schema.org JSON-LD structured data.
 */

export interface SEOConfig {
  title?: string;
  description?: string;
  canonicalPath?: string;
  keywords?: string[];
  ogType?: string;
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
}

export const CANONICAL_BASE_URL = 'https://sjtutorai.vercel.app';
export const getCanonicalBaseUrl = (): string => {
  return CANONICAL_BASE_URL;
};

export const DEFAULT_LOGO_URL = 'https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg';
export const DEFAULT_OG_IMAGE = 'https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg';
export const DEFAULT_FAVICON_URL = 'https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg';
export const DEFAULT_TITLE = 'SJ Tutor AI – AI-Powered Learning Assistant for Students';
export const DEFAULT_DESCRIPTION = 'SJ Tutor AI is an AI-powered learning assistant that helps students understand concepts, solve doubts, practice questions, revise lessons, and prepare for exams.';

export const DEFAULT_KEYWORDS = [
  'SJ Tutor AI',
  'Personalised AI Tutor for Students',
  'Personalized AI Tutor for Students',
  'AI Tutor for Students',
  'Personalised AI Tutor',
  'Personalized AI Tutor',
  'AI Study Buddy',
  'AI Study Companion',
  'Homework Helper',
  'Scan to Solve AI',
  'SJTutor',
  'SJ Tutor',
  'AI Homework Solver',
  'Student AI Tutor',
  'CBSE AI Tutor',
  'ICSE AI Tutor',
  'College AI Tutor',
  'Sadanand Jyoti',
  'Samanyu S Patil'
];

function ensureMetaTag(nameOrProperty: string, value: string, isProperty = false) {
  const selector = isProperty 
    ? `meta[property="${nameOrProperty}"]` 
    : `meta[name="${nameOrProperty}"]`;
  
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    if (isProperty) {
      el.setAttribute('property', nameOrProperty);
    } else {
      el.setAttribute('name', nameOrProperty);
    }
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function ensureCanonicalLink(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function ensureFaviconLinks() {
  // Clear any existing PNG/ICO links to ensure consistent logo display
  if (typeof document !== 'undefined') {
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel*="apple-touch-icon"]').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href.includes('.png') || href.includes('.ico')) {
        link.remove();
      }
    });
  }

  const icons = [
    { rel: 'icon', type: 'image/jpeg', href: 'https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg' },
    { rel: 'shortcut icon', type: 'image/jpeg', href: 'https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg' },
    { rel: 'apple-touch-icon', href: 'https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg' },
    { rel: 'apple-touch-icon-precomposed', href: 'https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg' },
  ];

  icons.forEach(({ rel, type, href }) => {
    const selector = `link[rel="${rel}"][href="${href}"]`;
    let el = document.querySelector(selector) as HTMLLinkElement | null;
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      if (type) el.setAttribute('type', type);
      el.setAttribute('href', href);
      document.head.appendChild(el);
    }
  });
}

function updateStructuredData(canonicalUrl: string, title: string, description: string) {
  let scriptEl = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'application/ld+json');
    document.head.appendChild(scriptEl);
  }

  const baseUrl = getCanonicalBaseUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        "name": "SJ Tutor AI",
        "alternateName": ["SJ Tutor", "SJTutorAI", "Personalised AI Tutor for Students", "Personalized AI Tutor for Students"],
        "url": `${baseUrl}/`,
        "logo": {
          "@type": "ImageObject",
          "url": DEFAULT_LOGO_URL,
          "contentUrl": DEFAULT_LOGO_URL,
          "width": 640,
          "height": 640,
          "caption": "SJ Tutor AI Logo - Personalised AI Tutor for Students"
        },
        "image": DEFAULT_LOGO_URL,
        "description": "SJ Tutor AI is an all-in-one personalised AI tutor for students, empowering learners worldwide with curriculum-aligned study materials."
      },
      {
        "@type": "EducationalOrganization",
        "@id": `${baseUrl}/#educational-organization`,
        "name": "SJ Tutor AI",
        "url": `${baseUrl}/`,
        "logo": DEFAULT_LOGO_URL,
        "image": DEFAULT_LOGO_URL,
        "description": "Leading personalised AI tutor for students providing interactive AI tutoring, instant practice quizzes, and scan-to-solve homework help."
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        "url": `${baseUrl}/`,
        "name": "SJ Tutor AI - Personalised AI Tutor for Students",
        "alternateName": ["SJ Tutor AI", "SJ Tutor", "SJTutorAI", "Personalised AI Tutor for Students"],
        "description": DEFAULT_DESCRIPTION,
        "publisher": {
          "@id": `${baseUrl}/#organization`
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${canonicalUrl}#application`,
        "name": "SJ Tutor AI",
        "alternateName": ["SJ Tutor", "Personalised AI Tutor for Students", "SJTutor"],
        "headline": "SJ Tutor AI - Personalised AI Tutor for Students",
        "description": description || DEFAULT_DESCRIPTION,
        "url": canonicalUrl,
        "image": DEFAULT_LOGO_URL,
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Web, Android, iOS, Windows, macOS",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "keywords": DEFAULT_KEYWORDS.join(', '),
        "publisher": {
          "@id": `${baseUrl}/#organization`
        },
        "featureList": [
          "Personalised 1-on-1 AI Tutoring for Students",
          "Scan to Solve Instant Homework Solver",
          "Curriculum-Aligned Notes & Summary Generator",
          "Interactive Practice Quizzes and Flashcards",
          "Voice-Enabled Study Sessions"
        ]
      },
      {
        "@type": "FAQPage",
        "@id": `${baseUrl}/#faq`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is SJ Tutor AI?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "SJ Tutor AI is a personalised AI tutor for students that provides interactive study sessions, instant scan-to-solve homework assistance, curriculum-aligned notes summaries, and practice quizzes."
            }
          },
          {
            "@type": "Question",
            "name": "How does SJ Tutor AI work as a personalised AI tutor for students?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "SJ Tutor AI adapts to each student's grade, learning style, and curriculum. It explains complex concepts step-by-step, tests comprehension with adaptive quizzes, and answers academic questions 24/7."
            }
          },
          {
            "@type": "Question",
            "name": "What keywords find SJ Tutor AI on Google?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Students can search for 'SJ Tutor AI', 'Personalised AI Tutor for Students', 'Personalized AI Tutor for Students', 'AI Tutor for Students', or 'AI Study Companion' to find the SJ Tutor AI app."
            }
          }
        ]
      }
    ]
  };

  scriptEl.textContent = JSON.stringify(structuredData, null, 2);
}

export const SEOService = {
  /**
   * Updates all document head elements with current view SEO attributes.
   */
  updateSEO: (config: SEOConfig = {}) => {
    try {
      const title = config.title ? `${config.title}` : DEFAULT_TITLE;
      const description = config.description || DEFAULT_DESCRIPTION;
      
      // Calculate full canonical URL
      let cleanPath = config.canonicalPath || '';
      if (!cleanPath.startsWith('/')) {
        cleanPath = `/${cleanPath}`;
      }
      if (cleanPath === '/') {
        cleanPath = '/';
      }
      const baseUrl = getCanonicalBaseUrl();
      const canonicalUrl = `${baseUrl}${cleanPath === '/' ? '/' : cleanPath}`;
      const image = config.image || DEFAULT_LOGO_URL;
      const imageAlt = config.imageAlt || 'SJ Tutor AI Logo';
      const ogType = config.ogType || 'website';

      // 1. Title
      document.title = title;
      ensureMetaTag('title', title);

      // 2. Standard Meta
      ensureMetaTag('description', description);
      const keywords = config.keywords && config.keywords.length > 0 
        ? Array.from(new Set([...config.keywords, ...DEFAULT_KEYWORDS]))
        : DEFAULT_KEYWORDS;
      ensureMetaTag('keywords', keywords.join(', '));

      // 3. Robots indexing
      if (config.noindex) {
        ensureMetaTag('robots', 'noindex, nofollow');
      } else {
        ensureMetaTag('robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
      }

      // 4. Canonical Tag
      ensureCanonicalLink(canonicalUrl);

      // 5. Open Graph
      ensureMetaTag('og:site_name', 'SJ Tutor AI', true);
      ensureMetaTag('og:type', ogType, true);
      ensureMetaTag('og:url', canonicalUrl, true);
      ensureMetaTag('og:title', title, true);
      ensureMetaTag('og:description', description, true);
      ensureMetaTag('og:image', image, true);
      ensureMetaTag('og:image:alt', imageAlt, true);

      // 6. Twitter Cards
      ensureMetaTag('twitter:card', 'summary_large_image');
      ensureMetaTag('twitter:title', title);
      ensureMetaTag('twitter:description', description);
      ensureMetaTag('twitter:image', image);

      // 7. Structured Data (JSON-LD)
      updateStructuredData(canonicalUrl, title, description);

      // 8. Ensure Favicon Links are maintained
      ensureFaviconLinks();
    } catch (err) {
      console.warn('[SEO Engine] Error updating page SEO:', err);
    }
  },

  /**
   * Pre-configured metadata presets for application views and modes
   */
  getPresetForRoute: (pathname: string): SEOConfig => {
    const clean = pathname.toLowerCase().replace(/\/$/, '') || '/';

    switch (clean) {
      case '/':
        return {
          title: DEFAULT_TITLE,
          description: DEFAULT_DESCRIPTION,
          canonicalPath: '/',
          keywords: DEFAULT_KEYWORDS,
        };
      case '/about':
        return {
          title: 'About Us - SJ Tutor AI | Personalised AI Tutor for Students',
          description: 'Learn about SJ Tutor AI, the premier personalised AI tutor for students founded by Sadanand Jyoti & Samanyu S Patil.',
          canonicalPath: '/about',
        };
      case '/features':
        return {
          title: 'Features - SJ Tutor AI | Personalised AI Tutor for Students',
          description: 'Explore instant chapter summaries, interactive practice quizzes, scan-to-solve homework help, and 24/7 personalised AI tutoring for students.',
          canonicalPath: '/features',
        };
      case '/contact':
        return {
          title: 'Contact Us - SJ Tutor AI | Personalised AI Tutor for Students Support',
          description: 'Get in touch with the SJ Tutor AI team for inquiries, feedback, or support at sadanandj2011@gmail.com.',
          canonicalPath: '/contact',
        };
      case '/privacy':
        return {
          title: 'Privacy Policy - SJ Tutor AI | Student Safety & Data Protection',
          description: 'Read the SJ Tutor AI privacy policy. Learn how we safeguard student information with encrypted storage and zero third-party data sales.',
          canonicalPath: '/privacy',
        };
      case '/terms':
        return {
          title: 'Terms of Service - SJ Tutor AI | User Agreement',
          description: 'Read our terms of service governing the use of SJ Tutor AI educational services, study tools, and AI learning features.',
          canonicalPath: '/terms',
        };
      case '/dashboard':
        return {
          title: 'Dashboard - SJ Tutor AI | Personalised AI Tutor for Students',
          description: 'Access your personalized learning dashboard, recent study history, quick study tools, and academic streak.',
          canonicalPath: '/dashboard',
          noindex: true,
        };
      case '/tutor':
      case '/chat':
        return {
          title: 'AI Tutor Chat - 24/7 Personalised AI Tutor | SJ Tutor AI',
          description: 'Ask any academic question, solve complex problems, and get step-by-step guidance from your personal AI tutor.',
          canonicalPath: '/tutor',
          noindex: true,
        };
      case '/quiz':
        return {
          title: 'Interactive Quiz Generator & Practice | SJ Tutor AI',
          description: 'Generate customized practice quizzes tailored to your syllabus with multiple choice questions and instant explanations.',
          canonicalPath: '/quiz',
          noindex: true,
        };
      case '/summary':
        return {
          title: 'Instant Chapter & Notes Summarizer | SJ Tutor AI',
          description: 'Turn lengthy textbook chapters, notes, and PDF materials into concise, structured study summaries in seconds.',
          canonicalPath: '/summary',
          noindex: true,
        };
      case '/homework':
        return {
          title: 'Homework Solver & Scan-to-Solve | SJ Tutor AI',
          description: 'Upload homework problems or scan questions for immediate step-by-step breakdowns and solutions.',
          canonicalPath: '/homework',
          noindex: true,
        };
      case '/notes':
        return {
          title: 'Study Notes & Exam Timetable Planner | SJ Tutor AI',
          description: 'Organize study notes, set reminders, and build personalized revision timetables.',
          canonicalPath: '/notes',
          noindex: true,
        };
      case '/timer':
        return {
          title: 'Focus Study Timer & Pomodoro | SJ Tutor AI',
          description: 'Stay disciplined with customizable Pomodoro sessions, study intervals, and focus ambient sounds.',
          canonicalPath: '/timer',
          noindex: true,
        };
      case '/groups':
        return {
          title: 'Study Groups & Peer Collaboration | SJ Tutor AI',
          description: 'Collaborate with classmates in real-time study groups, share quizzes, and solve homework questions together.',
          canonicalPath: '/groups',
          noindex: true,
        };
      default:
        return {
          title: DEFAULT_TITLE,
          description: DEFAULT_DESCRIPTION,
          canonicalPath: clean,
          keywords: DEFAULT_KEYWORDS,
        };
    }
  }
};
