import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import { Mail, Check, X, Bell } from 'lucide-react';
import { GroupInviteModel } from './types';

interface InviteListProps {
  user: User;
  onAcceptSuccess?: (groupId: string) => void;
}

export const InviteList: React.FC<InviteListProps> = ({ user, onAcceptSuccess }) => {
  const [invites, setInvites] = useState<GroupInviteModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.email) return;

    // Fetch pending invites sent to user's email
    const q = query(
      collection(db, 'user_invites'),
      where('email', '==', user.email.trim().toLowerCase()),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as GroupInviteModel[];

        setInvites(fetched);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching group invites:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user.email]);

  const handleAction = async (invite: GroupInviteModel, action: 'accepted' | 'declined') => {
    try {
      // 1. Update the invitation record status in Firestore
      const inviteRef = doc(db, 'user_invites', invite.id);
      await updateDoc(inviteRef, {
        status: action,
        receiverUid: user.uid,
      });

      // 2. If accepted, add user to group members
      if (action === 'accepted') {
        const groupRef = doc(db, 'groups', invite.groupId);
        await updateDoc(groupRef, {
          members: arrayUnion(user.uid),
          memberCount: increment(1),
        });

        if (onAcceptSuccess) {
          onAcceptSuccess(invite.groupId);
        }
      }
    } catch (err) {
      console.error(`Error performing ${action} action:`, err);
      alert('An error occurred. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse text-left">
        {[1, 2].map((idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex justify-between items-center"
          >
            <div className="space-y-2 w-2/3">
              <div className="w-1/2 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-left space-y-4">
      {invites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800/80 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 rounded-xl shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white tracking-tight">
                    {invite.groupName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Invited by <span className="font-bold">{invite.invitedByName || 'A peer'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAction(invite, 'declined')}
                  className="p-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                  title="Decline invitation"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleAction(invite, 'accepted')}
                  className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-md shadow-primary-600/10"
                  title="Accept invitation"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <Bell className="w-12 h-12 text-slate-400 mx-auto mb-3.5 opacity-40 animate-pulse" />
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            No Pending Invitations
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            When peers invite you to join their study groups, they will appear here in real time.
          </p>
        </div>
      )}
    </div>
  );
};
