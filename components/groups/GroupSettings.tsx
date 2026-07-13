import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, getDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import { ArrowLeft, Save, Trash2, Shield, UserMinus, LogOut, Award, Share2 } from 'lucide-react';
import { GroupModel } from './types';
import { useNotifications } from '../NotificationContext';

interface GroupSettingsProps {
  user: User;
  group: GroupModel;
  onBack: () => void;
  onUpdateGroup: (updated: GroupModel) => void;
  onLeaveGroupSuccess: () => void;
}

interface MemberInfo {
  uid: string;
  displayName: string;
  email?: string;
  role: 'owner' | 'admin' | 'member';
}

export const GroupSettings: React.FC<GroupSettingsProps> = ({
  user,
  group,
  onBack,
  onUpdateGroup,
  onLeaveGroupSuccess,
}) => {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [privacy, setPrivacy] = useState<'public' | 'private'>(group.privacy || 'public');
  const [category, setCategory] = useState(group.category || 'Study');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [membersInfo, setMembersInfo] = useState<MemberInfo[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const { triggerToast } = useNotifications();

  const handleShareGroup = async () => {
    const shareLink = `${window.location.origin}/?joinGroup=${group.id}`;
    const shareTitle = `Join my Study Group: ${group.name}`;
    const shareText = `Hey! Join our study group "${group.name}" on SJ Tutor AI to study and chat together. 📚✨`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareLink,
        });
        triggerToast("Shared successfully!", `Invited friends to join ${group.name}.`, "Quiz Updates");
      } catch (err) {
        console.warn("Web Share failed or cancelled:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareLink);
        triggerToast("Group link copied!", "Share it with your friends to join.", "Quiz Updates");
      } catch (err) {
        console.error("Clipboard copy failed:", err);
        alert("Failed to copy link. Please manually copy this URL: " + shareLink);
      }
    }
  };

  const isOwner = group.ownerId === user.uid;
  const isAdmin = group.admins?.includes(user.uid) || isOwner;

  // Fetch profiles of members to render their human-readable display names and details
  useEffect(() => {
    const fetchMemberProfiles = async () => {
      setLoadingMembers(true);
      try {
        const list: MemberInfo[] = [];
        for (const mId of group.members || []) {
          let displayName = 'User';
          let email = '';
          try {
            const userDoc = await getDoc(doc(db, 'users', mId));
            if (userDoc.exists()) {
              const uData = userDoc.data();
              displayName = uData.displayName || uData.name || 'Student';
              email = uData.email || '';
            }
          } catch (e) {
            console.error('Error fetching member profile:', e);
          }

          let role: 'owner' | 'admin' | 'member' = 'member';
          if (mId === group.ownerId) {
            role = 'owner';
          } else if (group.admins?.includes(mId)) {
            role = 'admin';
          }

          list.push({ uid: mId, displayName, email, role });
        }
        setMembersInfo(list);
      } catch (err) {
        console.error('Error fetching members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMemberProfiles();
  }, [group.members, group.ownerId, group.admins]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isAdmin) return;

    setSaving(true);
    try {
      const groupRef = doc(db, 'groups', group.id);
      const updates = {
        name: name.trim(),
        description: description.trim(),
        privacy: privacy,
        visibility: privacy, // Keep in sync for compatibility
        category: category,
      };

      await updateDoc(groupRef, updates);
      onUpdateGroup({ ...group, ...updates });
      alert('Group settings saved successfully!');
    } catch (err) {
      console.error('Error saving group settings:', err);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async (memberUid: string, memberName: string) => {
    if (!isOwner) return;
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        admins: arrayUnion(memberUid),
      });

      const updatedAdmins = [...(group.admins || []), memberUid];
      onUpdateGroup({ ...group, admins: updatedAdmins });
      alert(`${memberName} has been promoted to Admin.`);
    } catch (err) {
      console.error('Error promoting member:', err);
    }
  };

  const handleDemote = async (memberUid: string, memberName: string) => {
    if (!isOwner) return;
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        admins: arrayRemove(memberUid),
      });

      const updatedAdmins = (group.admins || []).filter((id) => id !== memberUid);
      onUpdateGroup({ ...group, admins: updatedAdmins });
      alert(`${memberName} demoted back to standard member.`);
    } catch (err) {
      console.error('Error demoting member:', err);
    }
  };

  const handleRemoveMember = async (memberUid: string, memberName: string) => {
    if (!isAdmin || memberUid === group.ownerId) return;
    
    const confirmKick = window.confirm(`Are you sure you want to remove ${memberName} from this group?`);
    if (!confirmKick) return;

    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayRemove(memberUid),
        admins: arrayRemove(memberUid), // Clean up admin list just in case
        memberCount: increment(-1),
      });

      const updatedMembers = (group.members || []).filter((id) => id !== memberUid);
      const updatedAdmins = (group.admins || []).filter((id) => id !== memberUid);
      
      onUpdateGroup({
        ...group,
        members: updatedMembers,
        admins: updatedAdmins,
        memberCount: (group.memberCount || 1) - 1,
      });
      alert(`${memberName} removed from the group.`);
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleLeaveGroup = async () => {
    if (isOwner) {
      alert('Owners cannot leave the group directly. Please transfer ownership first, or delete the group.');
      return;
    }

    const confirmLeave = window.confirm('Are you sure you want to leave this group?');
    if (!confirmLeave) return;

    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayRemove(user.uid),
        admins: arrayRemove(user.uid),
        memberCount: increment(-1),
      });

      onLeaveGroupSuccess();
    } catch (err) {
      console.error('Error leaving group:', err);
    }
  };

  const handleTransferOwnership = async (memberUid: string, memberName: string) => {
    if (!isOwner) return;
    const confirmTransfer = window.confirm(`Are you sure you want to transfer full ownership to ${memberName}? You will be demoted to an Admin.`);
    if (!confirmTransfer) return;

    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        ownerId: memberUid,
        ownerName: memberName,
        admins: arrayUnion(user.uid), // Promote old owner to admin
      });

      onUpdateGroup({
        ...group,
        ownerId: memberUid,
        ownerName: memberName,
        admins: [...(group.admins || []), user.uid],
      });
      alert(`Ownership transferred to ${memberName} successfully!`);
    } catch (err) {
      console.error('Error transferring ownership:', err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!isOwner) return;
    const confirmDelete = window.confirm('CRITICAL ACTION: Are you sure you want to permanently delete this study group? This cannot be undone.');
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const groupRef = doc(db, 'groups', group.id);
      // We perform deletion of the group document
      await deleteDoc(groupRef);
      alert('Group deleted successfully.');
      onLeaveGroupSuccess();
    } catch (err) {
      console.error('Error deleting group:', err);
      alert('Failed to delete group.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Group Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure {group.name} settings and manage participants.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Side: General Form Settings */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              📝 Group Properties
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Group Name</label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 disabled:opacity-55 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                <textarea
                  disabled={!isAdmin}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800 disabled:opacity-55 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Privacy</label>
                  <select
                    disabled={!isAdmin}
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
                    className="w-full bg-slate-50 dark:bg-slate-800 disabled:opacity-55 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  >
                    <option value="public">🌍 Public</option>
                    <option value="private">🔒 Private</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
                  <select
                    disabled={!isAdmin}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 disabled:opacity-55 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  >
                    <option value="Study">📚 Study</option>
                    <option value="Exam Prep">✏️ Exam Prep</option>
                    <option value="Homework Help">🤝 Homework Help</option>
                    <option value="General">💬 General</option>
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-primary-600/10"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Members List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              👥 Members List ({membersInfo.length})
            </h3>

            {loadingMembers ? (
              <div className="space-y-3">
                {[1, 2].map((idx) => (
                  <div key={idx} className="h-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto pr-1">
                {membersInfo.map((member) => {
                  const memberIsMe = member.uid === user.uid;
                  const memberIsOwner = member.uid === group.ownerId;
                  const memberIsAdmin = member.role === 'admin';

                  return (
                    <div key={member.uid} className="py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {member.displayName} {memberIsMe && '(You)'}
                          </span>
                          
                          {memberIsOwner ? (
                            <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/10 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                              <Award className="w-2.5 h-2.5" /> Owner
                            </span>
                          ) : memberIsAdmin ? (
                            <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/40 dark:border-blue-900/10 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                              <Shield className="w-2.5 h-2.5" /> Admin
                            </span>
                          ) : null}
                        </div>
                        {member.email && (
                          <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">{member.email}</span>
                        )}
                      </div>

                      {/* Member Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOwner && !memberIsMe && (
                          <>
                            {memberIsAdmin ? (
                              <button
                                onClick={() => handleDemote(member.uid, member.displayName)}
                                className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-200 dark:border-slate-700"
                                title="Demote back to standard member"
                              >
                                Demote
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handlePromote(member.uid, member.displayName)}
                                  className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg transition-all border border-blue-150/40 shrink-0"
                                  title="Promote to administrator"
                                >
                                  Make Admin
                                </button>
                                <button
                                  onClick={() => handleTransferOwnership(member.uid, member.displayName)}
                                  className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 rounded-lg transition-all border border-amber-150/40 shrink-0"
                                  title="Transfer total group ownership"
                                >
                                  Transfer Owner
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {/* Kick / Remove Member */}
                        {isAdmin && !memberIsMe && !memberIsOwner && (
                          <button
                            onClick={() => handleRemoveMember(member.uid, member.displayName)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all shrink-0"
                            title="Remove member from study group"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Exit / Danger Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-black text-slate-900 dark:text-white mb-4">
              🚪 Group Actions
            </h3>

            <div className="space-y-3">
              <button
                onClick={handleShareGroup}
                className="w-full flex items-center justify-center gap-2 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-900/30 rounded-xl py-3 text-sm font-black transition-all mb-1"
              >
                <Share2 className="w-4 h-4" />
                Share Group Link
              </button>

              {!isOwner && (
                <button
                  onClick={handleLeaveGroup}
                  className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/30 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 rounded-xl py-3 text-sm font-black text-slate-700 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Leave Study Group
                </button>
              )}

              {isOwner && (
                <button
                  onClick={handleDeleteGroup}
                  disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 border border-red-200/60 dark:border-red-900/30 rounded-xl py-3 text-sm font-black transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting...' : 'Delete Study Group'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
