/**
 * SJ Tutor AI - SEO Service & Dynamic Metadata Engine
 * Ensures canonical consistency (https://sjtutor.ai), dynamic title/meta synchronization,
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

export interface SitemapImageEntry {
  loc: string;
  title?: string;
  caption?: string;
  geo_location?: string;
  license?: string;
}

export interface SitemapUrlEntry {
  path: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  lastmod?: string;
  images?: SitemapImageEntry[];
}

export const CANONICAL_BASE_URL = 'https://sjtutor.ai';
export const DEFAULT_LOGO_URL = 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg';
export const DEFAULT_OG_IMAGE = 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg';
export const DEFAULT_FAVICON_URL = 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg';
export const DEFAULT_TITLE = 'SJ Tutor AI - All-in-One AI Study Companion';
export const DEFAULT_DESCRIPTION = 'SJ Tutor AI is an all-in-one AI study companion that generates summaries, practice quizzes, homework solutions, and provides real-time scan-to-solve AI tutoring.';

export const DEFAULT_PUBLIC_SITEMAP_ROUTES: SitemapUrlEntry[] = [
  {
    path: '/',
    changefreq: 'daily',
    priority: 1.0,
    images: [
      {
        loc: DEFAULT_LOGO_URL,
        title: 'SJ Tutor AI Logo - All-in-One AI Study Companion',
        caption: 'Official brand logo for SJ Tutor AI - All-in-One AI Study Companion'
      }
    ]
  },
  {
    path: '/about',
    changefreq: 'weekly',
    priority: 0.8,
    images: [
      {
        loc: DEFAULT_LOGO_URL,
        title: 'SJ Tutor AI Brand Identity - About Us',
        caption: 'SJ Tutor AI logo and team mission'
      }
    ]
  },
  {
    path: '/features',
    changefreq: 'weekly',
    priority: 0.8,
    images: [
      {
        loc: DEFAULT_LOGO_URL,
        title: 'SJ Tutor AI Study Tools & Features',
        caption: 'AI tutoring, quiz generator, summary and homework solver tools'
      }
    ]
  },
  {
    path: '/contact',
    changefreq: 'monthly',
    priority: 0.7,
    images: [
      {
        loc: DEFAULT_LOGO_URL,
        title: 'Contact SJ Tutor AI Support',
        caption: 'SJ Tutor AI contact and developer inquiries'
      }
    ]
  },
  {
    path: '/privacy',
    changefreq: 'monthly',
    priority: 0.5,
    images: [
      {
        loc: DEFAULT_LOGO_URL,
        title: 'SJ Tutor AI Privacy Policy',
        caption: 'SJ Tutor AI student data protection and privacy policy'
      }
    ]
  },
  {
    path: '/terms',
    changefreq: 'monthly',
    priority: 0.5,
    images: [
      {
        loc: DEFAULT_LOGO_URL,
        title: 'SJ Tutor AI Terms of Service',
        caption: 'SJ Tutor AI student agreement and terms of use'
      }
    ]
  }
];

/**
 * Generates an XML sitemap conforming to Google's standard sitemap and Google Image Sitemap 1.1 specs,
 * explicitly referencing the logo URL for every indexable public endpoint to assist Google Search Console in indexing brand identity.
 */
