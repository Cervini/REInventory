import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { usePlayerProfiles } from '../hooks/usePlayerProfiles';

export default function TradeNotifications({ campaignId }) {
    const { playerProfiles } = usePlayerProfiles(campaignId);

    useEffect(() => {
        if (!auth.currentUser || !campaignId) return;

        const tradesRef = collection(db, 'trades');
        const q = query(
            tradesRef, 
            where('campaignId', '==', campaignId), 
            where('players', 'array-contains', auth.currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const trade = { id: change.doc.id, ...change.doc.data() };
                     if (trade.status === 'pending' && trade.playerB === auth.currentUser.uid) {
                        const requesterName = playerProfiles[trade.playerA]?.displayName || 'A player';

                        toast((t) => (
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-center">
                                    <strong>{requesterName}</strong> wants to trade with you.
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleDecline(t.id, trade.id)}
                                        className="bg-destructive hover:bg-destructive/80 text-text-base font-bold py-1 px-3 rounded text-sm"
                                    >
                                        Decline
                                    </button>
                                    <button 
                                        onClick={() => handleAccept(t.id, trade.id)}
                                        className="bg-primary hover:bg-accent hover:text-background text-text-base font-bold py-1 px-3 rounded text-sm"
                                    >
                                        Accept
                                    </button>
                                </div>
                            </div>
                        ), {
                            duration: 5000,
                        });
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [campaignId, playerProfiles]);

    const handleAccept = async (toastId, tradeId) => {
        toast.dismiss(toastId);
        const tradeDocRef = doc(db, 'trades', tradeId);
        // THIS IS THE FIX: Set the status to 'active' to signal the trade can begin.
        await updateDoc(tradeDocRef, { status: 'active' });
        toast.success("Trade accepted! Opening trade window...");
    };

    const handleDecline = async (toastId, tradeId) => {
        toast.dismiss(toastId);
        const tradeDocRef = doc(db, 'trades', tradeId);
        await deleteDoc(tradeDocRef);
        toast.error("Trade declined.");
    };

    return null;
}