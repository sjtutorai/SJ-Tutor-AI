import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import { Mail, Check, X, Bell, AlertCircle, RefreshCw } from 'lucide-react';
import { GroupInviteModel } from './types';
import { handleFirestoreError, OperationType } from '../../utils/firebaseUtils';

interface InviteListProps {
  user: User;
  onAcceptSuccess?: (groupId: string) => void;
}

export const InviteList: React.FC<InviteListProps> = ({ user, onAcceptSuccess }) => {
  const [invites, setInvites] = useState<GroupInviteModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user.email) return;

    setLoading(true);
    setErrorMsg(null);

    // Timeout helper after 10000ms (10 seconds)
    const timer = setTimeout(() => {
      setLoading(false);
      setErrorMsg('The connection timed out while querying invites. Please click below to retry.');
    }, 10000);

    // Fetch pending invites sent to user's email
    const q = query(
      collection(db, 'user_invites'),
      where('email', '==', user.email.trim().toLowerCase()),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        clearTimeout(timer);
        const fetched = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            expiresAt: data.expiresAt || null,
          };
        }) as GroupInviteModel[];

        setInvites(fetched);
        setLoading(false);
      },
      (error) => {
        clearTimeout(timer);
        console.error('Error fetching group invites:', error);
        setErrorMsg('Failed to subscribe to invitations. Please check security rules.');
        setLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'user_invites');
        } catch {
          // Logged
        }
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [user.email, retryCount]);

  const handleAction = async (invite: GroupInviteModel, action: 'accepted' | 'declined') => {
    if (processingInviteId) return; // Prevent concurrent modifications
    setProcessingInviteId(invite.id);
    setErrorMsg(null);

    try {
      // 1. Verify if invitation is expired (e.g. check invite.expiresAt or older than 7 days)
      const createdAtMs = invite.createdAt?.toMillis ? invite.createdAt.toMillis() : (typeof invite.createdAt === 'number' ? invite.createdAt : Date.now());
      const expiryTime = invite.expiresAt || (createdAtMs + 7 * 24 * 60 * 60 * 1000);
      
      if (expiryTime < Date.now()) {
        alert('This invitation has expired.');
        // Quietly clean up/decline expired invite so it doesn't hang in the UI
        const inviteRef = doc(db, 'user_invites', invite.id);
        await updateDoc(inviteRef, { status: 'declined' });
        return;
      }

      // 2. Fetch the corresponding group to validate membership, existence, and status
      const { getDoc } = await import('firebase/firestore');
      const groupRef = doc(db, 'groups', invite.groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        alert('This study group no longer exists or was deleted.');
        const inviteRef = doc(db, 'user_invites', invite.id);
        await updateDoc(inviteRef, { status: 'cancelled' });
        return;
      }

      const groupData = groupSnap.data();
      const isGroupActive = groupData.isActive !== false && groupData.status !== 'inactive';
      if (!isGroupActive) {
        alert('This study group is currently inactive or archived.');
        const inviteRef = doc(db, 'user_invites', invite.id);
        await updateDoc(inviteRef, { status: 'cancelled' });
        return;
      }

      const members = groupData.members || [];
      if (members.includes(user.uid)) {
        alert('You are already a member of this study group.');
        // Resolve invite automatically
        const inviteRef = doc(db, 'user_invites', invite.id);
        await updateDoc(inviteRef, { status: 'accepted', receiverUid: user.uid });
        if (onAcceptSuccess) {
          onAcceptSuccess(invite.groupId);
        }
        return;
      }

      // 3. Update invitation record status in Firestore
      const inviteRef = doc(db, 'user_invites', invite.id);
      await updateDoc(inviteRef, {
        status: action,
        receiverUid: user.uid,
      });

      // 4. If accepted, add user to group members
      if (action === 'accepted') {
        await updateDoc(groupRef, {
          members: arrayUnion(user.uid),
          memberCount: increment(1),
        });

        // Send join system message
        const { addDoc } = await import('firebase/firestore');
        await addDoc(collection(db, 'groups', invite.groupId, 'messages'), {
          text: `${user.displayName || 'A student'} has joined the study group! Welcome! 👋`,
          senderId: 'system',
          senderName: 'System',
          createdAt: Date.now()
        });

        if (onAcceptSuccess) {
          onAcceptSuccess(invite.groupId);
        }
      }
    } catch (err) {
      console.error(`Error performing ${action} action:`, err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `user_invites/${invite.id}`);
      } catch {
        // Logged
      }
      alert('An error occurred while processing invitation. Please try again.');
    } finally {
      setProcessingInviteId(null);
    }
  };

  if (errorMsg) {
    return (
      <div className="p-8 text-center bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-3xl space-y-4 max-w-md mx-auto text-left">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white text-center">Query Timeout</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center">{errorMsg}</p>
        <div className="text-center">
          <button
            onClick={() => setRetryCount((prev) => prev + 1)}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Invite Query
          </button>
        </div>
      </div>
    );
  }

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
                  disabled={processingInviteId !== null}
                  className="p-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-700 disabled:opacity-50"
                  title="Decline invitation"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleAction(invite, 'accepted')}
                  disabled={processingInviteId !== null}
                  className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-md shadow-primary-600/10 disabled:opacity-50 flex items-center justify-center min-w-[38px] min-h-[38px]"
                  title="Accept invitation"
                >
                  {processingInviteId === invite.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
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
