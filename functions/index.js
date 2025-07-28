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
  // 1. Authentication is now handled automatically.
  // If the user isn't logged in, the function will exit here.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  const { tradeId } = data;
  if (!tradeId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'tradeId'.",
    );
  }

  const uid = context.auth.uid;
  const tradeDocRef = db.collection("trades").doc(tradeId);

  try {
    // 2. A transaction ensures all database changes succeed or fail together.
    await db.runTransaction(async (transaction) => {
      const tradeDoc = await transaction.get(tradeDocRef);
      if (!tradeDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Trade does not exist.");
      }
      const tradeData = tradeDoc.data();

      // 3. Security checks to ensure the caller is authorized.
      if (uid !== tradeData.playerA && uid !== tradeData.playerB) {
        throw new functions.https.HttpsError("permission-denied", "You are not a participant in this trade.");
      }
      if (!tradeData.acceptedA || !tradeData.acceptedB) {
        throw new functions.https.HttpsError("failed-precondition", "Both players must accept the trade.");
      }

      // 4. Correctly removing items from both inventories and adding the new ones.
      const campaignId = tradeData.campaignId;
      const inventoryRefA = db.collection("campaigns").doc(campaignId).collection("inventories").doc(tradeData.playerA);
      const inventoryRefB = db.collection("campaigns").doc(campaignId).collection("inventories").doc(tradeData.playerB);
      
      const [invDocA, invDocB] = await transaction.getAll(inventoryRefA, inventoryRefB);

      if (!invDocA.exists || !invDocB.exists) {
        throw new functions.https.HttpsError("not-found", "Could not find player inventories.");
      }

      const invDataA = invDocA.data();
      const offerA_Ids = new Set((tradeData.offerA || []).map(i => i.id));
      const finalGridA = (invDataA.gridItems || []).filter(item => !offerA_Ids.has(item.id));
      const finalTrayA = (invDataA.trayItems || []).filter(item => !offerA_Ids.has(item.id));
      (tradeData.offerB || []).forEach(item => finalTrayA.push(item));
      transaction.update(inventoryRefA, { gridItems: finalGridA, trayItems: finalTrayA });

      const invDataB = invDocB.data();
      const offerB_Ids = new Set((tradeData.offerB || []).map(i => i.id));
      const finalGridB = (invDataB.gridItems || []).filter(item => !offerB_Ids.has(item.id));
      const finalTrayB = (invDataB.trayItems || []).filter(item => !offerB_Ids.has(item.id));
      (tradeData.offerA || []).forEach(item => finalTrayB.push(item));
      transaction.update(inventoryRefB, { gridItems: finalGridB, trayItems: finalTrayB });
      
      // 5. Deleting the trade document after completion.
      transaction.delete(tradeDocRef);
    });

    return { success: true, message: "Trade completed successfully!" };
  } catch (error) {
    console.error("Error finalizing trade:", error);
    throw new functions.https.HttpsError("internal", error.message, error);
  }
});


exports.cancelTrade = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to cancel a trade.");
    }

    const { tradeId } = data;
    if (!tradeId) {
        throw new functions.https.HttpsError("invalid-argument", "tradeId is required.");
    }

    const uid = context.auth.uid;
    const tradeDocRef = db.collection("trades").doc(tradeId);

    try {
        const tradeDoc = await tradeDocRef.get();
        if (!tradeDoc.exists) {
            return { message: "Trade already resolved." };
        }
        const tradeData = tradeDoc.data();

        if (uid !== tradeData.playerA && uid !== tradeData.playerB) {
            throw new functions.https.HttpsError("permission-denied", "You are not a participant in this trade.");
        }
        
        // Items are not returned on cancel, just delete the trade
        await tradeDocRef.delete();

        return { message: "Trade cancelled." };
    } catch (error) {
        console.error("Error cancelling trade:", error);
        throw new functions.https.HttpsError("internal", error.message, error);
    }
});