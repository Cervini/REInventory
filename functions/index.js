// functions/index.js

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
      console.error('No Firebase ID token was passed in the Authorization header.');
      res.status(401).send({ error: { message: 'Unauthorized: No token provided.' } });
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
       const ownedCampaignsQuery = await db.collection("campaigns")
        .where("dmId", "==", uid).get();
      const deleteSubcollectionsPromises = [];
      ownedCampaignsQuery.forEach((campaignDoc) => {
          const inventoriesRef = campaignDoc.ref.collection("inventories");
          const deletePromise = inventoriesRef.get().then(invSnapshot => {
              invSnapshot.forEach(doc => batch.delete(doc.ref));
          });
          deleteSubcollectionsPromises.push(deletePromise);
          batch.delete(campaignDoc.ref);
      });
      await Promise.all(deleteSubcollectionsPromises);
      await batch.commit();

      res.status(200).send({ data: { success: true, message: "Account deleted successfully." } });
    } catch (error) {
      console.error("Error during account deletion:", error);
      res.status(500).send({ error: { message: "An internal error occurred." } });
    }
  });
});

exports.finalizeTrade = functions.https.onRequest(async (req, res) => {
  const cors = require("cors")({ origin: true });
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send({ error: { message: 'Method Not Allowed' } });
    }
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      return res.status(401).send({ error: { message: 'Unauthorized: No token provided.' } });
    }

    const idToken = req.headers.authorization.split('Bearer ')[1];
    const { tradeId } = req.body.data;

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      if (!tradeId) {
        throw new Error("tradeId is required.");
      }

      const tradeDocRef = db.collection("trades").doc(tradeId);

      await db.runTransaction(async (transaction) => {
        const tradeDoc = await transaction.get(tradeDocRef);
        if (!tradeDoc.exists) {
          throw new Error("Trade does not exist.");
        }
        const tradeData = tradeDoc.data();

        if (uid !== tradeData.playerA && uid !== tradeData.playerB) {
          throw new Error("You are not a participant in this trade.");
        }
        if (!tradeData.acceptedA || !tradeData.acceptedB) {
          throw new Error("Both players must accept the trade.");
        }

        const campaignId = tradeData.campaignId;
        const inventoryRefA = db.collection("campaigns").doc(campaignId).collection("inventories").doc(tradeData.playerA);
        const inventoryRefB = db.collection("campaigns").doc(campaignId).collection("inventories").doc(tradeData.playerB);
        
        const invDocA = await transaction.get(inventoryRefA);
        const invDocB = await transaction.get(inventoryRefB);

        if (!invDocA.exists || !invDocB.exists) {
          throw new Error("Could not find player inventories.");
        }

        // --- THIS IS THE CORE FIX ---
        // Robustly handle the inventory swap.

        const invDataA = invDocA.data();
        const offerA_Ids = new Set((tradeData.offerA || []).map(i => i.id));
        // Create new, completely separate arrays for the final state.
        let finalGridA = (invDataA.gridItems || []).filter(item => !offerA_Ids.has(item.id));
        let finalTrayA = (invDataA.trayItems || []).filter(item => !offerA_Ids.has(item.id));
        // Add received items to the new tray array.
        (tradeData.offerB || []).forEach(item => finalTrayA.push(item));
        
        // Update Player A's inventory in the transaction.
        transaction.update(inventoryRefA, { gridItems: finalGridA, trayItems: finalTrayA });

        const invDataB = invDocB.data();
        const offerB_Ids = new Set((tradeData.offerB || []).map(i => i.id));
        let finalGridB = (invDataB.gridItems || []).filter(item => !offerB_Ids.has(item.id));
        let finalTrayB = (invDataB.trayItems || []).filter(item => !offerB_Ids.has(item.id));
        (tradeData.offerA || []).forEach(item => finalTrayB.push(item));
        
        // Update Player B's inventory in the transaction.
        transaction.update(inventoryRefB, { gridItems: finalGridB, trayItems: finalTrayB });
        
        // Finally, delete the trade document.
        transaction.delete(tradeDocRef);
      });
      
      return res.status(200).send({ data: { message: "Trade completed successfully!" } });
    } catch (error) {
      console.error("Error finalizing trade:", error);
      return res.status(500).send({ error: { message: error.message || "An internal error occurred." } });
    }
  });
});

exports.cancelTrade = functions.https.onRequest(async (req, res) => {
  const cors = require("cors")({ origin: true });
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send({ error: { message: 'Method Not Allowed' } });
    }
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      return res.status(401).send({ error: { message: 'Unauthorized: No token provided.' } });
    }

    const idToken = req.headers.authorization.split('Bearer ')[1];
    const { tradeId } = req.body.data;

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      
      if (!tradeId) {
        throw new Error("tradeId is required.");
      }

      const tradeDocRef = db.collection("trades").doc(tradeId);
      const tradeDoc = await tradeDocRef.get();
      if (!tradeDoc.exists) {
        return res.status(200).send({ data: { message: "Trade already resolved." } });
      }
      const tradeData = tradeDoc.data();
      if (uid !== tradeData.playerA && uid !== tradeData.playerB) {
        return res.status(403).send({ error: { message: 'Permission denied.' } });
      }
      
      await tradeDocRef.delete();
      return res.status(200).send({ data: { message: "Trade cancelled." } });

    } catch (error) {
      console.error("Error cancelling trade:", error);
      return res.status(500).send({ error: { message: "An internal error occurred." } });
    }
  });
});