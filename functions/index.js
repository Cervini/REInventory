const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

exports.deleteUserAccount = functions.https.onRequest((req, res) => {
  // Manually handle CORS to allow requests from your website
  cors(req, res, async () => {
    // Check for an authentication token in the request headers
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      console.error('No Firebase ID token was passed.');
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const idToken = req.headers.authorization.split('Bearer ')[1];

    try {
      // Manually verify the token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // --- The rest of the deletion logic is the same ---
      await admin.auth().deleteUser(uid);
      const batch = db.batch();
      const userDocRef = db.collection("users").doc(uid);
      batch.delete(userDocRef);
      const campaignsQuery = await db.collection("campaigns")
          .where("players", "array-contains", uid).get();
      campaignsQuery.forEach((campaignDoc) => {
        const inventoryDocRef = campaignDoc.ref.collection("inventories").doc(uid);
        batch.delete(inventoryDocRef);
        batch.update(campaignDoc.ref, {
          players: admin.firestore.FieldValue.arrayRemove(uid),
        });
      });
      await batch.commit();

      res.status(200).send({ data: { success: true, message: "Account deleted successfully." } });
    } catch (error) {
      console.error("Error during account deletion:", error);
      res.status(500).send({ error: "An internal error occurred." });
    }
  });
});