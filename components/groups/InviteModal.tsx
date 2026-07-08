import React, { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import { X, Send, AlertCircle, MailCheck } from 'lucide-react';
import { GroupModel } from './types';

interface InviteModalProps {
  user: User;
  group: GroupModel;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  user,
  group,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Check if recipient user profile exists to get their UID
      const usersQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const userSnapshot = await getDocs(usersQuery);
      let receiverUid: string | null = null;

      if (!userSnapshot.empty) {
        const uDoc = userSnapshot.docs[0];
        receiverUid = uDoc.id;

        // 2. Prevent inviting existing members or owners
        if (group.members?.includes(receiverUid) || group.ownerId === receiverUid) {
          setErrorMsg('This student is already a member of this study group.');
          setSubmitting(false);
          return;
        }
      }

      // 3. Prevent duplicate active pending invites
      const dupQuery = query(
        collection(db, 'user_invites'),
        where('email', '==', cleanEmail),
        where('groupId', '==', group.id),
        where('status', '==', 'pending')
      );
      const dupSnapshot = await getDocs(dupQuery);
      if (!dupSnapshot.empty) {
        setErrorMsg('An invitation is already pending for this email.');
        setSubmitting(false);
        return;
      }

      // 4. Create the invitation document in user_invites
      const inviteData = {
        email: cleanEmail,
        invitedBy: user.uid,
        invitedByName: user.displayName || 'A peer',
        groupId: group.id,
        groupName: group.name,
        status: 'pending',
        receiverUid: receiverUid, // Null if not registered yet
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'user_invites'), inviteData);

      // 5. Create notifications for receiver in their notifications subcollection
      if (receiverUid) {
        try {
          await addDoc(collection(db, 'users', receiverUid, 'notifications'), {
            title: 'Study Group Invite',
            body: `${user.displayName || 'A peer'} invited you to join "${group.name}"`,
            type: 'group_invite',
            link: '/groups',
            read: false,
            createdAt: serverTimestamp(),
          });
        } catch (notifErr) {
          console.error('Error sending recipient notification:', notifErr);
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error('Error creating group invitation:', err);
      setErrorMsg('Failed to send invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 text-left">
        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/20 text-green-500 flex items-center justify-center mx-auto mb-2 animate-bounce">
              <MailCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Invitation Dispatched!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              We have dispatched a pending invitation to <span className="font-bold">{email}</span>. They will see it instantly when they open their groups page!
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-primary-600/10"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary-50 dark:bg-slate-800 rounded-xl text-primary-600">
                    <Send className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Invite Study Partners</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Invite your schoolmates to join <span className="font-bold text-slate-700 dark:text-slate-300">{group.name}</span> by typing their account email below.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., peer@school.edu"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="px-5 py-2.5 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white transition-all text-sm shadow-md shadow-primary-600/20"
              >
                {submitting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
