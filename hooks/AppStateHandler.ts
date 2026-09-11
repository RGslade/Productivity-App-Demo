import { useEffect, useLayoutEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export type AppStateHandlerCallback = (state: AppStateStatus) => void;

interface AppStateListener {
  id: string;
  callback: AppStateHandlerCallback;
  states?: AppStateStatus[]; // If specified, only trigger on these states
}

class AppStateManager {
  private listeners: Map<string, AppStateListener> = new Map();
  private currentState: AppStateStatus = 'active';
  private subscription: any = null;

  constructor() {
    this.initializeAppState();
  }

  private initializeAppState() {
    // Get initial app state
    const currentAppState = AppState.currentState;
    this.currentState = currentAppState;

    // Set up listener for state changes
    this.subscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.currentState = nextAppState;

    // Notify all listeners
    this.listeners.forEach((listener) => {
      // If specific states are defined, only trigger if current state matches
      if (listener.states && !listener.states.includes(nextAppState)) {
        return;
      }
      listener.callback(nextAppState);
    });
  };

  /**
   * Register a listener for app state changes
   * @param id Unique identifier for this listener
   * @param callback Function to call when state changes
   * @param states Optional: only trigger on these specific states ['background', 'inactive', 'active']
   */
  addListener(
    id: string,
    callback: AppStateHandlerCallback,
    states?: AppStateStatus[]
  ) {
    this.listeners.set(id, { id, callback, states });
  }

  /**
   * Remove a listener by ID
   */
  removeListener(id: string) {
    this.listeners.delete(id);
  }

  /**
   * Get current app state
   */
  getState(): AppStateStatus {
    return this.currentState;
  }

  /**
   * Check if app is in background
   */
  isInBackground(): boolean {
    return this.currentState !== 'active';
  }

  /**
   * Check if app is active (in foreground)
   */
  isActive(): boolean {
    return this.currentState === 'active';
  }

  /**
   * Cleanup (typically called on app unmount)
   */
  cleanup() {
    if (this.subscription) {
      this.subscription.remove();
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const appStateManager = new AppStateManager();

/**
 * Hook to monitor app state changes
 * @param callback Function to call when app state changes
 * @param listenerId Unique ID for this listener
 * @param states Optional: only listen for specific states
 */
export const useAppState = (
  callback: AppStateHandlerCallback,
  listenerId: string = `listener-${Math.random()}`,
  states?: AppStateStatus[]
) => {
  const callbackRef = useRef(callback);
  const statesRef = useRef(states);
  const statesKey = states?.join('|') ?? '';

  useLayoutEffect(() => {
    callbackRef.current = callback;
    statesRef.current = states;
  }, [callback, states]);

  useEffect(() => {
    const stableCallback = (state: AppStateStatus) => callbackRef.current(state);
    appStateManager.addListener(listenerId, stableCallback, statesRef.current);

    return () => {
      appStateManager.removeListener(listenerId);
    };
  // The callback can change on normal renders; the listener itself should not.
  // The key still re-registers it when the requested state filter changes.
  }, [listenerId, statesKey]);
};
