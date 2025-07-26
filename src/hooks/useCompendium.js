import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export function useCompendium() {
    const [globalItems, setGlobalItems] = useState([]);
    const [customItems, setCustomItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!currentUser) {
            setIsLoading(false);
            return;
        };

        const globalUnsubscribe = onSnapshot(collection(db, 'globalCompendium'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setGlobalItems(items);
        });

        const customUnsubscribe = onSnapshot(collection(db, 'compendiums', currentUser.uid, 'masterItems'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setCustomItems(items);
            setIsLoading(false);
        });

        return () => {
            globalUnsubscribe();
            customUnsubscribe();
        };
    }, [currentUser]);

    // Combine both lists, ensuring custom items appear first
    return { allItems: [...customItems, ...globalItems], isLoading };
}