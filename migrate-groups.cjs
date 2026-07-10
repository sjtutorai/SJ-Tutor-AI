require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const groupsSnap = await db.collection('groups').get();
  let migrated = 0;
  for (const doc of groupsSnap.docs) {
    const data = doc.data();
    let updates = {};
    
    // migrate isActive to status
    if (data.isActive !== undefined && !data.status) {
       updates.status = data.isActive ? 'active' : 'inactive';
    } else if (!data.status) {
       updates.status = 'active';
    }

    // migrate privacy to visibility
    if (data.privacy !== undefined && !data.visibility) {
       updates.visibility = data.privacy;
    } else if (!data.visibility) {
       updates.visibility = 'public';
    }

    // migrate description to subject
    if (data.description !== undefined && !data.subject) {
       updates.subject = data.description;
    }

    if (Object.keys(updates).length > 0) {
      console.log('Migrating', doc.id, updates);
      await doc.ref.update(updates);
      migrated++;
    }
  }
  console.log('Migrated', migrated, 'groups');
}
run();
