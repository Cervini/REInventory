import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function useDmStatus(dmId) {
    const [isDmOnline, setIsDmOnline] = useState(false);

    useEffect(() => {
        if (!dmId) {
            setIsDmOnline(false);
            return;
        }

        const statusDocRef = doc(db, 'status', dmId);
        const unsubscribe = onSnapshot(statusDocRef, (docSnap) => {
            if (!docSnap.exists()) {
                setIsDmOnline(false);
                return;
            }

            const status = docSnap.data();
            // A user is "online" if their status document has a `lastSeen` timestamp
            // from the last 2 minutes. This is our new, wider, and more robust definition.
            const twoMinutesInMillis = 2 * 60 * 1000;
            const lastSeenTime = status.lastSeen?.toDate();

            if (lastSeenTime && (new Date() - lastSeenTime < twoMinutesInMillis)) {
                setIsDmOnline(true);
            } else {
                setIsDmOnline(false);
            }
        });

        return () => unsubscribe();
    }, [dmId]);

    return isDmOnline;
}