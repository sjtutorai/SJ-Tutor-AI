import React from 'react';
import { FileText, CheckCircle, AlertTriangle, User, ShieldCheck, Scale } from 'lucide-react';

const TermsOfServiceView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="bg-primary-50 dark:bg-slate-900/50 p-8 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Terms of Service</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
            Welcome to SJ Tutor AI! By using our platform, you agree to these terms. Please read them carefully.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
            Last Updated: February 25, 2026
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          
          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-500" />
              1. Acceptance of Terms
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              By accessing or using the SJ Tutor AI website and services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              2. User Accounts
            </h2>
            <div className="space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-primary-500">
                <li>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</li>
                <li>You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-500" />
              3. Use License
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              Permission is granted to temporarily download one copy of the materials (information or software) on SJ Tutor AI's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-5 space-y-2 marker:text-primary-500 text-slate-600 dark:text-slate-300">
              <li>Modify or copy the materials;</li>
              <li>Use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
              <li>Attempt to decompile or reverse engineer any software contained on SJ Tutor AI's website;</li>
              <li>Remove any copyright or other proprietary notations from the materials; or</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary-500" />
              4. Disclaimer
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              The materials on SJ Tutor AI's website are provided on an 'as is' basis. SJ Tutor AI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary-500" />
              5. Governing Law
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which SJ Tutor AI operates and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
            </p>
          </section>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              If you have any questions about these Terms, please contact us at <a href="mailto:legal@sjtutor.ai" className="text-primary-600 hover:underline">legal@sjtutor.ai</a>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TermsOfServiceView;
