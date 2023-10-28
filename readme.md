# webext-storage [![][badge-gzip]][link-bundlephobia]

[badge-gzip]: https://img.shields.io/bundlephobia/minzip/webext-storage.svg?label=gzipped
[link-bundlephobia]: https://bundlephobia.com/result?p=webext-storage

> A more usable typed storage API for Web Extensions

- Browsers: Chrome, Firefox, and Safari
- Manifest: v2 and v3
- Permissions: `storage` or `unlimitedStorage`
- Context: They can be called from any context

**Sponsored by [PixieBrix](https://www.pixiebrix.com)** :tada:

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

username.onChange(newName => {
	console.log('The user’s new name is', newName);
});
```

## Related

- [webext-storage-cache](https://github.com/fregante/webext-storage-cache) - Detects where the current browser extension code is being run.
- [webext-tools](https://github.com/fregante/webext-tools) - Utility functions for Web Extensions.
- [webext-content-scripts](https://github.com/fregante/webext-content-scripts) - Utility functions to inject content scripts in WebExtensions.
- [webext-base-css](https://github.com/fregante/webext-base-css) - Extremely minimal stylesheet/setup for Web Extensions’ options pages (also dark mode)
- [webext-options-sync](https://github.com/fregante/webext-options-sync) - Helps you manage and autosave your extension's options.
- [More…](https://github.com/fregante/webext-fun)

## License

MIT © [Federico Brigante](https://fregante.com)
