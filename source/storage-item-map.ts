import chromeP from 'webext-polyfill-kinda';

export type StorageItemMapOptions<T> = {
	area?: chrome.storage.AreaName;
	defaultValue?: T;
};

export class StorageItemMap<
	/** Only specify this if you don't have a default value */
	Base,

	/** The return type will be undefined unless you provide a default value */
	Return = Base | undefined,
> {
	readonly prefix: `${string}:::`;
	readonly areaName: chrome.storage.AreaName;
	readonly defaultValue?: Return;

	constructor(
		key: string,
		{
			area = 'local',
			defaultValue,
		}: StorageItemMapOptions<Exclude<Return, undefined>> = {},
	) {
		this.prefix = `${key}:::`;
		this.areaName = area;
		this.defaultValue = defaultValue;
	}

	async has(secondaryKey: string): Promise<boolean> {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		const result = await chromeP.storage[this.areaName].get(rawStorageKey);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		return result[rawStorageKey] !== undefined;
	}

	async get(secondaryKey: string): Promise<Return> {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		const result = await chromeP.storage[this.areaName].get(rawStorageKey);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		if (result[rawStorageKey] === undefined) {
			return this.defaultValue as Return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Assumes the user never uses the Storage API directly for this key
		return result[rawStorageKey];
	}

	// Support both StorageItemMap(key, value) and StorageItem(value) signatures
	async set(secondaryKeyOrValue: string | Exclude<Return, undefined>, value?: Exclude<Return, undefined>): Promise<void> {
		let secondaryKey: string;
		let actualValue: Exclude<Return, undefined> | undefined;

		// Check if being called as StorageItem.set(value) or StorageItemMap.set(key, value?)
		// StorageItem always passes empty prefix to constructor, so prefix === ':::'
		const isStorageItem = this.prefix === ':::' && arguments.length === 1;

		if (isStorageItem) {
			// Single argument from StorageItem: treated as value
			secondaryKey = '';
			actualValue = secondaryKeyOrValue as Exclude<Return, undefined>;
		} else {
			// StorageItemMap: first arg is key, second is optional value
			secondaryKey = secondaryKeyOrValue as string;
			actualValue = value;
		}

		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		// eslint-disable-next-line unicorn/prefer-ternary -- ur rong
		if (actualValue === undefined) {
			await chromeP.storage[this.areaName].remove(rawStorageKey);
		} else {
			await chromeP.storage[this.areaName].set({[rawStorageKey]: actualValue});
		}
	}

	async remove(secondaryKey: string): Promise<void> {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		await chromeP.storage[this.areaName].remove(rawStorageKey);
	}

	/** @deprecated Only here to match the Map API; use `remove` instead */
	async delete(secondaryKey: string): Promise<void> {
		return this.remove(secondaryKey);
	}

	onChanged(
		callback: ((key: string, value: Exclude<Return, undefined>) => void) | ((value: Exclude<Return, undefined>) => void),
		signal?: AbortSignal,
	): void {
		const changeHandler = (
			changes: Record<string, chrome.storage.StorageChange>,
			area: chrome.storage.AreaName,
		) => {
			if (area !== this.areaName) {
				return;
			}

			for (const rawKey of Object.keys(changes)) {
				const secondaryKey = this.getSecondaryStorageKey(rawKey);
				if (secondaryKey !== false) {
					// Check if callback expects one or two parameters
					if (callback.length === 1) {
						// StorageItem signature: callback(value)
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Assumes the user never uses the Storage API directly
						(callback as (value: Exclude<Return, undefined>) => void)(changes[rawKey]!.newValue);
					} else {
						// StorageItemMap signature: callback(key, value)
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Assumes the user never uses the Storage API directly
						(callback as (key: string, value: Exclude<Return, undefined>) => void)(secondaryKey, changes[rawKey]!.newValue);
					}
				}
			}
		};

		chrome.storage.onChanged.addListener(changeHandler);
		signal?.addEventListener('abort', () => {
			chrome.storage.onChanged.removeListener(changeHandler);
		}, {
			once: true,
		});
	}

	protected getRawStorageKey(secondaryKey: string): string {
		return this.prefix + secondaryKey;
	}

	protected getSecondaryStorageKey(rawKey: string): string | false {
		return rawKey.startsWith(this.prefix) && rawKey.slice(this.prefix.length);
	}
}
