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

exports.finalizeTrade = functions.https.onCall(async (data, context) => {
  // Check for authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const { tradeId } = data;
  if (!tradeId) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'tradeId'.");
  }

  const uid = context.auth.uid;
  const tradeDocRef = db.collection("trades").doc(tradeId);

  try {
    await db.runTransaction(async (transaction) => {
      const tradeDoc = await transaction.get(tradeDocRef);
      if (!tradeDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Trade does not exist.");
      }
      const tradeData = tradeDoc.data();

      // Security check: ensure the caller is one of the players in the trade
      if (uid !== tradeData.playerA && uid !== tradeData.playerB) {
        throw new functions.https.HttpsError("permission-denied", "You are not a participant in this trade.");
      }

      // Precondition check: ensure both players have accepted
      if (!tradeData.acceptedA || !tradeData.acceptedB) {
        throw new functions.https.HttpsError("failed-precondition", "Both players must accept the trade before finalizing.");
      }

      const campaignId = tradeData.campaignId;
      const playerAId = tradeData.playerA;
      const playerBId = tradeData.playerB;
      const offerA = tradeData.offerA || [];
      const offerB = tradeData.offerB || [];

      const inventoryRefA = db.collection("campaigns").doc(campaignId).collection("inventories").doc(playerAId);
      const inventoryRefB = db.collection("campaigns").doc(campaignId).collection("inventories").doc(playerBId);

      const [inventoryDocA, inventoryDocB] = await Promise.all([
        transaction.get(inventoryRefA),
        transaction.get(inventoryRefB),
      ]);

      if (!inventoryDocA.exists || !inventoryDocB.exists) {
        throw new functions.https.HttpsError("not-found", "One or both player inventories could not be found.");
      }

      const inventoryDataA = inventoryDocA.data();
      const inventoryDataB = inventoryDocB.data();

      // --- This is the core logic fix ---

      // 1. Remove offered items from Player A's inventory
      const offerA_Ids = new Set(offerA.map((item) => item.id));
      const finalGridA = (inventoryDataA.gridItems || []).filter((item) => !offerA_Ids.has(item.id));
      let finalTrayA = (inventoryDataA.trayItems || []).filter((item) => !offerA_Ids.has(item.id));

      // 2. Remove offered items from Player B's inventory
      const offerB_Ids = new Set(offerB.map((item) => item.id));
      const finalGridB = (inventoryDataB.gridItems || []).filter((item) => !offerB_Ids.has(item.id));
      let finalTrayB = (inventoryDataB.trayItems || []).filter((item) => !offerB_Ids.has(item.id));

      // 3. Add received items to the tray for both players
      offerB.forEach((item) => finalTrayA.push(item));
      offerA.forEach((item) => finalTrayB.push(item));

      // 4. Perform all updates in the transaction
      transaction.update(inventoryRefA, { gridItems: finalGridA, trayItems: finalTrayA });
      transaction.update(inventoryRefB, { gridItems: finalGridB, trayItems: finalTrayB });
      transaction.delete(tradeDocRef);
    });

    return { success: true, message: "Trade completed successfully!" };
  } catch (error) {
    console.error("Error finalizing trade:", error);
    // Throw an HttpsError which the client can catch
    throw new functions.https.HttpsError("internal", "An unexpected error occurred while finalizing the trade.", error);
  }
});

exports.cancelTrade = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send({ error: 'Method Not Allowed' });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      console.error('No Firebase ID token was passed.');
      return res.status(401).send({ error: { message: 'Unauthorized' } });
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

      const batch = db.batch();
      const inventoryRefA = db.collection("campaigns").doc(tradeData.campaignId).collection("inventories").doc(tradeData.playerA);
      const inventoryRefB = db.collection("campaigns").doc(tradeData.campaignId).collection("inventories").doc(tradeData.playerB);
      
      if (tradeData.offerA && tradeData.offerA.length > 0) {
        batch.update(inventoryRefA, { trayItems: admin.firestore.FieldValue.arrayUnion(...tradeData.offerA) });
      }
      if (tradeData.offerB && tradeData.offerB.length > 0) {
        batch.update(inventoryRefB, { trayItems: admin.firestore.FieldValue.arrayUnion(...tradeData.offerB) });
      }

      batch.delete(tradeDocRef);
      await batch.commit();

      return res.status(200).send({ data: { message: "Trade cancelled and items returned." } });
    } catch (error) {
      console.error("Error cancelling trade:", error);
      return res.status(500).send({ error: { message: "An internal error occurred." } });
    }
  });
});