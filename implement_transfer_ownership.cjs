const fs = require('fs');
let code = fs.readFileSync('components/GroupsView.tsx', 'utf8');

const replacement = `  const handleTransferOwnership = async () => {
    if (!isOwner) return;
    const email = prompt("Enter the email of the user to transfer ownership to:");
    if (!email) return;
    
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("User not found.");
        return;
      }
      const newOwnerId = snap.docs[0].id;
      
      if (!group.members?.includes(newOwnerId)) {
        alert("The user must be a member of the group first.");
        return;
      }
      
      if (confirm(\`Are you sure you want to transfer ownership to \${email}?\`)) {
        const groupRef = doc(db, 'groups', group.id);
        await updateDoc(groupRef, {
          ownerId: newOwnerId,
          admins: arrayUnion(newOwnerId)
        });
        alert("Ownership transferred.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to transfer ownership.");
    }
  };

  const handleLeaveGroup = async () => {`;

code = code.replace(/  const handleLeaveGroup = async \(\) => \{/, replacement);

const buttonReplace = `              {isOwner && (
                <button 
                  onClick={handleTransferOwnership}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="w-5 h-5" />
                    Transfer Ownership
                  </span>
                </button>
              )}
              
              {isOwner && (
                <button 
                  onClick={handleDeleteGroup}`;

code = code.replace(/              \{isOwner && \(\n                <button \n                  onClick=\{.*?\}\n                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900\/50 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900\/20 font-semibold transition-colors"\n                >\n                  <span className="flex items-center gap-2">\n                    <LogOut className="w-5 h-5" \/>\n                    Transfer Ownership\n                  <\/span>\n                <\/button>\n              \)}\n              \n              \{isOwner && \(\n                <button \n                  onClick=\{handleDeleteGroup\}/s, buttonReplace);

fs.writeFileSync('components/GroupsView.tsx', code);
