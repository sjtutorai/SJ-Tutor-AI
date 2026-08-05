import React, { useState } from 'react';
import { Users, CheckCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNotifications } from './NotificationContext';
import { StudyGroup } from '../types';

interface GroupInviteViewProps {
  groupId: string;
  inviterName: string;
  groupName: string;
  currentUserId: string;
  currentUserDisplayName: string;
  onAccept: () => void;
  onDecline: () => void;
  onBack: () => void;
}

export const GroupInviteView: React.FC<GroupInviteViewProps> = ({
  groupId,
  inviterName,
  groupName,
  currentUserId,
  currentUserDisplayName,
  onAccept,
  onDecline,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sendNotification } = useNotifications();

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) {
        throw new Error('Group not found or has been deleted.');
      }
      
      const groupData = groupSnap.data() as StudyGroup;
      
      // Update group with new member
      await updateDoc(groupRef, {
        members: arrayUnion({
          uid: currentUserId,
          displayName: currentUserDisplayName,
          role: 'member',
          joinedAt: Date.now()
        }),
        updatedAt: Date.now()
      });

      // Send notification to admin/inviter?
      // Group admin logic is simple here, assuming creator is admin
      if (groupData.createdBy) {
        await sendNotification(
          'Group Invite Accepted',
          `${currentUserDisplayName} has joined your group "${groupName}".`,
          'Important Alerts',
          groupData.createdBy
        );
      }

      onAccept();
    } catch (err: any) {
      console.error('Failed to accept group invite:', err);
      setError(err.message || 'Failed to join group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    setError(null);
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (groupSnap.exists()) {
        const groupData = groupSnap.data() as StudyGroup;
        if (groupData.createdBy) {
          await sendNotification(
            'Group Invite Declined',
            `${currentUserDisplayName} has declined the invitation to join "${groupName}".`,
            'Important Alerts',
            groupData.createdBy
          );
        }
      }

      onDecline();
    } catch (err: any) {
      console.error('Failed to decline group invite:', err);
      // Still proceed with decline visually
      onDecline();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-4 md:px-6">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200/60 dark:border-slate-800/60 text-center relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-900/20 to-transparent pointer-events-none" />
        
        <div className="relative">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-inner ring-4 ring-white dark:ring-slate-900">
            <Users className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-4">
            Group Invitation
          </h2>
          
          <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-lg mx-auto leading-relaxed">
            <span className="font-bold text-slate-800 dark:text-white">{inviterName}</span> has invited you to join the study group <span className="font-bold text-indigo-600 dark:text-indigo-400">&quot;{groupName}&quot;</span>.
          </p>

          {error && (
            <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium flex flex-col items-center gap-2 border border-rose-200 dark:border-rose-900/50">
              <ShieldAlert className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <button
              onClick={handleDecline}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 disabled:opacity-50"
            >
              Decline Invite
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all focus:ring-4 focus:ring-indigo-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              {loading ? 'Joining...' : 'Accept & Join'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupInviteView;
