import assert from 'node:assert/strict';
import {test, beforeEach} from 'node:test';
import {createChrome, stubUserAgent} from '../chrome-mock.js';
import {StorageItem} from 'webext-storage';

const testItem = new StorageItem('name');

function createStorage(wholeCache, area = 'local') {
	chrome.storage[area].get.mock.mockImplementation(async key => {
		if (key in wholeCache) {
			return {[key]: wholeCache[key]};
		}

		return {};
	});
}

beforeEach(t => {
	globalThis.chrome = createChrome(t.mock);
});

test('get() with empty storage', async () => {
	assert.equal(await testItem.get(), undefined);
});

test('get() with storage', async () => {
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.get(), 'Rico');
});

test('get() with default', async () => {
	const testItem = new StorageItem('name', {defaultValue: 'Anne'});
	assert.equal(await testItem.get(), 'Anne');
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.get(), 'Rico');
});

test('get() with `sync` storage', async () => {
	const sync = new StorageItem('name', {area: 'sync'});
	await sync.get();

	assert.equal(chrome.storage.local.get.mock.callCount(), 0);

	const [argument] = chrome.storage.sync.get.mock.calls.at(-1).arguments;
	assert.deepEqual(argument, 'name');
});

test('set(undefined) will unset the value', async () => {
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.set(), undefined);
	assert.equal(chrome.storage.local.set.mock.callCount(), 0);
	const [argument] = chrome.storage.local.remove.mock.calls.at(-1).arguments;
	assert.deepEqual(argument, 'name');
});

test('set() with value', async () => {
	await testItem.set('Anne');
	const [argument1] = chrome.storage.local.set.mock.calls.at(-1).arguments;
	assert.deepEqual(Object.keys(argument1), ['name']);
	assert.equal(argument1.name, 'Anne');
});

test('remove()', async () => {
	await testItem.remove();
	const [argument] = chrome.storage.local.remove.mock.calls.at(-1).arguments;
	assert.equal(argument, 'name');
});

test('has() returns false', async () => {
	createStorage({});
	assert.equal(await testItem.has(), false);
});

test('has() returns true', async () => {
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.has(), true);
});

test('onChanged() is called for the correct item', async t => {
	const name = new StorageItem('name');
	const spy = t.mock.fn();
	name.onChanged(spy);
	chrome.storage.onChanged.callListeners({unrelatedKey: 123}, 'local');
	assert.equal(spy.mock.callCount(), 0);
	chrome.storage.onChanged.callListeners({name: 'Anne'}, 'sync');
	assert.equal(spy.mock.callCount(), 0);
	chrome.storage.onChanged.callListeners({name: 'Anne'}, 'local');
	assert.equal(spy.mock.callCount(), 1);
});

test('onChanged() is not called on Firefox when value is unchanged', async t => {
	const restoreUserAgent = stubUserAgent('Mozilla/5.0 Firefox/120.0');
	try {
		const name = new StorageItem('name');
		const spy = t.mock.fn();
		name.onChanged(spy);
		chrome.storage.onChanged.callListeners({name: {newValue: 'Anne', oldValue: 'Anne'}}, 'local');
		assert.equal(spy.mock.callCount(), 0);
		chrome.storage.onChanged.callListeners({name: {newValue: 'Bob', oldValue: 'Anne'}}, 'local');
		assert.equal(spy.mock.callCount(), 1);
	} finally {
		restoreUserAgent();
	}
});

test('throws when chrome.storage is not available', async () => {
	const originalChrome = globalThis.chrome;
	try {
		globalThis.chrome = undefined;
		const expectedError = /`chrome\.storage` is not available/;
		await assert.rejects(testItem.get(), expectedError);
		await assert.rejects(testItem.set('value'), expectedError);
		await assert.rejects(testItem.has(), expectedError);
		await assert.rejects(testItem.remove(), expectedError);
		assert.throws(() => testItem.onChanged(() => {}), expectedError);
	} finally {
		globalThis.chrome = originalChrome;
	}
});
