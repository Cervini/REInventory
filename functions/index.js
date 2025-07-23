// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  // We will now get the token from the 'data' object passed from the client
  const idToken = data.token;

  if (!idToken) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication token was not provided.",
    );
  }

  try {
    // Manually verify the token using the Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // --- The rest of the deletion logic is exactly the same ---
    await admin.auth().deleteUser(uid);
    console.log(`Successfully deleted auth user: ${uid}`);

    const batch = db.batch();
    const userDocRef = db.collection("users").doc(uid);
    batch.delete(userDocRef);

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
    console.error(`Error deleting user:`, error);
    // If the token was invalid, this will throw an auth error
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