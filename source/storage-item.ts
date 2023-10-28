import chromeP from 'webext-polyfill-kinda';

export type StorageItemOptions = {
	area?: chrome.storage.AreaName;
};

export class StorageItem<T> {
	readonly area: chrome.storage.AreaName;
	constructor(readonly key: string, {area = 'local'}: StorageItemOptions = {}) {
		this.area = area;
	}

	async get(): Promise<T | undefined> {
		const result = await chromeP.storage[this.area].get(this.key);
		if (!Object.hasOwn(result, this.key)) {
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Assumes the user never uses the Storage API directly
		return result[this.key];
	}

	async set(value: T): Promise<void> {
		await chromeP.storage[this.area].set({[this.key]: value});
	}

	onChange(callback: (value: T) => void, signal?: AbortSignal): void {
		const changeHandler = (changes: Record<string, chrome.storage.StorageChange>, area: chrome.storage.AreaName) => {
			console.log('changeHandler', changes, area);

			const changedItem = changes[this.key];
			if (area === this.area && changedItem) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Assumes the user never uses the Storage API directly
				callback(changedItem.newValue);
			}
		};

		chrome.storage.onChanged.addListener(changeHandler);
		signal?.addEventListener('abort', () => {
			chrome.storage.onChanged.removeListener(changeHandler);
		}, {once: true});
	}
}
