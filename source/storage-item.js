import { assertChromeStorageAvailable } from './utils.js';
export class StorageItem {
    key;
    area;
    defaultValue;
    /** @deprecated Use `onChanged` instead */
    onChange = this.onChanged;
    get #storage() {
        assertChromeStorageAvailable();
        return chrome.storage[this.area];
    }
    constructor(key, { area = 'local', defaultValue, } = {}) {
        this.key = key;
        this.area = area;
        this.defaultValue = defaultValue;
    }
    get = async () => {
        const result = await this.#storage.get(this.key);
        // Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
        if (result[this.key] === undefined) {
            return this.defaultValue;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Assumes the user never uses the Storage API directly
        return result[this.key];
    };
    set = async (value) => {
        // eslint-disable-next-line unicorn/prefer-ternary -- ur rong
        if (value === undefined) {
            await this.#storage.remove(this.key);
        }
        else {
            await this.#storage.set({ [this.key]: value });
        }
    };
    has = async () => {
        const result = await this.#storage.get(this.key);
        // Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
        return result[this.key] !== undefined;
    };
    remove = async () => {
        await this.#storage.remove(this.key);
    };
    onChanged(callback, signal) {
        assertChromeStorageAvailable();
        const changeHandler = (changes, area) => {
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
