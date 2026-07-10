const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Since we are running in the node container, maybe we can just query the database via the admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  try {
    const q = db.collection('groups')
      .where('privacy', '==', 'public')
      .where('isActive', '==', true);
    
    const snap = await q.get();
    console.log("Found", snap.size, "groups");
    snap.forEach(doc => console.log(doc.id, doc.data().name));
  } catch (err) {
    console.error(err);
  }
}
run();
