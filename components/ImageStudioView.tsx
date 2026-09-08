import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Maximize2,
  X,
  FileText,
  MessageSquare,
  Upload,
  History,
  Sparkle,
  Eye,
  SlidersHorizontal,
  Lightbulb,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GeminiService } from "../services/geminiService";
import { GeneratedImageItem } from "../types";
import { useNotifications } from "./NotificationContext";

interface ImageStudioViewProps {
  onNavigateToNotes?: (imageInfo: { url: string; prompt: string }) => void;
  onNavigateToTutor?: (imageInfo: { url: string; prompt: string }) => void;
  currentTheme?: string;
  userId?: string;
}

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1 Square", desc: "Notes & Flashcards", icon: "⏹️", ratio: "aspect-square" },
  { id: "16:9", label: "16:9 Widescreen", desc: "Presentations & Desktop", icon: "🖥️", ratio: "aspect-video" },
  { id: "9:16", label: "9:16 Story", desc: "Mobile & Handouts", icon: "📱", ratio: "aspect-[9/16]" },
  { id: "4:3", label: "4:3 Diagram", desc: "Academic Paper", icon: "📄", ratio: "aspect-[4/3]" },
  { id: "3:4", label: "3:4 Textbook", desc: "Book Illustrations", icon: "📖", ratio: "aspect-[3/4]" },
];

const STYLE_PRESETS = [
  { id: "Academic Diagram", label: "Academic Diagram", desc: "Crisp vector lines, educational annotations & schematic clarity", icon: "📐" },
  { id: "3D Photorealistic", label: "3D Render", desc: "Hyper-realistic textures, studio lighting & volumetric depth", icon: "🧊" },
  { id: "Infographic Poster", label: "Infographic", desc: "Modern flat design, color-coded structure & graphic layout", icon: "📊" },
  { id: "Digital Concept Art", label: "Digital Art", desc: "Cinematic lighting, high aesthetic fidelity & rich atmosphere", icon: "🎨" },
  { id: "Vintage Textbook Engraving", label: "Vintage Engraving", desc: "Classic cross-hatching, retro encyclopedia lithograph", icon: "📜" },
  { id: "Watercolor Illustration", label: "Watercolor", desc: "Soft pastel pigments, organic gradients & artistic touch", icon: "🖌️" },
  { id: "Chalkboard Study Drawing", label: "Chalkboard", desc: "White and colored chalk illustrations on matte slate", icon: "📋" },
];

const INSPIRATION_PROMPTS = [
  {
    category: "Biology & Medicine",
    icon: "🧬",
    prompt: "Detailed cross-section diagram of an animal cell highlighting mitochondria, nucleus, ribosomes, and Golgi apparatus with clean educational arrows",
  },
  {
    category: "Physics & Optics",
    icon: "⚡",
    prompt: "Educational ray diagram showing light refraction through a double convex glass lens forming a real inverted focal point with labeled focal lengths",
  },
  {
    category: "Chemistry",
    icon: "🧪",
    prompt: "3D molecular model representation of the DNA double helix with color-coded adenine, thymine, cytosine, and guanine base pairs on a dark background",
  },
  {
    category: "Astronomy & Space",
    icon: "🪐",
    prompt: "High-resolution diagram of the Solar System illustrating planetary orbits, asteroid belt, and relative scale against deep starry nebula",
  },
  {
    category: "History & Geography",
    icon: "🗺️",
    prompt: "Detailed historical topographic map of the ancient Silk Road trading routes connecting Chang'an to Constantinople with mountain passes and oasis cities",
  },
  {
    category: "Earth Sciences",
    icon: "🌋",
    prompt: "Cross-section geological illustration of an active composite volcano showing magma chamber, conduit, crater eruption, and layered ash strata",
  },
  {
    category: "Mathematics",
    icon: "📐",
    prompt: "Aesthetic trigonometric unit circle diagram displaying exact radian angles, coordinates, and sine cosine wave projections on blueprint grid",
  },
];

