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

		// Bind methods to maintain context
		this.get = this.get.bind(this);
		this.set = this.set.bind(this);
		this.has = this.has.bind(this);
		this.remove = this.remove.bind(this);
		this.delete = this.delete.bind(this);
		this.onChanged = this.onChanged.bind(this);
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

	async set(secondaryKey: string, value: Exclude<Return, undefined>): Promise<void> {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		// eslint-disable-next-line unicorn/prefer-ternary -- ur rong
		if (value === undefined) {
			await chromeP.storage[this.areaName].remove(rawStorageKey);
		} else {
			await chromeP.storage[this.areaName].set({[rawStorageKey]: value});
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
		callback: (key: string, value: Exclude<Return, undefined>) => void,
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
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Assumes the user never uses the Storage API directly
					callback(secondaryKey, changes[rawKey]!.newValue);
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
