import React from 'react';

export default function PrivacyPolicy({ onClose }) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-lg border border-accent/20 text-text-muted">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-background transition-colors duration-200" aria-label="Back to main page">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-base" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-3xl font-fantasy text-accent">Privacy Policy</h1>
        <div className="w-10"></div> 
      </div>
      <p className="text-sm mb-4">Last updated: August 16, 2025</p>

      <div className="space-y-4 text-text-base/90 text-sm">
        <p>This Privacy Policy explains how REInventory ("we," "us," and "our") collects, uses, and discloses your information when you use our application.</p>
        
        <h2 className="text-xl font-fantasy text-accent pt-2">1. Information We Collect</h2>
        <p>To provide our service, we collect and store the following information:</p>
        <ul className="list-disc list-inside pl-4 space-y-1">
          <li><strong>Account Information:</strong> When you sign up, we store your email address and associate it with a unique User ID provided by Firebase Authentication.</li>
          <li><strong>Profile Data:</strong> We store your chosen display name and application preferences, such as your inventory grid size.</li>
          <li><strong>User-Generated Content:</strong> We store all data you create within the application. This includes, but is not limited to, campaigns you create or join, characters you create, all inventory items, containers, and their properties, and your custom item compendium.</li>
           <li><strong>Interaction Data:</strong> We temporarily store data related to in-game actions, such as active trade offers between you and other players.</li>
        </ul>

        <h2 className="text-xl font-fantasy text-accent pt-2">2. How We Use Your Information</h2>
        <p>Your information is used exclusively to provide the core functionality of the application. We do not use your data for advertising, marketing, analytics, or profiling.</p>
        <ul className="list-disc list-inside pl-4 space-y-1">
          <li>Authenticating your account and maintaining your session.</li>
          <li>Saving, retrieving, and displaying your inventory data in real-time.</li>
          <li>Allowing you to collaborate with other users in shared campaigns.</li>
          <li>Facilitating in-game features like trading items.</li>
        </ul>

        <h2 className="text-xl font-fantasy text-accent pt-2">3. Data Storage and Security</h2>
        <p>All your data is stored on Google's Firebase platform (Firestore and Realtime Database). We rely on Google's industry-standard security measures to protect your information from unauthorized access.</p>

        <h2 className="text-xl font-fantasy text-accent pt-2">4. Your Rights and Data Control</h2>
        <p>You have full control over your data. At any time, you can:</p>
        <ul className="list-disc list-inside pl-4 space-y-1">
            <li>Access and update your profile information via the "Profile Settings" menu.</li>
            <li>Modify and delete any campaign, character, or item data you have created.</li>
            <li>Permanently leave a campaign, which will delete your inventory for that campaign.</li>
            <li>Permanently delete your entire account and all associated data using the "Delete My Account" feature in your profile settings. This action is irreversible.</li>
        </ul>

        <h2 className="text-xl font-fantasy text-accent pt-2">5. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at simonecervini99+reinventory@gmail.com.</p>
      </div>
    </div>
  );
}