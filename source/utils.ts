export function assertChromeStorageAvailable(): void {
	if (!globalThis.chrome?.storage) {
		throw new TypeError('`chrome.storage` is not available. Make sure you\'re running in a browser extension context.');
	}
}
