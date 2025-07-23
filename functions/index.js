// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  // NEW: Log the entire authentication context from the request
  console.log("Function triggered. Auth context:", context.auth);

  if (!context.auth) {
    // This is the line that is causing your error
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

exports.helloWorld = functions.https.onCall((data, context) => {
  console.log("Hello world function was called!");
  return { message: "Hello from the backend!" };
});