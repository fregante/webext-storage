/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-type-assertion -- vitest.setup.ts is outside tsconfig; jest-chrome types require @types/jest */
import {vi} from 'vitest';
import {chrome} from 'jest-chrome';

// Jest-chrome uses jest.fn() lazily; provide the vitest equivalent
(globalThis as {jest: typeof vi}).jest = vi;
globalThis.chrome = chrome as unknown as typeof globalThis.chrome;
