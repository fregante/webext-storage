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
	readonly key: string;

	get #storage(): chrome.storage.StorageArea {
		assertChromeStorageAvailable();
		return chrome.storage[this.area];
	}

	constructor(
		key: string,
		{
			area = 'local',
			defaultValue,
		}: StorageItemOptions<Exclude<Return, undefined>> = {},
	) {
		this.key = key;
		this.area = area;
		this.defaultValue = defaultValue;
	}

	get = async (): Promise<Return> => {
		const result = await this.#storage.get(this.key);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		if (result[this.key] === undefined) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Assumes the user never uses the Storage API directly
			return this.defaultValue as Return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-type-assertion -- Assumes the user never uses the Storage API directly
		return result[this.key] as Return;
	};

	set = async (value: Exclude<Return, undefined>): Promise<void> => {
		// eslint-disable-next-line unicorn/prefer-ternary -- ur rong
		if (value === undefined) {
			await this.#storage.remove(this.key);
		} else {
			await this.#storage.set({[this.key]: value});
		}
	};

	has = async (): Promise<boolean> => {
		const result = await this.#storage.get(this.key);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		return result[this.key] !== undefined;
	};

	remove = async (): Promise<void> => {
		await this.#storage.remove(this.key);
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
			if (area === this.area && changedItem) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-type-assertion -- Assumes the user never uses the Storage API directly
				callback(changedItem.newValue as Exclude<Return, undefined>);
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
