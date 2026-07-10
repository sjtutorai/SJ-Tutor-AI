import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import { X, Sparkles } from 'lucide-react';

interface CreateGroupModalProps {
  user: User;
  onClose: () => void;
  onSuccess?: (groupId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ user, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [category, setCategory] = useState('Study');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        subject: description.trim(),
        description: description.trim(), // Legacy
        privacy: privacy, // Legacy
        visibility: privacy,
        status: 'active',
        isActive: true, // Legacy
        category: category,
        ownerId: user.uid,
        ownerName: user.displayName || 'User',
        memberCount: 1,
        members: [user.uid],
        admins: [],
        createdAt: serverTimestamp(),
      });

      if (onSuccess) {
        onSuccess(docRef.id);
      }
      onClose();
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Failed to create group. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 text-left">
        <form onSubmit={handleCreate}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-50 dark:bg-slate-800 rounded-xl text-primary-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Create New Group</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Group Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., AP Calculus Study Group"
                  maxLength={50}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is the learning goal of this group?"
                  rows={3}
                  maxLength={200}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Privacy</label>
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  >
                    <option value="public">🌍 Public</option>
                    <option value="private">🔒 Private</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  >
                    <option value="Study">📚 Study</option>
                    <option value="Exam Prep">✏️ Exam Prep</option>
                    <option value="Homework Help">🤝 Homework Help</option>
                    <option value="General">💬 General</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2.5 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white transition-all text-sm shadow-md shadow-primary-600/20"
            >
              {submitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
