export function assertChromeStorageAvailable(): void {
	if (!globalThis.chrome?.storage) {
		throw new TypeError('`chrome.storage` is not available. Make sure you\'re running in a browser extension context.');
	}
}

// Workaround for https://github.com/w3c/webextensions/issues/511
// Firefox fires onChanged even when set() is called with the same value
export function hasStorageValueChanged(change: chrome.storage.StorageChange): boolean {
	// eslint-disable-next-line n/no-unsupported-features/node-builtins -- browser extension context, not Node.js
	return !(globalThis.navigator?.userAgent.includes('Firefox') ?? false) || JSON.stringify(change.newValue) !== JSON.stringify(change.oldValue);
}
