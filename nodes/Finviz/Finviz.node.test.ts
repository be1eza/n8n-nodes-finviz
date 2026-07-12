import { parseCsvLine, sanitizeFileName } from './Finviz.node';

describe('parseCsvLine', () => {
	it('splits simple comma-separated values', () => {
		expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
	});

	it('handles quoted fields', () => {
		expect(parseCsvLine('"hello",world')).toEqual(['hello', 'world']);
	});

	it('handles commas inside quotes', () => {
		expect(parseCsvLine('"hello, world",foo')).toEqual(['hello, world', 'foo']);
	});

	it('handles escaped quotes (double-quote inside quoted field)', () => {
		expect(parseCsvLine('"say ""hi""",foo')).toEqual(['say "hi"', 'foo']);
	});

	it('handles empty fields', () => {
		expect(parseCsvLine('a,,c')).toEqual(['a', '', 'c']);
	});

	it('handles a single field', () => {
		expect(parseCsvLine('hello')).toEqual(['hello']);
	});

	it('handles empty string', () => {
		expect(parseCsvLine('')).toEqual(['']);
	});

	it('parses a realistic Finviz row', () => {
		expect(parseCsvLine('1,AAPL,"Apple Inc.",168.22,"-1.23%"')).toEqual([
			'1', 'AAPL', 'Apple Inc.', '168.22', '-1.23%',
		]);
	});
});

describe('sanitizeFileName', () => {
	it('appends a .csv extension when missing', () => {
		expect(sanitizeFileName('screener')).toBe('screener.csv');
	});

	it('keeps a single .csv extension', () => {
		expect(sanitizeFileName('report.csv')).toBe('report.csv');
	});

	it('falls back to screener.csv for empty input', () => {
		expect(sanitizeFileName('')).toBe('screener.csv');
	});

	it('strips unsafe file name characters', () => {
		expect(sanitizeFileName('S&P 500/Tech: *big*')).toBe('S&P 500Tech big.csv');
	});

	it('collapses whitespace and trims', () => {
		expect(sanitizeFileName('  My   Screener  ')).toBe('My Screener.csv');
	});
});
