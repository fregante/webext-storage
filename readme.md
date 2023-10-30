# webext-storage [![][badge-gzip]][link-bundlephobia]

[badge-gzip]: https://img.shields.io/bundlephobia/minzip/webext-storage.svg?label=gzipped
[link-bundlephobia]: https://bundlephobia.com/result?p=webext-storage

> A more usable typed storage API for Web Extensions

- Browsers: Chrome, Firefox, and Safari
- Manifest: v2 and v3
- Permissions: `storage` or `unlimitedStorage`
- Context: They can be called from any context

**Sponsored by [PixieBrix](https://www.pixiebrix.com)** :tada:

`chrome.storage.local.get()` is very inconvenient to use and it does not provide type safety. This module provides a better API:

```ts
// Before
const storage = await chrome.storage.local.get('user-options');
const value = storage['user-options']; // The type is `any`
await chrome.storage.local.set({['user-options']: {color: 'red'}}); // Not type-checked
chrome.storage.onChanged.addListener((storageArea, change) => {
	if (storageArea === 'local' && change['user-options']) { // Repetitive
		console.log('New options', change['user-options'].newValue)
	}
});

// After
const options = new StorageItem<Record<string, string>>('user-options');
const value = await options.get(); // The type is `Record<string, string> | undefined`
await options.set({color: 'red'}) // Type-checked
options.onChanged(newValue => {
	console.log('New options', newValue)
});
```

Why this is better:

- The storage item is defined in a single place, including its storageArea, its types and default value
- `get` only is only `.get()` instead of the awkward post-get object access that
- Every `get` and `set` operation is type-safe
- If you provide a `defaultValue`, the return type will not be ` | undefined`
- The `onChanged` example speaks for itself

## Install

```sh
npm install webext-storage
```

Or download the [standalone bundle](https://bundle.fregante.com/?pkg=webext-storage&name=StorageItem) to include in your `manifest.json`.

## Usage

```ts
import {StorageItem} from "webext-storage";

const username = new StorageItem<string>('username')
// Or
const username = new StorageItem('username', {defaultValue: 'admin'})

await username.set('Ugo');
// Promise<void>

await username.get();
// Promise<string>

await username.remove();
// Promise<void>

await username.set({name: 'Ugo'});
// TypeScript Error: Argument of type '{ name: string; }' is not assignable to parameter of type 'string'.

username.onChanged(newName => {
	console.log('The user’s new name is', newName);
});
```

## Related

- [webext-storage-cache](https://github.com/fregante/webext-storage-cache) - Cache values in your Web Extension and clear them on expiration.
- [webext-tools](https://github.com/fregante/webext-tools) - Utility functions for Web Extensions.
- [webext-content-scripts](https://github.com/fregante/webext-content-scripts) - Utility functions to inject content scripts in WebExtensions.
- [webext-base-css](https://github.com/fregante/webext-base-css) - Extremely minimal stylesheet/setup for Web Extensions’ options pages (also dark mode)
- [webext-options-sync](https://github.com/fregante/webext-options-sync) - Helps you manage and autosave your extension's options.
- [More…](https://github.com/fregante/webext-fun)

## License

MIT © [Federico Brigante](https://fregante.com)
