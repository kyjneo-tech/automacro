declare global {
  interface Window {
    ipc: {
      send: (channel: string, ...args: any[]) => void;
      on: (channel: string, func: (...args: any[]) => void) => () => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
