import React from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// Import the new hook
import { useDmStatus } from '../hooks/useDmStatus';

export default function StartTrade({ onClose, campaign, user, playerProfiles }) {
  // Use the hook to get the DM's real-time online status
  const isDmOnline = useDmStatus(campaign?.dmId);
  const otherPlayers = campaign.players.filter(pId => pId !== user.uid);

  const handleInitiateTrade = async (targetPlayerId) => {
    // THIS IS THE FIX: Check if the target is the DM and if they are offline.
    const isTargetDM = targetPlayerId === campaign.dmId;
    if (isTargetDM && !isDmOnline) {
        toast.error("The DM is currently offline and cannot trade.");
        return;
    }

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
      
      const targetName = playerProfiles[targetPlayerId]?.characterName || playerProfiles[targetPlayerId]?.displayName || targetPlayerId;
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
            {otherPlayers.map(pId => {
              const isTargetDM = pId === campaign.dmId;
              const targetIsOffline = isTargetDM && !isDmOnline;
              return (
                <li key={pId}>
                  <button
                    onClick={() => handleInitiateTrade(pId)}
                    // Disable the button if the target is the DM and they are offline
                    disabled={targetIsOffline}
                    className="w-full text-left p-3 bg-background hover:bg-surface/80 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center"
                  >
                    <span>{playerProfiles[pId]?.characterName || playerProfiles[pId]?.displayName || pId}</span>
                    {/* Show an "Offline" badge */}
                    {targetIsOffline && <span className="text-xs font-bold text-destructive">Offline</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-text-muted">There are no other players in this campaign to trade with.</p>
        )}
      </div>
    </div>
  );
}