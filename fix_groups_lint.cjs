const fs = require('fs');

let code = fs.readFileSync('components/GroupsView.tsx', 'utf8');

// Remove unused imports
code = code.replace(/Hash, Image as ImageIcon, /, '');
code = code.replace(/MoreVertical, /, '');
code = code.replace(/Edit2, Check, X /, '');
code = code.replace(/getDocs, /, '');
code = code.replace(/setDoc, /, '');

// Use the sendNotification properly in handleInvite or remove if unused. We will query user.
const replaceBlock = `
  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email.');
      return;
    }
    
    setSending(true);
    try {
      // Create an invite in the group's invites subcollection
      await addDoc(collection(db, 'groups', group.id, 'invites'), {
        email: email.trim().toLowerCase(),
        invitedBy: user.uid,
        invitedByName: user.displayName || 'Someone',
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      
      // Try to find the user by email to send a notification
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.trim().toLowerCase()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const invitedUser = snap.docs[0];
        const invitedUid = invitedUser.id;
        
        // Add a notification for that user
        await addDoc(collection(db, 'users', invitedUid, 'notifications'), {
          type: 'group_invite',
          title: 'Group Invitation',
          message: \`\${user.displayName || 'Someone'} invited you to join \${group.name}\`,
          groupId: group.id,
          groupName: group.name,
          read: false,
          createdAt: serverTimestamp(),
          link: '/groups'
        });
      }
      
      alert(\`Invitation sent to \${email}\`);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to send invite.');
    } finally {
      setSending(false);
    }
  };
`;

code = code.replace(/  const handleInvite = async \(\) => \{[\s\S]*?  \};/, replaceBlock);
// We need to re-add getDocs
code = code.replace(/orderBy, doc, deleteDoc/, 'orderBy, getDocs, doc, deleteDoc');
// Make sure getDocs is in the imports.
if(!code.includes('getDocs')) {
  code = code.replace(/orderBy, /, 'orderBy, getDocs, ');
}

fs.writeFileSync('components/GroupsView.tsx', code);
