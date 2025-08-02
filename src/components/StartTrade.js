import React from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// **FIX**: The 'inventories' prop is no longer needed
export default function StartTrade({ onClose, campaign, user, playerProfiles }) {
  const otherPlayers = campaign.players.filter(pId => pId !== user.uid);

  const handleInitiateTrade = async (targetPlayerId) => {
    try {
      await addDoc(collection(db, 'trades'), {
        campaignId: campaign.id,
        players: [user.uid, targetPlayerId],
        playerA: user.uid,
        playerB: targetPlayerId,
        offerA: [],
        offerB: [],
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      // **FIX**: Use the characterName from the enhanced playerProfiles object
      const targetName = playerProfiles[targetPlayerId]?.characterName || playerProfiles[targetPlayerId]?.displayName;
      toast.success(`Trade request sent to ${targetName}.`);
      onClose();
    } catch (error) {
      toast.error("Failed to send trade request.");
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-b from-surface to-background border border-accent/20 p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-4 font-fantasy text-accent">Trade With...</h3>
        {otherPlayers.length > 0 ? (
          <ul className="space-y-2">
            {otherPlayers.map(pId => (
              <li key={pId}>
                <button
                  onClick={() => handleInitiateTrade(pId)}
                  className="w-full text-left p-3 bg-background hover:bg-surface/80 rounded-md transition-colors"
                >
                  {/* **FIX**: Display characterName from playerProfiles, with fallbacks */}
                  {playerProfiles[pId]?.characterName || playerProfiles[pId]?.displayName || pId}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted">There are no other players in this campaign to trade with.</p>
        )}
      </div>
    </div>
  );
}