
import React from 'react';
import { FileText, Scale, AlertCircle, CheckCircle } from 'lucide-react';

const TermsOfServiceView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-2xl mb-2">
          <Scale className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
        <p className="text-slate-500">Last updated: April 8, 2026</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary-500" />
            Acceptance of Terms
          </h2>
          <p className="text-slate-600 leading-relaxed">
            By accessing or using SJ Tutor AI, you agree to be bound by these Terms of Service and all applicable laws and regulations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary-500" />
            Use License
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Permission is granted to temporarily use the materials on SJ Tutor AI for personal, non-commercial transitory viewing only.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Disclaimer
          </h2>
          <p className="text-slate-600 leading-relaxed">
            The materials on SJ Tutor AI are provided on an &apos;as is&apos; basis. SJ Tutor AI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfServiceView;
