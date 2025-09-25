// Unit tests for image utility functions

import { describe, it, expect } from 'vitest';
import { guessExt } from '../../src/logic/image';

describe('Image Utils', () => {
  describe('guessExt', () => {
    it('should return .jpg for jpeg content types', () => {
      expect(guessExt('image/jpeg')).toBe('.jpg');
      expect(guessExt('image/jpeg; charset=utf-8')).toBe('.jpg');
    });

    it('should return .png for png content types', () => {
      expect(guessExt('image/png')).toBe('.png');
    });

    it('should return .gif for gif content types', () => {
      expect(guessExt('image/gif')).toBe('.gif');
    });

    it('should return .webp for webp content types', () => {
      expect(guessExt('image/webp')).toBe('.webp');
    });

    it('should return empty string for unknown content types', () => {
      expect(guessExt('application/octet-stream')).toBe('');
      expect(guessExt('text/plain')).toBe('');
    });
  });
});
