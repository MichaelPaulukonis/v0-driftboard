
import { expect, test, describe } from 'vitest'
import { cn, linkifyText } from '../utils'
import React from 'react'
 
test('cn function merges class names correctly', () => {
  expect(cn('foo', 'bar')).toBe('foo bar')
  expect(cn('foo', false, 'bar')).toBe('foo bar')
  expect(cn('foo', { bar: true, baz: false })).toBe('foo bar')
})

  describe('linkifyText', () => {
    it('should return empty string for empty input', () => {
      expect(linkifyText('')).toBe('');
    });

    it('should return plain text for text without URLs', () => {
      const text = 'This is just plain text';
      const result = linkifyText(text);
      expect(result).toBe(text);
    });

    it('should convert HTTP URLs to clickable links', () => {
      const text = 'Check out http://example.com';
      const result = linkifyText(text) as React.ReactElement[];
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Check out ');
      expect((result[1] as any).props.href).toBe('http://example.com');
      expect((result[1] as any).props.children).toBe('http://example.com');
    });

    it('should convert HTTPS URLs to clickable links', () => {
      const text = 'Visit https://example.com';
      const result = linkifyText(text) as React.ReactElement[];
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Visit ');
      expect((result[1] as any).props.href).toBe('https://example.com');
      expect((result[1] as any).props.children).toBe('https://example.com');
    });

    it('should convert www URLs to clickable links with http prefix', () => {
      const text = 'Check www.example.com for info';
      const result = linkifyText(text) as React.ReactElement[];
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('Check ');
      expect((result[1] as any).props.href).toBe('http://www.example.com');
      expect((result[1] as any).props.children).toBe('www.example.com');
      expect(result[2]).toBe(' for info');
    });

    it('should convert localhost URLs to clickable links with http prefix', () => {
      const text = 'Local server at localhost:3000';
      const result = linkifyText(text) as React.ReactElement[];
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Local server at ');
      expect((result[1] as any).props.href).toBe('http://localhost:3000');
      expect((result[1] as any).props.children).toBe('localhost:3000');
    });

    it('should handle multiple different URL types in one text', () => {
      const text = 'Visit https://github.com and www.google.com also localhost:8080';
      const result = linkifyText(text) as React.ReactElement[];
      
      expect(result).toHaveLength(6); // text, link, text, link, text, link
      expect((result[1] as any).props.href).toBe('https://github.com');
      expect((result[3] as any).props.href).toBe('http://www.google.com');
      expect((result[5] as any).props.href).toBe('http://localhost:8080');
    });

    it('should handle localhost with path and query parameters', () => {
      const text = 'Debug at localhost:3000/api?debug=true';
      const result = linkifyText(text) as React.ReactElement[];
      
      expect(result).toHaveLength(2);
      expect((result[1] as any).props.href).toBe('http://localhost:3000/api?debug=true');
      expect((result[1] as any).props.children).toBe('localhost:3000/api?debug=true');
    });

    it('should set correct attributes for all link types', () => {
      const testCases = [
        'https://example.com',
        'www.example.com', 
        'localhost:3000'
      ];

      testCases.forEach(url => {
        const result = linkifyText(`Check ${url}`) as React.ReactElement[];
        const linkElement = result[1] as any;
        
        expect(linkElement.props.target).toBe('_blank');
        expect(linkElement.props.rel).toBe('noopener noreferrer');
        expect(linkElement.props.className).toContain('text-blue-600');
      });
    });
  });
