/// <reference types="vite/client" />

// Microsoft Clarity global type declaration
declare global {
  interface Window {
    clarity?: (method: string, ...args: string[]) => void;
  }
}

export {};
