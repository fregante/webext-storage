/* eslint-disable no-new -- Type tests only */
import {expectType, expectNotAssignable, expectAssignable} from 'tsd';
import {StorageItem} from './storage-item.js';

type Primitive = boolean | number | string;
type Value = Primitive | Primitive[] | Record<string, any>;

new StorageItem('key', {area: 'local'});
new StorageItem('key', {area: 'sync'});

const unknownItem = new StorageItem('key');
expectAssignable<Promise<unknown>>(unknownItem.get());

const objectItem = new StorageItem<{name: string}>('key');
expectType<Promise<{name: string} | undefined>>(objectItem.get());
expectType<Promise<void>>(objectItem.set({name: 'new name'}));

const stringItem = new StorageItem<string>('key');
expectAssignable<Promise<Value | undefined>>(stringItem.get());
expectNotAssignable<Promise<number | undefined>>(stringItem.get());
expectType<Promise<string | undefined>>(stringItem.get());
expectType<Promise<void>>(stringItem.set('some string'));

// @ts-expect-error Type is string
await stringItem.set(1);

// @ts-expect-error Type is string
await stringItem.set(true);

// @ts-expect-error Type is string
await stringItem.set([true, 'string']);

// @ts-expect-error Type is string
await stringItem.set({wow: [true, 'string']});

// @ts-expect-error Type is string
await stringItem.set(1, {days: 1});
