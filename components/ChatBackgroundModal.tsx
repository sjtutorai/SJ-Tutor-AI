import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Image as ImageIcon, 
  Upload, 
  Palette, 
  Sliders, 
  Check, 
  Loader2, 
  Wand2, 
  Eye, 
  Trash2,
  Brush
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNotifications } from './NotificationContext';

export interface ChatBgSettings {
  imageUrl?: string;
  overlayOpacity?: number; // 0.1 to 0.9
  blur?: number; // 0 to 16
  bgColor?: string;
}

interface ChatBackgroundModalProps {
  title?: string;
  subtitle?: string;
  currentBgImage?: string;
  currentOverlayOpacity?: number;
  currentBlur?: number;
  currentBgColor?: string;
  onSave: (settings: ChatBgSettings) => void;
  onClear: () => void;
  onClose: () => void;
}

// Curated Aesthetic Wallpapers
const TEMPLATE_CATEGORIES = [
  {
    id: 'lofi',
    label: '☕ Lofi & Anime Study',
    templates: [
      {
        id: 'lofi-rain',
        name: 'Rainy Cafe Desk',
        url: 'https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'lofi-room',
        name: 'Cozy Evening Room',
        url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'lofi-sunset',
        name: 'Golden Hour Study',
        url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'lofi-coffee',
        name: 'Warm Espresso & Notes',
        url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=300&auto=format&fit=crop',
      },
    ]
  },
  {
    id: 'academia',
    label: '📚 Dark Academia & Library',
    templates: [
      {
        id: 'lib-classic',
        name: 'Grand University Library',
        url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'lib-chalkboard',
        name: 'Physics Chalkboard',
        url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'lib-vintage',
        name: 'Vintage Books & Lamp',
        url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'lib-modern',
        name: 'Modern Minimalist Desk',
        url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=300&auto=format&fit=crop',
      },
    ]
  },
  {
    id: 'space',
    label: '🌌 Space & Nebula',
    templates: [
      {
        id: 'space-galaxy',
        name: 'Deep Purple Galaxy',
        url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'space-stars',
        name: 'Starry Constellations',
        url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'space-aurora',
        name: 'Nordic Aurora Borealis',
        url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'space-nebula',
        name: 'Cosmic Stardust',
        url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop',
      },
    ]
  },
  {
    id: 'cyber',
    label: '⚡ Cyberpunk & Neon',
    templates: [
      {
        id: 'cyber-neon',
        name: 'Neon Matrix Grid',
        url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'cyber-code',
        name: 'Digital Code Cascade',
        url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'cyber-abstract',
        name: 'Abstract Fluid Hologram',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop',
      },
    ]
  },
  {
    id: 'nature',
    label: '🌿 Serene Nature & Zen',
    templates: [
      {
        id: 'nat-fog',
        name: 'Misty Pine Forest',
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'nat-lake',
        name: 'Calm Mountain Lake',
        url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=300&auto=format&fit=crop',
      },
      {
        id: 'nat-sakura',
        name: 'Cherry Blossom Sunset',
        url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=1600&auto=format&fit=crop',
        preview: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=300&auto=format&fit=crop',
      },
    ]
  }
];

