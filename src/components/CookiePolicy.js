import React from 'react';

export default function CookiePolicy({ onClose }) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-lg border border-accent/20 text-text-muted">
       {/* The header div is now a flex container */}
      <div className="flex justify-between items-center mb-4">
        
        {/* ADD THIS BUTTON */}
        <button onClick={onClose} className="p-2 rounded-full hover:bg-background transition-colors duration-200" aria-label="Back to main page">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-base" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <h1 className="text-3xl font-fantasy text-accent">Cookie Policy</h1>

        {/* This empty div helps keep the title centered */}
        <div className="w-10"></div> 
      </div>
      <p className="text-sm mb-4">Last updated: July 19, 2025</p>

      <div className="space-y-4 text-text-base/90">
        <p>This Cookie Policy explains how REInventory ("we," "us," and "our") uses cookies and similar technologies to recognize you when you visit our website.</p>
        
        <h2 className="text-xl font-fantasy text-accent pt-2">What are cookies?</h2>
        <p>Cookies are small data files placed on your computer or mobile device when you visit a website. In our case, we use a similar browser technology called `indexedDB`, which functions in much the same way to store data locally on your device.</p>

        <h2 className="text-xl font-fantasy text-accent pt-2">Why do we use them?</h2>
        <p>We use this technology for one essential purpose:</p>
        <ul className="list-disc list-inside pl-4">
          <li><strong>Authentication:</strong> When you sign in to your REInventory account, we use `indexedDB` (via Google Firebase Authentication) to create a secure session and keep you logged in. This is strictly necessary for the application to function for registered users.</li>
        </ul>
        <p>We **do not** use any cookies for advertising, analytics, or tracking purposes.</p>

        <h2 className="text-xl font-fantasy text-accent pt-2">How can I control this?</h2>
        <p>You can control and/or delete data stored by websites in your browser's settings. If you clear your site data for this application, you will be logged out and will need to sign in again.</p>
      </div>

      <div className="text-center mt-8">
        <button onClick={onClose} className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-2 px-6 rounded transition-colors duration-200">
          Back
        </button>
      </div>
    </div>
  );
}