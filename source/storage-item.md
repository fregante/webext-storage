# StorageItem

It stores a single value in storage.

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

await names.has();
// Promise<false>

await username.set({name: 'Ugo'});
// TypeScript Error: Argument of type '{ name: string; }' is not assignable to parameter of type 'string'.

username.onChanged(newName => {
	console.log('The user’s new name is', newName);
});
```

## [StorageItemMap ↗️](./storage-item-map.md)

## [Main page ⏎](../readme.md)