export function generateSitemapXml(
  entries: SitemapUrlEntry[] = DEFAULT_PUBLIC_SITEMAP_ROUTES,
  baseUrl: string = CANONICAL_BASE_URL,
  logoUrl: string = DEFAULT_LOGO_URL
): string {
  const today = new Date().toISOString().split('T')[0];

  const xmlUrls = entries.map(entry => {
    const fullUrl = `${baseUrl.replace(/\/$/, '')}${entry.path.startsWith('/') ? entry.path : '/' + entry.path}`;
    const changefreq = entry.changefreq || 'weekly';
    const priority = (entry.priority !== undefined ? entry.priority : 0.7).toFixed(1);
    const lastmod = entry.lastmod || today;

    // Use custom images or fallback to the brand logo URL
    const images = (entry.images && entry.images.length > 0)
      ? entry.images
      : [{
          loc: logoUrl,
          title: 'SJ Tutor AI Logo - All-in-One AI Study Companion',
          caption: 'SJ Tutor AI official logo and brand identity asset'
        }];

    const imagesXml = images.map(img => {
      const locTag = `      <image:loc>${img.loc}</image:loc>`;
      const titleTag = img.title ? `\n      <image:title><![CDATA[${img.title}]]></image:title>` : '';
      const captionTag = img.caption ? `\n      <image:caption><![CDATA[${img.caption}]]></image:caption>` : '';
      return `    <image:image>\n${locTag}${titleTag}${captionTag}\n    </image:image>`;
    }).join('\n');

    return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${imagesXml}
  </url>`;
  }).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${xmlUrls}
</urlset>
`;
}

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
  const favicons = [
    { rel: 'icon', type: 'image/jpeg', href: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg' },
    { rel: 'shortcut icon', type: 'image/jpeg', href: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg' },
    { rel: 'apple-touch-icon', href: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg' },
    { rel: 'apple-touch-icon-precomposed', href: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg' },
    { rel: 'image_src', href: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48x48.png' },
    { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicon-192x192.png' },
    { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/favicon-512x512.png' },
    { rel: 'icon', type: 'image/png', href: '/favicon.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
  ];

  favicons.forEach(({ rel, type, href, sizes }) => {
    let selector = `link[rel="${rel}"][href="${href}"]`;
    if (sizes) selector += `[sizes="${sizes}"]`;
    let el = document.querySelector(selector) as HTMLLinkElement | null;
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      if (type) el.setAttribute('type', type);
      if (sizes) el.setAttribute('sizes', sizes);
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

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`,
        "name": "Sadanand Jyoti",
        "jobTitle": "Lead Innovator, Founder & System Architect",
        "description": "Founder and lead visionary architect behind SJ Tutor AI intelligent learning frameworks, adaptive tutoring models, and student study workflows.",
        "worksFor": {
          "@id": `${CANONICAL_BASE_URL}/#organization`
        },
        "sameAs": [
          `${CANONICAL_BASE_URL}/about`,
          "https://sjtutorai.vercel.app/#about"
        ],
        "email": "mailto:sadanandj2011@gmail.com"
      },
      {
        "@type": "Person",
        "@id": `${CANONICAL_BASE_URL}/#developer-samanyu-patil`,
        "name": "Samanyu S Patil",
        "jobTitle": "Co-Developer & Systems Engineer",
        "description": "Co-developer and systems engineer pioneering smart algorithms, study aids, and student success tools at SJ Tutor AI.",
        "worksFor": {
          "@id": `${CANONICAL_BASE_URL}/#organization`
        },
        "sameAs": [
          `${CANONICAL_BASE_URL}/about`,
          "https://sjtutorai.vercel.app/#about"
        ]
      },
      {
        "@type": "Organization",
        "@id": `${CANONICAL_BASE_URL}/#organization`,
        "name": "SJ Tutor AI",
        "alternateName": ["SJ Tutor", "SJTutorAI", "SJ Tutor AI Study Companion"],
        "url": `${CANONICAL_BASE_URL}/`,
        "founder": {
          "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
        },
        "founders": [
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
          },
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-samanyu-patil`
          }
        ],
        "creator": [
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
          },
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-samanyu-patil`
          }
        ],
        "employee": [
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
          },
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-samanyu-patil`
          }
        ],
        "logo": {
          "@type": "ImageObject",
          "@id": `${CANONICAL_BASE_URL}/#logo`,
          "url": DEFAULT_LOGO_URL,
          "contentUrl": DEFAULT_LOGO_URL,
          "caption": "SJ Tutor AI Official Logo",
          "width": 1024,
          "height": 1024
        },
        "sameAs": [
          "https://sjtutor.ai/",
          "https://sjtutorai.vercel.app/"
        ],
        "image": DEFAULT_LOGO_URL,
        "description": "SJ Tutor AI is an all-in-one AI study companion for students, founded and engineered by Sadanand Jyoti and Samanyu S Patil.",
        "contactPoint": [
          {
            "@type": "ContactPoint",
            "email": "sadanandj2011@gmail.com",
            "telephone": "+91-8105423488",
            "contactType": "developer support",
            "availableLanguage": ["English", "Hindi", "Kannada"]
          },
          {
            "@type": "ContactPoint",
            "email": "sjtutorai@gmail.com",
            "contactType": "general inquiries",
            "availableLanguage": ["English"]
          }
        ]
      },
      {
        "@type": "EducationalOrganization",
        "@id": `${CANONICAL_BASE_URL}/#educational-organization`,
        "name": "SJ Tutor AI",
        "url": `${CANONICAL_BASE_URL}/`,
        "founder": {
          "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
        },
        "creator": [
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
          },
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-samanyu-patil`
          }
        ],
        "logo": DEFAULT_LOGO_URL,
        "image": DEFAULT_LOGO_URL,
        "description": "An all-in-one AI study companion that empowers students with interactive AI tutoring, instant quizzes, and homework solving."
      },
      {
        "@type": "WebSite",
        "@id": `${CANONICAL_BASE_URL}/#website`,
        "url": `${CANONICAL_BASE_URL}/`,
        "name": "SJ Tutor AI",
        "alternateName": "SJ Tutor",
        "description": DEFAULT_DESCRIPTION,
        "author": [
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
          },
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-samanyu-patil`
          }
        ],
        "creator": [
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
          },
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-samanyu-patil`
          }
        ],
        "publisher": {
          "@id": `${CANONICAL_BASE_URL}/#organization`
        }
      },
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        "url": canonicalUrl,
        "name": title || "SJ Tutor AI - All-in-One AI Study Companion",
        "isPartOf": {
          "@id": `${CANONICAL_BASE_URL}/#website`
        },
        "about": {
          "@id": `${CANONICAL_BASE_URL}/#organization`
        },
        "author": [
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
          },
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-samanyu-patil`
          }
        ],
        "description": description || DEFAULT_DESCRIPTION
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
        "author": [
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
          },
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-samanyu-patil`
          }
        ],
        "creator": [
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-sadanand-jyoti`
          },
          {
            "@id": `${CANONICAL_BASE_URL}/#developer-samanyu-patil`
          }
        ],
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
      ensureMetaTag('author', 'Sadanand Jyoti & Samanyu S Patil');
      ensureMetaTag('developer', 'Sadanand Jyoti (Founder & Lead Developer), Samanyu S Patil (Co-Developer & Systems Engineer)');
      ensureMetaTag('founder', 'Sadanand Jyoti');
      ensureMetaTag('creator', 'Sadanand Jyoti, Samanyu S Patil');
      ensureMetaTag('copyright', 'SJ Tutor AI - Sadanand Jyoti & Samanyu S Patil');
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
  },

  /**
   * Generates a fully compliant XML sitemap with explicit Google Image Sitemap tags pointing to the brand logo URL.
   */
  generateSitemapXml: (
    entries: SitemapUrlEntry[] = DEFAULT_PUBLIC_SITEMAP_ROUTES,
    baseUrl: string = CANONICAL_BASE_URL,
    logoUrl: string = DEFAULT_LOGO_URL
  ): string => {
    return generateSitemapXml(entries, baseUrl, logoUrl);
  },

  /**
   * Returns the default public routes configured with brand logo image associations for sitemap generation.
   */
  getDefaultSitemapRoutes: (): SitemapUrlEntry[] => {
    return [...DEFAULT_PUBLIC_SITEMAP_ROUTES];
  },

  /**
   * Helper utility to trigger in-browser download of the sitemap.xml file.
   */
  downloadSitemapXml: (fileName = 'sitemap.xml'): void => {
    if (typeof window === 'undefined') return;
    const xmlContent = generateSitemapXml();
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
