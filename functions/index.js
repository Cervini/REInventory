// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to delete your account.",
    );
  }

  const uid = context.auth.uid;

  try {
    await admin.auth().deleteUser(uid);
    console.log(`Successfully deleted auth user: ${uid}`);

    const batch = db.batch();

    const userDocRef = db.collection("users").doc(uid);
    batch.delete(userDocRef);

    // This query is now on multiple lines to satisfy the linter
    const campaignsQuery = await db.collection("campaigns")
        .where("players", "array-contains", uid)
        .get();

    campaignsQuery.forEach((campaignDoc) => {
      const inventoryDocRef = campaignDoc.ref.collection("inventories").doc(uid);
      batch.delete(inventoryDocRef);

      batch.update(campaignDoc.ref, {
        players: admin.firestore.FieldValue.arrayRemove(uid),
      });
    });

    await batch.commit();

    console.log(`Successfully deleted all Firestore data for user: ${uid}`);
    return { success: true, message: "Account deleted successfully." };
  } catch (error) {
    console.error(`Error deleting user ${uid}:`, error);
    throw new functions.https.HttpsError(
        "internal",
        "An error occurred while deleting the account.",
    );
  }
});