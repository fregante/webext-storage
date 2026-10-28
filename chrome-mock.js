const createEvent = mock => {
	const listeners = new Set();
	return {
		addListener: mock.fn(listener => listeners.add(listener)),
		removeListener: mock.fn(listener => listeners.delete(listener)),
		callListeners(...arguments_) {
			for (const listener of listeners) {
				listener(...arguments_);
			}
		},
	};
};

const createArea = mock => ({
	get: mock.fn(async () => ({})),
	set: mock.fn(async () => {}),
	remove: mock.fn(async () => {}),
	getKeys: mock.fn(async () => []),
});

export const createChrome = mock => ({
	storage: {
		local: createArea(mock),
		sync: createArea(mock),
		onChanged: createEvent(mock),
	},
});

export function stubUserAgent(userAgent) {
	const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
	Object.defineProperty(globalThis, 'navigator', {value: {userAgent}, configurable: true});
	return () => {
		Object.defineProperty(globalThis, 'navigator', original);
	};
}
