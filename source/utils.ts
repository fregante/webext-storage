export function assertChromeStorageAvailable(): void {
	if (!globalThis.chrome?.storage) {
		throw new TypeError('`chrome.storage` is not available. Make sure you\'re running in a browser extension context.');
	}
}

// Workaround for https://github.com/w3c/webextensions/issues/511
// Firefox fires onChanged even when set() is called with the same value
export function hasStorageValueChanged(change: chrome.storage.StorageChange): boolean {
	if (!globalThis.navigator?.userAgent.includes('Firefox')) {
		return true;
	}

	if (!('oldValue' in change)) {
		return false;
	}

	return JSON.stringify(change.newValue) !== JSON.stringify(change.oldValue);
}
