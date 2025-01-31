# StorageItemMap

Like an async `Map`, it stores multiple related values that have the same type.

```ts
import {StorageItemMap} from "webext-storage";

const names = new StorageItemMap<string>('names')
// Or
const names = new StorageItemMap('names', {defaultValue: '##unknown'})

await names.set('theslayer83', 'Mark Zuckerberg');
// Promise<void>

await names.get('theslayer83');
// Promise<string>

await names.remove('theslayer83');
// Promise<void>

await names.set({name: 'Ugo'});
// TypeScript Error: Argument of type '{ name: string; }' is not assignable to parameter of type 'string'.

names.onChanged(username, newName => {
	console.log('The user', username, 'set their new name to', newName);
});
```
## [StorageItem ↗️](./storage-item.md)

## [Main page ⏎](../readme.md)
