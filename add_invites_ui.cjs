const fs = require('fs');

let code = fs.readFileSync('components/GroupsView.tsx', 'utf8');

// Add Invites tab to GroupsView
const searchTabBlock = `
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('my_groups')}
            className={\`flex-1 sm:flex-none px-5 py-2 rounded-lg font-semibold text-sm transition-all \${activeTab === 'my_groups' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}\`}
          >
            My Groups
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={\`flex-1 sm:flex-none px-5 py-2 rounded-lg font-semibold text-sm transition-all \${activeTab === 'discover' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}\`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={\`flex-1 sm:flex-none px-5 py-2 rounded-lg font-semibold text-sm transition-all \${activeTab === 'invites' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}\`}
          >
            Invites
          </button>
        </div>
`;

code = code.replace(/<div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit">[\s\S]*?<\/div>/, searchTabBlock);

// State for activeTab
code = code.replace(/const \[activeTab, setActiveTab\] = useState<'my_groups' \| 'discover'>\('my_groups'\);/, `const [activeTab, setActiveTab] = useState<'my_groups' | 'discover' | 'invites'>('my_groups');
  const [invites, setInvites] = useState<any[]>([]);`);

// Fetching invites in useEffect
const useEffectRegex = /    const unsub = onSnapshot\(q, \(snap\) => \{[\s\S]*?    return unsub;/;
const newUseEffect = `    const unsub = onSnapshot(q, (snap) => {
      const allGroups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(allGroups.filter(g => g.privacy === 'public'));
      setMyGroups(allGroups.filter(g => 
        g.ownerId === user.uid || 
        (g.members && g.members.includes(user.uid)) || 
        (g.admins && g.admins.includes(user.uid))
      ));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    
    // Fetch user invites
    let unsubInvites = () => {};
    if (user.email) {
      const qInvites = query(collection(db, 'user_invites'), where('email', '==', user.email.toLowerCase()), where('status', '==', 'pending'));
      unsubInvites = onSnapshot(qInvites, (snap) => {
        setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    return () => { unsub(); unsubInvites(); };`;

code = code.replace(useEffectRegex, newUseEffect);

// Add logic to handle accepting/declining invites
const acceptDeclineLogic = `
  const handleAcceptInvite = async (invite: any) => {
    try {
      // Add user to group
      const groupRef = doc(db, 'groups', invite.groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid)
      });
      // Delete invite or mark accepted
      await deleteDoc(doc(db, 'user_invites', invite.id));
      alert('Joined group!');
    } catch (e) {
      console.error(e);
      alert('Failed to accept invite.');
    }
  };

  const handleDeclineInvite = async (invite: any) => {
    try {
      await deleteDoc(doc(db, 'user_invites', invite.id));
    } catch (e) {
      console.error(e);
      alert('Failed to decline invite.');
    }
  };

  const displayedGroups = (activeTab === 'my_groups' ? myGroups : groups).filter(g => 
`;

code = code.replace(/  const displayedGroups = \(activeTab === 'my_groups' \? myGroups : groups\)\.filter\(g =>/, acceptDeclineLogic);

// Add Invites UI
const invitesUI = `
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : activeTab === 'invites' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {invites.map(invite => (
            <div key={invite.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{invite.groupName}</h3>
               <p className="text-sm text-slate-500 mb-4">Invited by {invite.invitedByName}</p>
               <div className="flex gap-2">
                 <button onClick={() => handleAcceptInvite(invite)} className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-bold">Accept</button>
                 <button onClick={() => handleDeclineInvite(invite)} className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold">Decline</button>
               </div>
            </div>
          ))}
          {invites.length === 0 && (
             <div className="col-span-full py-16 text-center text-slate-500">No pending invitations.</div>
          )}
        </div>
      ) : (
`;

code = code.replace(/      \{loading \? \([\s\S]*?      \) : \(/, invitesUI);

fs.writeFileSync('components/GroupsView.tsx', code);
