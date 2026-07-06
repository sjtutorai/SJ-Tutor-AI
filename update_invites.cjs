const fs = require('fs');

let code = fs.readFileSync('components/GroupsView.tsx', 'utf8');

const replaceBlock = `
  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email.');
      return;
    }
    
    setSending(true);
    try {
      const emailLower = email.trim().toLowerCase();
      // Try to find the user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', emailLower));
      const snap = await getDocs(q);
      
      let invitedUid = '';
      if (!snap.empty) {
        invitedUid = snap.docs[0].id;
      }
      
      // Create an invite in the user_invites collection
      const inviteData = {
        email: emailLower,
        invitedBy: user.uid,
        invitedByName: user.displayName || 'Someone',
        groupId: group.id,
        groupName: group.name,
        createdAt: serverTimestamp(),
        status: 'pending'
      };
      
      await addDoc(collection(db, 'user_invites'), inviteData);
      
      if (invitedUid) {
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

fs.writeFileSync('components/GroupsView.tsx', code);
