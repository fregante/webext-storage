/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-new -- Type tests only */
import {expectType, expectNotAssignable, expectAssignable} from 'tsd';
import {StorageItem} from './storage-item.js';

type Primitive = boolean | number | string;
type Value = Primitive | Primitive[] | Record<string, any>;

new StorageItem('key', {area: 'local'});
new StorageItem('key', {area: 'sync'});

// No type, no default, return `unknown`
const unknownItem = new StorageItem('key');
expectAssignable<Promise<unknown>>(unknownItem.get());
await unknownItem.set(1);
await unknownItem.set(null);

// Explicit type, no default, return `T | undefined`
const objectNoDefault = new StorageItem<{name: string}>('key');
expectType<Promise<{name: string} | undefined>>(objectNoDefault.get());
expectType<Promise<void>>(objectNoDefault.set({name: 'new name'}));

// NonNullable from default
const stringDefault = new StorageItem('key', {defaultValue: 'SMASHING'});
expectAssignable<Promise<Value>>(stringDefault.get());
expectNotAssignable<Promise<number>>(stringDefault.get());
expectType<Promise<string>>(stringDefault.get());
expectType<Promise<void>>(stringDefault.set('some string'));

// NonNullable from default, includes broader type as generic
// The second type parameter must be re-specified because TypeScript stops inferring it
// https://github.com/microsoft/TypeScript/issues/26242
const broadGeneric = new StorageItem<Record<string, number>, Record<string, number>>('key', {defaultValue: {a: 1}});
expectAssignable<Promise<Record<string, number>>>(broadGeneric.get());

// Allows null as a value via default value
const storeNull = new StorageItem('key', {defaultValue: null});
await storeNull.set(null);
expectType<Promise<null>>(storeNull.get());

// Allows null as a value type parameters
const storeSomeNull = new StorageItem<number | null>('key');
await storeSomeNull.set(1);
await storeSomeNull.set(null);
expectType<Promise<number | null | undefined>>(storeSomeNull.get());

// @ts-expect-error Type is string
await stringDefault.set(1);

// @ts-expect-error Type is string
await stringDefault.set(true);

// @ts-expect-error Type is string
await stringDefault.set([true, 'string']);

// @ts-expect-error Type is string
await stringDefault.set({wow: [true, 'string']});

// @ts-expect-error Type is string
await stringDefault.set(1, {days: 1});

stringDefault.onChanged(value => {
	expectType<string>(value);
});

objectNoDefault.onChanged(value => {
	expectType<{name: string}>(value);
});

// @ts-expect-error Don't allow mismatched types
new StorageItem<number>('key', {defaultValue: 'SMASHING'});
