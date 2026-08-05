import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, ArrowLeft, ShieldAlert, XCircle, Check, ArrowRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNotifications } from './NotificationContext';
import { StudyGroup, GroupMember } from '../types';
import { joinGroupInFirestore } from '../utils/firebaseUtils';

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
  const [isDeclined, setIsDeclined] = useState(false);
  const [groupOwnerName, setGroupOwnerName] = useState<string>('Group Admin');
  const [groupSubject, setGroupSubject] = useState<string>('');
  const [memberCount, setMemberCount] = useState<number>(1);
  const { sendNotification, triggerToast } = useNotifications();

  useEffect(() => {
    const fetchGroupInfo = async () => {
      try {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const data = groupSnap.data() as StudyGroup;
          if (data.creatorName) setGroupOwnerName(data.creatorName);
          if (data.subject) setGroupSubject(data.subject);
          if (data.memberCount) setMemberCount(data.memberCount);
        }
      } catch (e) {
        console.warn('Could not fetch group details:', e);
      }
    };
    fetchGroupInfo();
  }, [groupId]);

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
      
      const newMember: GroupMember = {
        uid: currentUserId,
        displayName: currentUserDisplayName,
        role: 'member',
        joinedAt: Date.now()
      };

      const success = await joinGroupInFirestore(groupId, newMember);
      if (!success) {
        throw new Error('Failed to update group membership.');
      }

      // Notify the group creator / admin
      if (groupData.createdBy) {
        await sendNotification(
          'Group Invite Accepted 🎉',
          `${currentUserDisplayName} accepted your invitation and joined "${groupName}".`,
          'Important Alerts',
          groupData.createdBy
        );
      }

      triggerToast('Joined Group! 🎉', `Welcome to ${groupName}! You can now see all messages.`, 'Important Alerts');
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
      
      let ownerUid = '';
      if (groupSnap.exists()) {
        const groupData = groupSnap.data() as StudyGroup;
        ownerUid = groupData.createdBy || '';
        if (groupData.creatorName) setGroupOwnerName(groupData.creatorName);
      }

      if (ownerUid) {
        await sendNotification(
          'Group Invite Declined ❌',
          `${currentUserDisplayName} has declined the invitation to join "${groupName}".`,
          'Important Alerts',
          ownerUid
        );
      }

      setIsDeclined(true);
      triggerToast('Invite Declined', `Notification sent to ${groupOwnerName}.`, 'Important Alerts');
    } catch (err: any) {
      console.error('Failed to decline group invite:', err);
      setIsDeclined(true);
    } finally {
      setLoading(false);
    }
  };

  if (isDeclined) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4 md:px-6">
        <button
          onClick={onDecline}
          className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200/60 dark:border-slate-800/60 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-rose-50/50 dark:from-rose-950/20 to-transparent pointer-events-none" />
          
          <div className="relative">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/40 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-inner ring-4 ring-white dark:ring-slate-900">
              <XCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-3">
              Invitation Declined
            </h2>
            
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 mb-6 max-w-lg mx-auto leading-relaxed">
              You have declined the invitation to join <span className="font-bold text-slate-800 dark:text-white">&quot;{groupName}&quot;</span>.
            </p>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-sm font-medium mb-8 max-w-md mx-auto flex items-center gap-3 text-left">
              <Check className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                The group owner (<strong className="text-amber-950 dark:text-amber-100">{groupOwnerName}</strong>) has been informed of your response.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onDecline}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2">
            Group Invitation
          </h2>
          
          <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 mb-6 max-w-lg mx-auto leading-relaxed">
            <span className="font-bold text-slate-800 dark:text-white">{inviterName}</span> has invited you to join the study group <span className="font-bold text-indigo-600 dark:text-indigo-400">&quot;{groupName}&quot;</span>.
          </p>

          {(groupSubject || memberCount) && (
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 mb-8">
              {groupSubject && <span>Subject: {groupSubject}</span>}
              {groupSubject && memberCount && <span>•</span>}
              {memberCount && <span>{memberCount} members</span>}
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium flex flex-col items-center gap-2 border border-rose-200 dark:border-rose-900/50">
              <ShieldAlert className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
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
