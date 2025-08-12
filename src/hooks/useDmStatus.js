import { useState, useEffect } from 'react';
// THIS IS THE FIX: Import from the Realtime Database
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';

export function useDmStatus(dmId) {
    const [isDmOnline, setIsDmOnline] = useState(false);

    useEffect(() => {
        if (!dmId) {
            setIsDmOnline(false);
            return;
        }

        // A reference to the DM's status in the Realtime Database
        const statusRef = ref(rtdb, 'status/' + dmId);
        
        // onValue is the real-time listener for the Realtime Database
        const unsubscribe = onValue(statusRef, (snapshot) => {
            const status = snapshot.val();
            // The user is online if the status object exists and has isOnline set to true.
            setIsDmOnline(status?.isOnline === true);
        });

        return () => unsubscribe();
    }, [dmId]);

    return isDmOnline;
}