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
export const DEFAULT_LOGO_URL = 'https://sjtutorai.vercel.app/logo.png';
export const DEFAULT_FAVICON_URL = 'https://sjtutorai.vercel.app/favicon-48x48.png';
export const DEFAULT_TITLE = 'SJ Tutor AI - Your AI Study Buddy';
export const DEFAULT_DESCRIPTION = 'SJ Tutor AI is an all-in-one AI study companion for students.';

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

function updateStructuredData(canonicalUrl: string, title: string, description: string) {
  let scriptEl = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'application/ld+json');
    document.head.appendChild(scriptEl);
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${CANONICAL_BASE_URL}/#organization`,
        "name": "SJ Tutor AI",
        "url": `${CANONICAL_BASE_URL}/`,
        "logo": {
          "@type": "ImageObject",
          "url": DEFAULT_LOGO_URL,
          "contentUrl": DEFAULT_LOGO_URL,
          "caption": "SJ Tutor AI Logo"
        },
        "image": DEFAULT_LOGO_URL
      },
      {
        "@type": "WebSite",
        "@id": `${CANONICAL_BASE_URL}/#website`,
        "url": `${CANONICAL_BASE_URL}/`,
        "name": "SJ Tutor AI",
        "description": DEFAULT_DESCRIPTION,
        "publisher": {
          "@id": `${CANONICAL_BASE_URL}/#organization`
        }
      },
      {
        "@type": "EducationalApplication",
        "@id": `${canonicalUrl}#application`,
        "name": title || "SJ Tutor AI",
        "alternateName": "SJ Tutor",
        "description": description || DEFAULT_DESCRIPTION,
        "url": canonicalUrl,
        "image": DEFAULT_LOGO_URL,
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "All",
        "publisher": {
          "@id": `${CANONICAL_BASE_URL}/#organization`
        }
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
      const canonicalUrl = `${CANONICAL_BASE_URL}${cleanPath === '/' ? '/' : cleanPath}`;
      const image = config.image || DEFAULT_LOGO_URL;
      const imageAlt = config.imageAlt || 'SJ Tutor AI Logo';
      const ogType = config.ogType || 'website';

      // 1. Title
      document.title = title;
      ensureMetaTag('title', title);

      // 2. Standard Meta
      ensureMetaTag('description', description);
      if (config.keywords && config.keywords.length > 0) {
        ensureMetaTag('keywords', config.keywords.join(', '));
      }

      // 3. Robots indexing
      if (config.noindex) {
        ensureMetaTag('robots', 'noindex, nofollow');
      } else {
        ensureMetaTag('robots', 'index, follow');
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
        };
      case '/about':
        return {
          title: 'About Us - SJ Tutor AI | Empowering Students with Intelligent Learning',
          description: 'Learn about SJ Tutor AI, our mission to democratize quality education, and the team pioneered by Sadanand Jyoti & Samanyu S Patil.',
          canonicalPath: '/about',
        };
      case '/features':
        return {
          title: 'Features & Tools - SJ Tutor AI | AI Study Companion',
          description: 'Explore instant chapter summaries, interactive practice quizzes, scan-to-solve homework help, and 24/7 AI tutor assistance.',
          canonicalPath: '/features',
        };
      case '/contact':
        return {
          title: 'Contact Us - SJ Tutor AI | Student Support & Inquiries',
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
          title: 'Dashboard - SJ Tutor AI | Your AI Study Companion',
          description: 'Access your personalized learning dashboard, recent study history, quick study tools, and academic streak.',
          canonicalPath: '/dashboard',
          noindex: true,
        };
      case '/tutor':
      case '/chat':
        return {
          title: 'AI Tutor Chat - 24/7 Academic Study Buddy | SJ Tutor AI',
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
        };
    }
  }
};
