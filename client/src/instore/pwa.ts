// Register SW with /instore-next scope and manage A2HS prompt

const ENABLE_PWA = import.meta.env.VITE_POS_PWA_ENABLED === 'true' && location.hostname !== 'localhost';

if ('serviceWorker' in navigator && ENABLE_PWA) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/instore-next/sw.js', { scope: '/instore-next/' })
      .catch(err => console.warn('[POS PWA] SW register failed', err));
  });
}

let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e: any) => {
  e.preventDefault();
  deferredPrompt = e;
  (window as any).__showInstallButton?.();
});

export async function triggerInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[POS PWA] Install choice:', outcome);
    deferredPrompt = null;
  }
}

export async function getStorageEstimate() {
  if ((navigator as any).storage?.estimate) {
    return await (navigator as any).storage.estimate();
  }
  return null;
}