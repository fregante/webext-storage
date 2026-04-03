/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-new -- Type tests only */
import { expectType, expectNotAssignable, expectAssignable } from 'tsd';
import { StorageItem } from './storage-item.js';
new StorageItem('key', { area: 'local' });
new StorageItem('key', { area: 'sync' });
// No type, no default, return `unknown`
const unknownItem = new StorageItem('key');
expectAssignable(unknownItem.get());
await unknownItem.set(1);
await unknownItem.set(null);
// Explicit type, no default, return `T | undefined`
const objectNoDefault = new StorageItem('key');
expectType(objectNoDefault.get());
expectType(objectNoDefault.set({ name: 'new name' }));
// NonNullable from default
const stringDefault = new StorageItem('key', { defaultValue: 'SMASHING' });
expectAssignable(stringDefault.get());
expectNotAssignable(stringDefault.get());
expectType(stringDefault.get());
expectType(stringDefault.set('some string'));
// NonNullable from default, includes broader type as generic
// The second type parameter must be re-specified because TypeScript stops inferring it
// https://github.com/microsoft/TypeScript/issues/26242
const broadGeneric = new StorageItem('key', { defaultValue: { a: 1 } });
expectAssignable(broadGeneric.get());
// Allows null as a value via default value
const storeNull = new StorageItem('key', { defaultValue: null });
await storeNull.set(null);
expectType(storeNull.get());
// Allows null as a value type parameters
const storeSomeNull = new StorageItem('key');
await storeSomeNull.set(1);
await storeSomeNull.set(null);
expectType(storeSomeNull.get());
// @ts-expect-error Type is string
await stringDefault.set(1);
// @ts-expect-error Type is string
await stringDefault.set(true);
// @ts-expect-error Type is string
await stringDefault.set([true, 'string']);
// @ts-expect-error Type is string
await stringDefault.set({ wow: [true, 'string'] });
// @ts-expect-error Type is string
await stringDefault.set(1, { days: 1 });
stringDefault.onChanged(value => {
    expectType(value);
});
objectNoDefault.onChanged(value => {
    expectType(value);
});
// @ts-expect-error Don't allow mismatched types
new StorageItem('key', { defaultValue: 'SMASHING' });
