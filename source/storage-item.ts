import chromeP from 'webext-polyfill-kinda';

export type StorageItemOptions<T> = {
	area?: chrome.storage.AreaName;
	defaultValue?: T;
};

export class StorageItem<
	Base,
	InferredBase extends (Base | undefined) = Base | undefined,
	Return = InferredBase extends undefined ? Base | undefined : InferredBase,
> {
	readonly area: chrome.storage.AreaName;
	readonly defaultValue?: InferredBase;
	constructor(
		readonly key: string,
		{
			area = 'local',
			defaultValue,
		}: StorageItemOptions<NonNullable<InferredBase>> = {},
	) {
		this.area = area;
		this.defaultValue = defaultValue;
	}

	get = async (): Promise<Return> => {
		const result = await chromeP.storage[this.area].get(this.key);
		if (!Object.hasOwn(result, this.key)) {
			return this.defaultValue as Return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Assumes the user never uses the Storage API directly
		return result[this.key];
	};

	set = async (value: NonNullable<InferredBase>): Promise<void> => {
		await chromeP.storage[this.area].set({[this.key]: value});
	};

	remove = async (): Promise<void> => {
		await chromeP.storage[this.area].remove(this.key);
	};

	onChange(
		callback: (value: NonNullable<InferredBase>) => void,
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