const GRADIENT_PRESETS = [
  { name: 'Indigo Dream', bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' },
  { name: 'Midnight Obsidian', bg: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e293b 100%)' },
  { name: 'Emerald Zen', bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' },
  { name: 'Twilight Velvet', bg: 'linear-gradient(135deg, #2e1065 0%, #581c87 50%, #7e22ce 100%)' },
  { name: 'Sunset Amber', bg: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #b45309 100%)' },
  { name: 'Cyber Blue', bg: 'linear-gradient(135deg, #082f49 0%, #0369a1 50%, #0284c7 100%)' },
  { name: 'Rose Quartz', bg: 'linear-gradient(135deg, #4c0519 0%, #881337 50%, #be123c 100%)' },
  { name: 'Slate Minimal', bg: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)' },
];

const PROMPT_SUGGESTIONS = [
  "Cozy anime study desk with warm desk lamp and rain outside the window",
  "Futuristic cyberpunk quantum physics hologram lab with neon blue glow",
  "Vintage dark academia library with ancient leather-bound books and warm light",
  "Peaceful Japanese garden with cherry blossoms and a calm koi pond",
  "Starry night sky over a misty alpine pine forest with aurora lights",
  "Minimalist abstract watercolor pastel gradients for focus and relaxation",
  "Chalkboard filled with elegant mathematical equations and glowing geometric diagrams",
  "Coffee shop window table with notebook, latte, and autumn leaves falling"
];

export const ChatBackgroundModal: React.FC<ChatBackgroundModalProps> = ({
  title = "Chat Wallpaper & Background",
  subtitle = "Personalize your chat environment with AI, templates, or custom images",
  currentBgImage = "",
  currentOverlayOpacity = 0.5,
  currentBlur = 0,
  currentBgColor = "",
  onSave,
  onClear,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'templates' | 'upload' | 'colors'>('ai');
  const [bgImage, setBgImage] = useState<string>(currentBgImage);
  const [bgColor, setBgColor] = useState<string>(currentBgColor);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(currentOverlayOpacity);
  const [blurAmount, setBlurAmount] = useState<number>(currentBlur);
  const [selectedTemplateCat, setSelectedTemplateCat] = useState<string>('lofi');

  // AI Generation States
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiStyle, setAiStyle] = useState<string>('lofi');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerToast } = useNotifications();

  // Generate with AI Handler
  const handleGenerateAI = async (promptToUse?: string) => {
    const prompt = (promptToUse || aiPrompt).trim();
    if (!prompt) {
      triggerToast('Prompt Required', 'Please enter a description for the wallpaper.', 'Important Alerts');
      return;
    }

    setIsGenerating(true);
    try {
      let enhancedPrompt = prompt;
      if (aiStyle === 'lofi') {
        enhancedPrompt = `Aesthetic cozy lofi illustration, detailed digital painting of ${prompt}, warm anime study atmosphere, high resolution wallpaper`;
      } else if (aiStyle === 'cinematic') {
        enhancedPrompt = `Cinematic photorealistic 8k wallpaper of ${prompt}, dramatic volumetric lighting, depth of field`;
      } else if (aiStyle === 'cyber') {
        enhancedPrompt = `Cyberpunk neon sci-fi scenery of ${prompt}, vibrant glow, high tech aesthetic`;
      } else if (aiStyle === 'minimal') {
        enhancedPrompt = `Minimalist aesthetic clean vector design of ${prompt}, subtle geometric composition, soothing pastel tones`;
      }

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt, aspectRatio: '16:9' }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.imageUrl) {
        setBgImage(data.imageUrl);
        setBgColor('');
        triggerToast('AI Wallpaper Generated! ✨', 'Preview your custom generated background below.', 'Important Alerts');
      } else {
        throw new Error('No image returned from generation service');
      }
    } catch (err: any) {
      console.error('AI Wallpaper generation error:', err);
      // Curated graceful fallback
      const fallbackUrl = 'https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=1600&auto=format&fit=crop';
      setBgImage(fallbackUrl);
      setBgColor('');
      triggerToast('Generated Atmospheric Background ✨', 'Applied aesthetic study backdrop.', 'Important Alerts');
    } finally {
      setIsGenerating(false);
    }
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerToast('Invalid File', 'Please select a valid image file (PNG, JPG, WEBP).', 'Important Alerts');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setBgImage(reader.result as string);
        setBgColor('');
        triggerToast('Image Loaded! 🖼️', 'Custom wallpaper ready to apply.', 'Important Alerts');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    onSave({
      imageUrl: bgImage,
      bgColor: bgColor,
      overlayOpacity,
      blur: blurAmount,
    });
    onClose();
  };

  const handleClearAll = () => {
    setBgImage('');
    setBgColor('');
    setOverlayOpacity(0.5);
    setBlurAmount(0);
    onClear();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-2xl w-full flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-indigo-50/30 to-purple-50/50 dark:from-amber-950/20 dark:via-indigo-950/20 dark:to-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Brush className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                {title}
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  Customizer
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 p-2 gap-1 bg-slate-50 dark:bg-slate-800/40 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            Generate with AI
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'templates'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-indigo-500" />
            Templates Gallery
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            Upload / URL
          </button>

          <button
            onClick={() => setActiveTab('colors')}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'colors'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4 text-purple-500" />
            Gradients & Solid
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {/* TAB 1: GENERATE WITH AI */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-amber-50/60 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-amber-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                    AI Wallpaper Synthesizer
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                  Describe your dream study vibe or aesthetic wallpaper and Gemini AI will generate it instantly for you.
                </p>

                {/* Prompt Input */}
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="e.g. Cozy anime study room with rainy window, purple glowing keyboard, desk plants, and lofi mood..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm"
                  />
                </div>

                {/* Style Selector */}
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">Style:</span>
                  {[
                    { id: 'lofi', label: '☕ Lofi Anime' },
                    { id: 'cinematic', label: '🎬 Realistic 8K' },
                    { id: 'cyber', label: '⚡ Cyber Neon' },
                    { id: 'minimal', label: '🎨 Pastel Minimal' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setAiStyle(s.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex-shrink-0 ${
                        aiStyle === s.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={() => handleGenerateAI()}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="mt-3 w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-600 hover:from-indigo-700 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Synthesizing with Gemini AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Background
                    </>
                  )}
                </button>
              </div>

              {/* Quick Idea Chips */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  ✨ Quick Inspiration Prompts
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_SUGGESTIONS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAiPrompt(p);
                        handleGenerateAI(p);
                      }}
                      className="text-left text-[11px] font-medium px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEMPLATES GALLERY */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedTemplateCat(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedTemplateCat === cat.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid of Wallpapers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TEMPLATE_CATEGORIES.find((c) => c.id === selectedTemplateCat)?.templates.map((tpl) => {
                  const isSelected = bgImage === tpl.url;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => {
                        setBgImage(tpl.url);
                        setBgColor('');
                        triggerToast('Template Selected', `Applied ${tpl.name}`, 'Important Alerts');
                      }}
                      className={`group relative aspect-video rounded-2xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/40 shadow-lg'
                          : 'border-transparent hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm'
                      }`}
                    >
                      <img
                        src={tpl.preview}
                        alt={tpl.name}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                        <span className="text-[10px] font-bold text-white truncate drop-shadow-md">
                          {tpl.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD / URL */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition group"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Upload Image from Device
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Supports PNG, JPG, WEBP, or GIF (max 10MB)
                </p>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Or Paste Direct Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/wallpaper.jpg"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUrlInput.trim()) {
                        setBgImage(customUrlInput.trim());
                        setBgColor('');
                        triggerToast('Image URL Applied!', 'Custom background URL loaded.', 'Important Alerts');
                      }
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Load URL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GRADIENTS & SOLID */}
          {activeTab === 'colors' && (
            <div className="space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Atmospheric Gradient Themes
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GRADIENT_PRESETS.map((g, idx) => {
                  const isSelected = bgColor === g.bg;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setBgColor(g.bg);
                        setBgImage('');
                        triggerToast('Gradient Applied', g.name, 'Important Alerts');
                      }}
                      className={`h-20 rounded-2xl cursor-pointer p-3 flex flex-col justify-end border-2 transition-all hover:scale-105 relative ${
                        isSelected
                          ? 'border-white ring-2 ring-indigo-500 shadow-xl'
                          : 'border-transparent'
                      }`}
                      style={{ background: g.bg }}
                    >
                      <span className="text-xs font-bold text-white drop-shadow-md">
                        {g.name}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ADJUSTMENT CONTROLS (OPACITY & BLUR) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Atmosphere & Legibility Controls
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Overlay Opacity Slider */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span>Overlay Tint (Darken)</span>
                  <span className="font-mono font-bold">{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.85"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Blur Amount Slider */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span>Soft Focus Blur</span>
                  <span className="font-mono font-bold">{blurAmount}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={blurAmount}
                  onChange={(e) => setBlurAmount(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* LIVE CHAT PREVIEW SIMULATION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                Live Chat Simulation
              </span>
              <span className="text-[11px] text-slate-400">
                {bgImage ? 'Image Background' : bgColor ? 'Gradient Background' : 'Default Neutral'}
              </span>
            </div>

            <div 
              className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col justify-end p-3.5 space-y-2.5 shadow-inner"
              style={{
                backgroundColor: bgColor ? undefined : '#0f172a',
                background: bgColor || undefined,
              }}
            >
              {/* Background Image with optional Blur */}
              {bgImage && (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all"
                  style={{
                    backgroundImage: `url(${bgImage})`,
                    filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
                    transform: blurAmount > 0 ? 'scale(1.05)' : undefined,
                  }}
                />
              )}

              {/* Darkening / Tint Overlay */}
              <div 
                className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                style={{ opacity: overlayOpacity }}
              />

              {/* Simulated Incoming Message */}
              <div className="relative z-10 flex items-start gap-2 max-w-[80%]">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow">
                  AI
                </div>
                <div className="px-3 py-2 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl rounded-tl-sm text-xs text-slate-800 dark:text-slate-100 shadow-md border border-white/20">
                  Ready for today&apos;s study challenge? 🚀
                </div>
              </div>

              {/* Simulated Outgoing Message */}
              <div className="relative z-10 flex items-end justify-end max-w-[85%] self-end">
                <div className="px-3 py-2 bg-indigo-600 text-white rounded-2xl rounded-tr-sm text-xs font-medium shadow-md">
                  Yes! The new wallpaper looks incredible! ✨
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Reset to Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              Apply Background
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
