import React from 'react';

export default function PrivacyPolicy({ onClose }) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-lg border border-accent/20 text-text-muted">
      {/* The header div is now a flex container */}
      <div className="flex justify-between items-center mb-4">
        
        {/* The new back button */}
        <button onClick={onClose} className="p-2 rounded-full hover:bg-background transition-colors duration-200" aria-label="Back to main page">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-base" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <h1 className="text-3xl font-fantasy text-accent">Privacy Policy</h1>

        {/* This empty div helps keep the title centered */}
        <div className="w-10"></div> 
      </div>
      <p className="text-sm mb-4">Last updated: July 24, 2025</p>

      <div className="space-y-4 text-text-base/90 text-sm">
        <p>This Privacy Policy explains how REInventory ("we," "us," and "our") collects, uses, and discloses your information.</p>
        
        <h2 className="text-xl font-fantasy text-accent pt-2">1. Information We Collect</h2>
        <p>We collect the following information to provide and improve our service:</p>
        <ul className="list-disc list-inside pl-4">
          <li><strong>Account Information:</strong> When you sign up, we collect your email address and a password.</li>
          <li><strong>User-Generated Content:</strong> We store the display name you choose, your preferred grid size, and all the campaign and item data you create.</li>
        </ul>

        <h2 className="text-xl font-fantasy text-accent pt-2">2. How We Use Your Information</h2>
        <p>Your information is used solely to provide the core functionality of the application, such as:</p>
        <ul className="list-disc list-inside pl-4">
          <li>Authenticating your account and keeping you logged in.</li>
          <li>Saving and displaying your inventory data.</li>
          <li>Allowing you to customize your user experience.</li>
        </ul>
        <p>We do not use your information for advertising, marketing, or analytics.</p>

        <h2 className="text-xl font-fantasy text-accent pt-2">3. Data Storage and Security</h2>
        <p>All your data is stored securely on Google Firebase, an industry-standard, secure platform. We take reasonable measures to protect your information from unauthorized access.</p>

        <h2 className="text-xl font-fantasy text-accent pt-2">4. Your Rights (GDPR)</h2>
        <p>You have the right to control your data. In your "Profile Settings," you can:</p>
        <ul className="list-disc list-inside pl-4">
          <li>Access and update your display name and grid preferences.</li>
          <li>Permanently delete your account and all associated data, including campaigns and items, by using the "Delete My Account" feature.</li>
        </ul>

        <h2 className="text-xl font-fantasy text-accent pt-2">5. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at simonecervini99+reinventory@gmail.com .</p>
      </div>
    </div>
  );
}