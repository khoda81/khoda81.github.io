/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { fractionalAge } from './age.ts';

// 13:48:21 in Tehran, which has been UTC+3:30 year-round since 2023.
const birthday2025 = Date.UTC(2025, 7, 13, 10, 18, 21);
const birthday2026 = Date.UTC(2026, 7, 13, 10, 18, 21);

test('age is a whole number exactly at the birthday instant', () => {
  expect(fractionalAge(birthday2025)).toBe(23);
  expect(fractionalAge(birthday2026)).toBe(24);
});

test('age rises through the year between birthdays', () => {
  const justBefore = fractionalAge(birthday2025 - 1);
  expect(22.999 < justBefore && justBefore < 23).toBe(true);
  expect(fractionalAge((birthday2025 + birthday2026) / 2)).toBeCloseTo(23.5, 9);
});
