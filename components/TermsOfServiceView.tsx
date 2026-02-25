import React from 'react';
import { FileText, CheckCircle, AlertTriangle, Scale, HelpCircle, UserPlus } from 'lucide-react';

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
            Welcome to SJ Tutor AI. By using our services, you agree to these terms. Please read them carefully.
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
              By accessing or using SJ Tutor AI, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-500" />
              2. User Accounts
            </h2>
            <div className="space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>To access certain features of the service, you may be required to create an account. You agree to:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-primary-500">
                <li>Provide accurate, current, and complete information.</li>
                <li>Maintain the security of your password and accept all risks of unauthorized access to your account.</li>
                <li>Notify us immediately if you discover or suspect any security breaches related to the service.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary-500" />
              3. Use of the Service
            </h2>
            <div className="space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>SJ Tutor AI grants you a personal, non-exclusive, non-transferable license to use the service for educational purposes. You agree not to:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-primary-500">
                <li>Use the service for any illegal purpose or in violation of any local, state, national, or international law.</li>
                <li>Attempt to reverse engineer or extract the source code of the service.</li>
                <li>Use automated systems (bots, spiders, etc.) to access the service.</li>
                <li>Generate content that is harmful, offensive, or violates the rights of others.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary-500" />
              4. Disclaimers
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              The materials on SJ Tutor AI are provided on an &apos;as is&apos; basis. SJ Tutor AI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights. Further, SJ Tutor AI does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the AI-generated materials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary-500" />
              5. Governing Law
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which SJ Tutor AI operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
            </p>
          </section>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              If you have any questions about these Terms, please contact us at <a href="mailto:terms@sjtutor.ai" className="text-primary-600 hover:underline">terms@sjtutor.ai</a>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TermsOfServiceView;
