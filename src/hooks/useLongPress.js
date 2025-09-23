import { useRef, useCallback } from 'react';

/**
 * A custom React hook to handle long press events on touch devices
 * and right-click events on desktop.
 * @param {function} callback - The function to call when the event is detected.
 * @param {number} [duration=500] - The duration for touch long press.
 * @returns {object} Event handlers to spread onto the target component.
 */
export function useLongPress(callback, duration = 500) {
    const timerRef = useRef(null);
    const startPosRef = useRef(null);
    const lastTap = useRef(null); // Ref to track the timestamp of the last tap for double-tap detection.

    const start = useCallback((event) => {
        // If it's a right-click, call the callback immediately.
        if (event.type === 'contextmenu') {
            event.preventDefault();
            callback(event);
            return;
        }

        // --- Double Tap Logic for Touch Devices ---
        const now = Date.now();
        const doubleTapDelay = 300; // milliseconds

        if (lastTap.current && (now - lastTap.current) < doubleTapDelay) {
            // This is a double tap.
            lastTap.current = null; // Reset tap tracking.
            if (timerRef.current) { // Cancel any pending long press from the first tap.
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            event.preventDefault(); // Prevent default double-tap behavior (like zoom).
            callback(event);
            return; // Stop further execution.
        }
        lastTap.current = now;

        // For touch events, record the starting position.
        if (event.touches && event.touches.length > 0) {
            startPosRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }

        // For touch events, we want to allow dnd-kit to handle drag start.
        // We don't call `event.preventDefault()` here, as it can prevent
        // dnd-kit's sensors from working correctly. The `touch-none` CSS
        // class on the draggable item should be used to prevent scrolling.

        // For touch events, continue using the timer for long press detection.
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            lastTap.current = null; // A long press is not part of a double tap.
            callback(event);
        }, duration);
    }, [callback, duration]);

    const cancel = useCallback((event) => {
        // For touchmove, check if movement exceeds a tolerance.
        if (event.type === 'touchmove' && startPosRef.current && event.touches && event.touches.length > 0) {
            const moveX = event.touches[0].clientX;
            const moveY = event.touches[0].clientY;
            const startX = startPosRef.current.x;
            const startY = startPosRef.current.y;
            
            // A small tolerance to allow for minor finger jitter.
            // This should be similar to dnd-kit's activation distance.
            const tolerance = 8; 
            const distance = Math.sqrt(Math.pow(moveX - startX, 2) + Math.pow(moveY - startY, 2));

            if (distance < tolerance) {
                // If movement is within tolerance, don't clear the timer.
                // Let the long press continue.
                return;
            }
            // If movement is > tolerance, it's a drag. Reset double-tap tracking.
            lastTap.current = null;
        }

        // If movement is > tolerance, or if it's onTouchEnd, clear the timer.
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        startPosRef.current = null;
    }, []);

    return {
        onTouchStart: start,
        onTouchEnd: cancel,
        onTouchMove: cancel,
        onContextMenu: start, // Right-click still triggers the 'start' function
    };
}