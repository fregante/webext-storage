import {assertChromeStorageAvailable} from './utils.js';

export type StorageItemOptions<T> = {
	area?: chrome.storage.AreaName;
	defaultValue?: T;
};

export class StorageItem<
	/** Only specify this if you don't have a default value */
	Base,

	/** The return type will be undefined unless you provide a default value */
	Return = Base | undefined,
> {
	readonly area: chrome.storage.AreaName;
	readonly defaultValue?: Return;

	/** @deprecated Use `onChanged` instead */
	onChange = this.onChanged;

	constructor(
		readonly key: string,
		{
			area = 'local',
			defaultValue,
		}: StorageItemOptions<Exclude<Return, undefined>> = {},
	) {
		this.area = area;
		this.defaultValue = defaultValue;
	}

	get = async (): Promise<Return> => {
		assertChromeStorageAvailable();
		const result = await chrome.storage[this.area].get(this.key);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		if (result[this.key] === undefined) {
			return this.defaultValue as Return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Assumes the user never uses the Storage API directly
		return result[this.key];
	};

	set = async (value: Exclude<Return, undefined>): Promise<void> => {
		assertChromeStorageAvailable();
		// eslint-disable-next-line unicorn/prefer-ternary -- ur rong
		if (value === undefined) {
			await chrome.storage[this.area].remove(this.key);
		} else {
			await chrome.storage[this.area].set({[this.key]: value});
		}
	};

	has = async (): Promise<boolean> => {
		assertChromeStorageAvailable();
		const result = await chrome.storage[this.area].get(this.key);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		return result[this.key] !== undefined;
	};

	remove = async (): Promise<void> => {
		assertChromeStorageAvailable();
		await chrome.storage[this.area].remove(this.key);
	};

	onChanged(
		callback: (value: Exclude<Return, undefined>) => void,
		signal?: AbortSignal,
	): void {
		assertChromeStorageAvailable();
		const changeHandler = (
			changes: Record<string, chrome.storage.StorageChange>,
			area: chrome.storage.AreaName,
		) => {
			const changedItem = changes[this.key];
			if (
				area === this.area
				&& changedItem
				// Workaround for https://github.com/w3c/webextensions/issues/511
				&& JSON.stringify(changedItem.newValue) !== JSON.stringify(changedItem.oldValue)
			) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Assumes the user never uses the Storage API directly
				callback(changedItem.newValue);
			}
		};

		chrome.storage.onChanged.addListener(changeHandler);
		signal?.addEventListener('abort', () => {
			chrome.storage.onChanged.removeListener(changeHandler);
		}, {
			once: true,
		});
	}
}