const EDIT_INSPIRATIONS = [
  "Add labeled annotations and arrows pointing to the main components",
  "Convert the background into a clean, modern science laboratory",
  "Transform this image into a dark mode chalkboard style drawing with white and gold chalk",
  "Add a dramatic glowing neon backlight and increase structural detail",
  "Isolate the main subject on a pristine minimalist white studio background",
  "Add a magnifying glass inset showing microscopic detail of the texture",
];

const STORAGE_KEY = "sjtutor_ai_image_studio_history";

export const ImageStudioView: React.FC<ImageStudioViewProps> = ({
  onNavigateToNotes,
  onNavigateToTutor,
  userId,
}) => {
  const { triggerToast } = useNotifications();
  const storageKey = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;

  // Active sub-mode: 'generate' | 'edit' | 'gallery'
  const [activeTab, setActiveTab] = useState<"generate" | "edit" | "gallery">("generate");

  // Generate State
  const [prompt, setPrompt] = useState("");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("1:1");
  const [selectedStyle, setSelectedStyle] = useState("Academic Diagram");
  const [selectedImageSize, setSelectedImageSize] = useState<"1K" | "512px" | "2K">("1K");
  const [isGenerating, setIsGenerating] = useState(false);

  // Edit State
  const [editPrompt, setEditPrompt] = useState("");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editComparisonView, setEditComparisonView] = useState<"after" | "split" | "before">("after");

  // Current active result
  const [currentResult, setCurrentResult] = useState<GeneratedImageItem | null>(null);
  const [gallery, setGallery] = useState<GeneratedImageItem[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<"all" | "created" | "edited">("all");
  const [gallerySearch, setGallerySearch] = useState("");

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<GeneratedImageItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setGallery(parsed);
          if (parsed.length > 0 && !currentResult) {
            setCurrentResult(parsed[0]);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load image studio history", e);
    }
  }, [storageKey]);

  // Save gallery to localStorage
  const saveToGallery = (item: GeneratedImageItem) => {
    setGallery((prev) => {
      const updated = [item, ...prev.filter((i) => i.id !== item.id)].slice(0, 50);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save image studio history", e);
      }
      return updated;
    });
  };

  const removeFromGallery = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setGallery((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to update image studio history", e);
      }
      return updated;
    });
    if (currentResult?.id === id) {
      setCurrentResult(null);
    }
    if (lightboxImage?.id === id) {
      setLightboxImage(null);
    }
    triggerToast("Image Removed", "The image was removed from your history.", "Study Reminders");
  };

  // Handle Generate Image
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      triggerToast("Prompt Required", "Please enter a description for the image you want to create.", "Important Alerts");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await GeminiService.generateImage({
        prompt: prompt.trim(),
        aspectRatio: selectedAspectRatio,
        style: selectedStyle,
        imageSize: selectedImageSize,
      });

      const newItem: GeneratedImageItem = {
        id: `gen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        url: res.imageUrl,
        prompt: prompt.trim(),
        aspectRatio: selectedAspectRatio,
        style: selectedStyle,
        model: res.model || "gemini-3.1-flash-image-preview",
        isEdited: false,
        createdAt: Date.now(),
      };

      setCurrentResult(newItem);
      saveToGallery(newItem);
      triggerToast("Image Created! 🎨", "Your AI image has been generated using gemini-3.1-flash-image-preview.", "Achievements");
    } catch (err: any) {
      console.error("Generate image error:", err);
      triggerToast("Generation Failed", err.message || "Could not generate image. Please try another prompt.", "Important Alerts");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Edit Image
  const handleEdit = async () => {
    if (!sourceImage) {
      triggerToast("Source Image Required", "Please upload or select an image to edit.", "Important Alerts");
      return;
    }
    if (!editPrompt.trim()) {
      triggerToast("Edit Instructions Required", "Please describe what changes or edits you want to apply.", "Important Alerts");
      return;
    }

    setIsEditing(true);
    try {
      const res = await GeminiService.editImage({
        prompt: editPrompt.trim(),
        image: sourceImage,
      });

      const newItem: GeneratedImageItem = {
        id: `edit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        url: res.imageUrl,
        prompt: editPrompt.trim(),
        originalUrl: sourceImage,
        isEdited: true,
        model: res.model || "gemini-3.1-flash-image-preview",
        createdAt: Date.now(),
      };

      setCurrentResult(newItem);
      saveToGallery(newItem);
      setEditComparisonView("after");
      triggerToast("Image Edited! 🪄", "Your image has been transformed with AI edits.", "Achievements");
    } catch (err: any) {
      console.error("Edit image error:", err);
      triggerToast("Edit Failed", err.message || "Could not edit image. Please try again.", "Important Alerts");
    } finally {
      setIsEditing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerToast("Invalid File", "Please upload a valid image file (PNG, JPG, WebP).", "Important Alerts");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      triggerToast("File Too Large", "Please select an image under 15MB.", "Important Alerts");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSourceImage(dataUrl);
      setActiveTab("edit");
      triggerToast("Image Loaded", "Ready to edit! Describe your changes below.", "Study Reminders");
    };
    reader.readAsDataURL(file);
  };

  // Handle paste from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setSourceImage(reader.result as string);
            setActiveTab("edit");
            triggerToast("Image Pasted!", "Loaded from clipboard. Describe your edits below.", "Study Reminders");
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  // Copy Image to Clipboard
  const handleCopyImage = async (item: GeneratedImageItem) => {
    try {
      if (item.url.startsWith("data:")) {
        const response = await fetch(item.url);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(item.url);
      }
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
      triggerToast("Copied to Clipboard! 📋", "Image copied and ready to paste into documents or messages.", "Study Reminders");
    } catch (e) {
      console.warn("Direct blob copy not supported, copying URL", e);
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
      triggerToast("Link Copied! 📋", "Image URL copied to clipboard.", "Study Reminders");
    }
  };

  // Download Image
  const handleDownload = (item: GeneratedImageItem) => {
    try {
      const link = document.createElement("a");
      link.href = item.url;
      const safeName = item.prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .substring(0, 30);
      link.download = `sjtutor-ai-${safeName || "image"}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast("Downloaded! 💾", "Image saved to your downloads.", "Study Reminders");
    } catch (e) {
      console.error("Download error", e);
      triggerToast("Download Error", "Could not trigger download. Try copying image instead.", "Important Alerts");
    }
  };

  // Send to Study Notes
  const handleSendToNotes = (item: GeneratedImageItem) => {
    if (onNavigateToNotes) {
      onNavigateToNotes({ url: item.url, prompt: item.prompt });
      triggerToast("Opening Notes 📝", "Attaching generated visual aid to your Study Notes.", "Study Reminders");
    } else {
      triggerToast("Visual Attached", "Image saved for your study sessions.", "Study Reminders");
    }
  };

  // Send to Tutor Chat
  const handleSendToTutor = (item: GeneratedImageItem) => {
    if (onNavigateToTutor) {
      onNavigateToTutor({ url: item.url, prompt: item.prompt });
      triggerToast("Opening AI Tutor 💬", "Sending image to your AI Tutor for explanation.", "Study Reminders");
    } else {
      triggerToast("AI Tutor Context Ready", "Image ready for tutor inquiry.", "Study Reminders");
    }
  };

  // Filtered gallery items
  const filteredGallery = gallery.filter((item) => {
    if (galleryFilter === "created" && item.isEdited) return false;
    if (galleryFilter === "edited" && !item.isEdited) return false;
    if (gallerySearch.trim()) {
      return item.prompt.toLowerCase().includes(gallerySearch.toLowerCase());
    }
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans text-slate-800" onPaste={handlePaste}>
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
      />

      {/* Main Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                AI Image Studio
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Wand2 className="w-3 h-3 text-amber-600" />
                  gemini-3.1-flash-image-preview
                </span>
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Generate high-definition educational diagrams, visual study aids, and transform existing images with natural language prompts.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "generate"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Create from Prompt
          </button>
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "edit"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Wand2 className="w-4 h-4 text-indigo-500" />
            Edit & Transform
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "gallery"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            Gallery
            {gallery.length > 0 && (
              <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                {gallery.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Layout */}
      {activeTab !== "gallery" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Creator / Editor Controls */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            {activeTab === "generate" ? (
              /* Generate Mode Card */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Describe what you want to create
                  </label>
                  {prompt && (
                    <button
                      onClick={() => setPrompt("")}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Prompt Input */}
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    placeholder="e.g. 3D cutaway diagram of human heart with labeled atrium, ventricle, aorta and color-coded oxygenated blood flow..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm leading-relaxed transition-all resize-none"
                  />
                  <div className="absolute bottom-2.5 right-3 text-xs text-slate-400">
                    {prompt.length} characters
                  </div>
                </div>

                {/* Academic Quick Prompts Inspiration */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                    <span className="flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      Academic & Study Inspiration
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {INSPIRATION_PROMPTS.map((insp, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPrompt(insp.prompt)}
                        className="text-left text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-200 text-slate-700 rounded-lg border border-slate-200 transition-all flex items-center gap-1.5"
                      >
                        <span>{insp.icon}</span>
                        <span className="font-medium">{insp.category}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.id}
                        onClick={() => setSelectedAspectRatio(ar.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                          selectedAspectRatio === ar.id
                            ? "border-amber-500 bg-amber-50/50 text-amber-900 shadow-sm"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-base mb-0.5">{ar.icon}</span>
                        <span className="text-xs font-bold">{ar.id}</span>
                        <span className="text-[10px] text-slate-500 leading-tight hidden sm:block">
                          {ar.label.split(" ")[1]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style Preset Selector */}
                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Visual Style Preset
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STYLE_PRESETS.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStyle(st.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedStyle === st.id
                            ? "border-amber-500 bg-amber-50/50 text-amber-900 ring-1 ring-amber-500"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{st.icon}</span>
                          <span>{st.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 leading-tight">
                          {st.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution Selector */}
                <div className="mt-4 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700">Resolution Quality:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(["512px", "1K", "2K"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedImageSize(sz)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                          selectedImageSize === sz
                            ? "bg-amber-500 text-white font-bold"
                            : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Action Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="mt-5 w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Creating image with gemini-3.1-flash-image-preview...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate Image (Ctrl+Enter)</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Edit & Transform Mode Card */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-indigo-500" />
                    Step 1: Upload or Choose Source Image
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload an academic diagram, diagram snapshot, or select an image from your gallery to edit.
                  </p>
                </div>

                {/* Source Image Upload Dropzone */}
                {sourceImage ? (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 p-2 mb-4 group">
                    <img
                      src={sourceImage}
                      alt="Source for editing"
                      className="w-full max-h-56 object-contain rounded-lg mx-auto"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg shadow hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Replace Image
                      </button>
                      <button
                        onClick={() => setSourceImage(null)}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg shadow hover:bg-red-700 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 rounded-xl p-6 text-center cursor-pointer transition-all mb-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to upload an image or drag & drop here
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PNG, JPG, WebP up to 15MB. Or paste directly from clipboard (Ctrl+V)
                    </p>
                    {gallery.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Or pick from recent gallery:</span>
                        <div className="flex gap-1.5">
                          {gallery.slice(0, 4).map((g) => (
                            <img
                              key={g.id}
                              src={g.url}
                              alt="Recent"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSourceImage(g.url);
                              }}
                              className="w-8 h-8 rounded-md object-cover border border-slate-300 hover:border-indigo-500 hover:scale-105 transition-all"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit Instructions Input */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-indigo-500" />
                      Step 2: Describe your changes or edits
                    </label>
                  </div>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleEdit();
                      }
                    }}
                    placeholder="e.g. Add red arrows pointing to the mitochondria and label it, convert to dark chalkboard sketch..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm leading-relaxed transition-all resize-none"
                  />
                </div>

                {/* Quick Edit Inspiration Pills */}
                <div className="mt-3">
                  <span className="text-xs text-slate-500 font-semibold mb-1.5 block">
                    Quick Edit Inspirations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {EDIT_INSPIRATIONS.map((insp, idx) => (
                      <button
                        key={idx}
                        onClick={() => setEditPrompt(insp)}
                        className="text-left text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-900 hover:border-indigo-200 text-slate-700 rounded-lg border border-slate-200 transition-all"
                      >
                        {insp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edit Action Button */}
                <button
                  onClick={handleEdit}
                  disabled={isEditing || !sourceImage || !editPrompt.trim()}
                  className="mt-5 w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isEditing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Editing image with gemini-3.1-flash-image-preview...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      <span>Transform & Edit Image (Ctrl+Enter)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Live Result Showcase */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-amber-500" />
                    Preview & Visual Output
                  </h3>
                  {currentResult?.isEdited && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Edited Version
                    </span>
                  )}
                </div>

                {/* Edit Comparison Controls if in Edit result mode */}
                {currentResult?.isEdited && currentResult.originalUrl && (
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      onClick={() => setEditComparisonView("before")}
                      className={`px-2 py-1 rounded-md font-medium transition-all ${
                        editComparisonView === "before" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600"
                      }`}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setEditComparisonView("after")}
                      className={`px-2 py-1 rounded-md font-medium transition-all ${
                        editComparisonView === "after" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600"
                      }`}
                    >
                      Edited
                    </button>
                    <button
                      onClick={() => setEditComparisonView("split")}
                      className={`px-2 py-1 rounded-md font-medium transition-all ${
                        editComparisonView === "split" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600"
                      }`}
                    >
                      Split
                    </button>
                  </div>
                )}
              </div>

              {/* Main Image Stage */}
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[340px] flex items-center justify-center group">
                {isGenerating || isEditing ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-300">
                    <div className="relative w-16 h-16 mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
                      <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-amber-400" />
                      </div>
                    </div>
                    <p className="text-base font-bold text-white mb-1">
                      {isEditing ? "Transforming Image with Gemini AI..." : "Synthesizing High-Definition Visual..."}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Rendering textures, applying educational styling, and refining visual clarity.
                    </p>
                  </div>
                ) : currentResult ? (
                  <>
                    {/* View rendering according to comparison mode */}
                    {currentResult.isEdited && currentResult.originalUrl && editComparisonView === "before" ? (
                      <img
                        src={currentResult.originalUrl}
                        alt="Original before edit"
                        className="w-full h-auto max-h-[480px] object-contain mx-auto"
                      />
                    ) : currentResult.isEdited && currentResult.originalUrl && editComparisonView === "split" ? (
                      <div className="grid grid-cols-2 w-full h-full gap-1 p-1 bg-slate-900">
                        <div className="relative">
                          <img
                            src={currentResult.originalUrl}
                            alt="Original"
                            className="w-full h-full object-contain"
                          />
                          <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded">
                            Original
                          </span>
                        </div>
                        <div className="relative">
                          <img
                            src={currentResult.url}
                            alt="Edited"
                            className="w-full h-full object-contain"
                          />
                          <span className="absolute top-2 left-2 text-[10px] font-bold bg-indigo-600/90 text-white px-2 py-0.5 rounded">
                            AI Edited
                          </span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={currentResult.url}
                        alt={currentResult.prompt}
                        className="w-full h-auto max-h-[480px] object-contain mx-auto transition-transform duration-300"
                      />
                    )}

                    {/* Quick overlay actions */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setLightboxImage(currentResult)}
                        title="Fullscreen Lightbox"
                        className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCopyImage(currentResult)}
                        title="Copy to Clipboard"
                        className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                      >
                        {copiedId === currentResult.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDownload(currentResult)}
                        title="Download PNG"
                        className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center mb-3">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">No Image Generated Yet</p>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">
                      Type a prompt on the left to generate an educational diagram or upload an image to edit.
                    </p>
                  </div>
                )}
              </div>

              {/* Prompt and metadata display */}
              {currentResult && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Prompt / Description
                      </p>
                      <p className="text-sm text-slate-800 font-medium mt-0.5 leading-relaxed">
                        {currentResult.prompt}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-600">
                    {currentResult.style && (
                      <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200 font-medium">
                        🎨 {currentResult.style}
                      </span>
                    )}
                    {currentResult.aspectRatio && (
                      <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200 font-medium">
                        📐 {currentResult.aspectRatio}
                      </span>
                    )}
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-200 font-medium flex items-center gap-1">
                      <Sparkle className="w-3 h-3 text-amber-600" />
                      {currentResult.model || "gemini-3.1-flash-image-preview"}
                    </span>
                  </div>

                  {/* Multi-action Integration Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleDownload(currentResult)}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      Download
                    </button>

                    <button
                      onClick={() => handleCopyImage(currentResult)}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
                    >
                      {copiedId === currentResult.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      Copy
                    </button>

                    <button
                      onClick={() => {
                        setSourceImage(currentResult.url);
                        setActiveTab("edit");
                        triggerToast("Loaded to Editor", "Image ready for transformation instructions.", "Study Reminders");
                      }}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200 transition-all"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                      Edit This
                    </button>

                    <button
                      onClick={() => handleSendToNotes(currentResult)}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      To Notes
                    </button>

                    <button
                      onClick={() => handleSendToTutor(currentResult)}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      Ask Tutor
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Full Gallery View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500" />
                Image Studio History & Saved Artwork
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All created and edited diagrams are saved in your local workspace.
              </p>
            </div>

            {/* Gallery Filters & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={gallerySearch}
                onChange={(e) => setGallerySearch(e.target.value)}
                placeholder="Search prompts..."
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                {(["all", "created", "edited"] as const).map((filt) => (
                  <button
                    key={filt}
                    onClick={() => setGalleryFilter(filt)}
                    className={`px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                      galleryFilter === filt
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {filt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredGallery.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredGallery.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setCurrentResult(item);
                    setActiveTab(item.isEdited ? "edit" : "generate");
                  }}
                  className="group relative rounded-xl border border-slate-200 bg-slate-900 overflow-hidden cursor-pointer hover:shadow-md hover:border-amber-400 transition-all flex flex-col"
                >
                  <div className="aspect-square w-full overflow-hidden bg-slate-950 flex items-center justify-center relative">
                    <img
                      src={item.url}
                      alt={item.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                      className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded shadow ${
                        item.isEdited
                          ? "bg-indigo-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {item.isEdited ? "Edited" : "Created"}
                    </span>
                  </div>

                  <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-snug mb-2">
                      {item.prompt}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item);
                          }}
                          className="p-1 hover:text-slate-700 text-slate-400"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => removeFromGallery(item.id, e)}
                          className="p-1 hover:text-red-600 text-slate-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No matching images in your gallery</p>
              <p className="text-xs text-slate-400 mt-1">
                Create a new image or remove the active search filter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <img
                src={lightboxImage.url}
                alt={lightboxImage.prompt}
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
              />

              <div className="mt-4 bg-slate-900/90 border border-white/10 text-white px-5 py-3 rounded-xl max-w-2xl text-center backdrop-blur-md">
                <p className="text-sm font-medium">{lightboxImage.prompt}</p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <button
                    onClick={() => handleDownload(lightboxImage)}
                    className="text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button
                    onClick={() => handleCopyImage(lightboxImage)}
                    className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageStudioView;
