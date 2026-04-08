
import React from 'react';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

const PrivacyPolicyView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-2xl mb-2">
          <Shield className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="text-slate-500">Last updated: April 8, 2026</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary-500" />
            Information We Collect
          </h2>
          <p className="text-slate-600 leading-relaxed">
            We collect information you provide directly to us when you create an account, use our AI tutor, or generate study materials. This includes your name, email address, and the content you interact with.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-500" />
            How We Use Your Data
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Your data is used to personalize your learning experience, improve our AI models, and provide customer support. We do not sell your personal information to third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Data Security
          </h2>
          <p className="text-slate-600 leading-relaxed">
            We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyView;
