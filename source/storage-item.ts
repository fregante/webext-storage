import chromeP from 'webext-polyfill-kinda';

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
		const result = await chromeP.storage[this.area].get(this.key);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		if (result[this.key] === undefined) {
			return this.defaultValue as Return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Assumes the user never uses the Storage API directly
		return result[this.key];
	};

	set = async (value: Exclude<Return, undefined>): Promise<void> => {
		// eslint-disable-next-line unicorn/prefer-ternary -- ur rong
		if (value === undefined) {
			await chromeP.storage[this.area].remove(this.key);
		} else {
			await chromeP.storage[this.area].set({[this.key]: value});
		}
	};

	has = async (): Promise<boolean> => {
		const result = await chromeP.storage[this.area].get(this.key);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		return result[this.key] !== undefined;
	};

	remove = async (): Promise<void> => {
		await chromeP.storage[this.area].remove(this.key);
	};

	onChanged(
		callback: (value: Exclude<Return, undefined>) => void,
		signal?: AbortSignal,
	): void {
		const changeHandler = (
			changes: Record<string, chrome.storage.StorageChange>,
			area: chrome.storage.AreaName,
		) => {
			const changedItem = changes[this.key];
			if (area === this.area && changedItem) {
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
