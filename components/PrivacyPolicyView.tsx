import React from 'react';
import { Shield, Lock, Eye, Database, Globe, UserCheck } from 'lucide-react';

const PrivacyPolicyView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="bg-primary-50 dark:bg-slate-900/50 p-8 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Privacy Policy</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
            At SJ Tutor AI, we take your privacy seriously. This document outlines how we collect, use, and protect your personal information while you use our AI-powered educational platform.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
            Last Updated: February 25, 2026
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          
          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-500" />
              1. Information We Collect
            </h2>
            <div className="space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>We collect information to provide better services to all our users. This includes:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-primary-500">
                <li><strong>Account Information:</strong> When you sign up, we collect your name, email address, and profile picture.</li>
                <li><strong>Usage Data:</strong> We collect data about how you interact with our services, such as the quizzes you take, essays you generate, and your study history.</li>
                <li><strong>Device Information:</strong> We may collect specific information about your device, such as the hardware model and operating system version.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary-500" />
              2. How We Use Information
            </h2>
            <div className="space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>We use the information we collect for the following purposes:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-primary-500">
                <li><strong>Provide and Maintain Service:</strong> To deliver the AI tutoring experience, generate content, and track your progress.</li>
                <li><strong>Personalization:</strong> To tailor the learning material to your grade, subject preferences, and learning style.</li>
                <li><strong>Improvement:</strong> To understand how users use our app and to improve our AI models and user interface.</li>
                <li><strong>Communication:</strong> To send you updates, security alerts, and support messages.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary-500" />
              3. Data Security
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              We work hard to protect SJ Tutor AI and our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold. We use encryption to keep your data private while in transit. We review our information collection, storage, and processing practices, including physical security measures, to prevent unauthorized access to our systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-500" />
              4. Sharing Your Information
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              We do not share your personal information with companies, organizations, or individuals outside of SJ Tutor AI except in the following cases:
            </p>
            <ul className="list-disc pl-5 space-y-2 marker:text-primary-500 text-slate-600 dark:text-slate-300">
              <li><strong>With Your Consent:</strong> We will share personal information with companies, organizations, or individuals outside of SJ Tutor AI when we have your consent to do so.</li>
              <li><strong>For Legal Reasons:</strong> We will share personal information with companies, organizations, or individuals outside of SJ Tutor AI if we have a good-faith belief that access, use, preservation, or disclosure of the information is reasonably necessary to meet any applicable law, regulation, legal process, or enforceable governmental request.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary-500" />
              5. Your Controls
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              You can review and control certain types of information tied to your account by using the Settings menu. You can also request the deletion of your account and data by contacting our support team.
            </p>
          </section>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@sjtutor.ai" className="text-primary-600 hover:underline">privacy@sjtutor.ai</a>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyView;
