import { assertChromeStorageAvailable } from './utils.js';
export class StorageItemMap {
    prefix;
    areaName;
    defaultValue;
    get #storage() {
        assertChromeStorageAvailable();
        return chrome.storage[this.areaName];
    }
    constructor(key, { area = 'local', defaultValue, } = {}) {
        this.prefix = `${key}:::`;
        this.areaName = area;
        this.defaultValue = defaultValue;
    }
    has = async (secondaryKey) => {
        const rawStorageKey = this.getRawStorageKey(secondaryKey);
        const result = await this.#storage.get(rawStorageKey);
        // Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
        return result[rawStorageKey] !== undefined;
    };
    get = async (secondaryKey) => {
        const rawStorageKey = this.getRawStorageKey(secondaryKey);
        const result = await this.#storage.get(rawStorageKey);
        // Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
        if (result[rawStorageKey] === undefined) {
            return this.defaultValue;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Assumes the user never uses the Storage API directly for this key
        return result[rawStorageKey];
    };
    set = async (secondaryKey, value) => {
        const rawStorageKey = this.getRawStorageKey(secondaryKey);
        // eslint-disable-next-line unicorn/prefer-ternary -- ur rong
        if (value === undefined) {
            await this.#storage.remove(rawStorageKey);
        }
        else {
            await this.#storage.set({ [rawStorageKey]: value });
        }
    };
    remove = async (secondaryKey) => {
        const rawStorageKey = this.getRawStorageKey(secondaryKey);
        await this.#storage.remove(rawStorageKey);
    };
    /** @deprecated Only here to match the Map API; use `remove` instead */
    // eslint-disable-next-line @typescript-eslint/member-ordering -- invalid
    delete = this.remove;
    onChanged(callback, signal) {
        assertChromeStorageAvailable();
        const changeHandler = (changes, area) => {
            if (area !== this.areaName) {
                return;
            }
            for (const rawKey of Object.keys(changes)) {
                const secondaryKey = this.getSecondaryStorageKey(rawKey);
                if (secondaryKey) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Assumes the user never uses the Storage API directly
                    callback(secondaryKey, changes[rawKey].newValue);
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
    getRawStorageKey(secondaryKey) {
        return this.prefix + secondaryKey;
    }
    getSecondaryStorageKey(rawKey) {
        return rawKey.startsWith(this.prefix) && rawKey.slice(this.prefix.length);
    }
}
