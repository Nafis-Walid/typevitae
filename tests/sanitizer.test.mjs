/**
 * TypeVitae - LaTeX Sanitizer Test Suite
 * Native Node.js Test Runner (node:test)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeLatex,
  escapeLatexSpecialChars,
  sanitizeObject,
  isLatexSafe
} from '../latex_engine/sanitizer.mjs';

describe('LaTeX Sanitizer - Special Character Escaping', () => {
  it('escapes ampersand (&) to \\&', () => {
    assert.equal(sanitizeLatex('AT&T'), 'AT\\&T');
    assert.equal(sanitizeLatex('Tom & Jerry'), 'Tom \\& Jerry');
    assert.equal(sanitizeLatex('R&D Department'), 'R\\&D Department');
  });

  it('escapes percent (%) to \\%', () => {
    assert.equal(sanitizeLatex('100% complete'), '100\\% complete');
    assert.equal(sanitizeLatex('Improved latency by 45%'), 'Improved latency by 45\\%');
  });

  it('escapes dollar sign ($) to \\$', () => {
    assert.equal(sanitizeLatex('$500,000 budget'), '\\$500,000 budget');
    assert.equal(sanitizeLatex('Generated $10M ARR'), 'Generated \\$10M ARR');
  });

  it('escapes hash (#) to \\#', () => {
    assert.equal(sanitizeLatex('Issue #42'), 'Issue \\#42');
    assert.equal(sanitizeLatex('#1 Ranked Team'), '\\#1 Ranked Team');
  });

  it('escapes underscore (_) to \\_', () => {
    assert.equal(sanitizeLatex('snake_case_variable'), 'snake\\_case\\_variable');
    assert.equal(sanitizeLatex('__init__'), '\\_\\_init\\_\\_');
  });

  it('escapes curly braces ({ and }) to \\{ and \\}', () => {
    assert.equal(sanitizeLatex('{key: value}'), '\\{key: value\\}');
    assert.equal(sanitizeLatex('function() { return 1; }'), 'function() \\{ return 1; \\}');
  });

  it('escapes tilde (~) to \\textasciitilde{}', () => {
    assert.equal(sanitizeLatex('~/workspace'), '\\textasciitilde{}/workspace');
    assert.equal(sanitizeLatex('~10 years experience'), '\\textasciitilde{}10 years experience');
  });

  it('escapes caret (^) to \\textasciicircum{}', () => {
    assert.equal(sanitizeLatex('O(n^2) complexity'), 'O(n\\textasciicircum{}2) complexity');
    assert.equal(sanitizeLatex('Bitwise a ^ b'), 'Bitwise a \\textasciicircum{} b');
  });

  it('escapes stray backslashes to \\textbackslash{}', () => {
    assert.equal(sanitizeLatex('back\\slash'), 'back\\textbackslash{}slash');
    assert.equal(sanitizeLatex('C:\\Users\\Nafis\\Docs'), 'C:\\textbackslash{}Users\\textbackslash{}Nafis\\textbackslash{}Docs');
  });

  it('handles consecutive special characters properly', () => {
    assert.equal(sanitizeLatex('&&'), '\\&\\&');
    assert.equal(sanitizeLatex('%%'), '\\%\\%');
    assert.equal(sanitizeLatex('$$'), '\\$\\$');
    assert.equal(sanitizeLatex('##'), '\\#\\#');
    assert.equal(sanitizeLatex('__'), '\\_\\_');
    assert.equal(sanitizeLatex('{{}}'), '\\{\\{\\}\\}');
    assert.equal(sanitizeLatex('&%$#_{}^~'), '\\&\\%\\$\\#\\_\\{\\}\\textasciicircum{}\\textasciitilde{}');
  });
});

describe('LaTeX Sanitizer - Idempotency & Already Escaped Sequences', () => {
  it('does not double escape already escaped special characters', () => {
    assert.equal(sanitizeLatex('\\&'), '\\&');
    assert.equal(sanitizeLatex('\\%'), '\\%');
    assert.equal(sanitizeLatex('\\$'), '\\$');
    assert.equal(sanitizeLatex('\\#'), '\\#');
    assert.equal(sanitizeLatex('\\_'), '\\_');
    assert.equal(sanitizeLatex('\\{'), '\\{');
    assert.equal(sanitizeLatex('\\}'), '\\}');
  });

  it('does not double escape already escaped macro representations', () => {
    assert.equal(sanitizeLatex('\\textbackslash{}'), '\\textbackslash{}');
    assert.equal(sanitizeLatex('\\textasciitilde{}'), '\\textasciitilde{}');
    assert.equal(sanitizeLatex('\\textasciicircum{}'), '\\textasciicircum{}');
  });

  it('preserves LaTeX line breaks \\\\ and optional spacing arguments', () => {
    assert.equal(sanitizeLatex('Line 1 \\\\ Line 2'), 'Line 1 \\\\ Line 2');
    assert.equal(sanitizeLatex('Line 1 \\\\[4pt] Line 2'), 'Line 1 \\\\[4pt] Line 2');
    assert.equal(sanitizeLatex('Line 1 \\\\[-2mm] Line 2'), 'Line 1 \\\\[-2mm] Line 2');
  });

  it('preserves LaTeX control spaces and spacing modifiers', () => {
    assert.equal(sanitizeLatex('Control\\ space'), 'Control\\ space');
    assert.equal(sanitizeLatex('Thin\\,space'), 'Thin\\,space');
    assert.equal(sanitizeLatex('Negative\\!space'), 'Negative\\!space');
    assert.equal(sanitizeLatex('Medium\\:space'), 'Medium\\:space');
    assert.equal(sanitizeLatex('Thick\\;space'), 'Thick\\;space');
  });
});

describe('LaTeX Sanitizer - Macro Preservation & Isolation', () => {
  it('preserves FontAwesome icon macros with and without asterisks', () => {
    assert.equal(sanitizeLatex('\\faGithub'), '\\faGithub');
    assert.equal(sanitizeLatex('\\faLinkedin'), '\\faLinkedin');
    assert.equal(sanitizeLatex('\\faEnvelope'), '\\faEnvelope');
    assert.equal(sanitizeLatex('\\faPhone'), '\\faPhone');
    assert.equal(sanitizeLatex('\\faMapMarker*'), '\\faMapMarker*');
    assert.equal(sanitizeLatex('\\faGlobe'), '\\faGlobe');
  });

  it('preserves zero-argument typesetting macros', () => {
    assert.equal(sanitizeLatex('\\newline'), '\\newline');
    assert.equal(sanitizeLatex('\\hfill'), '\\hfill');
    assert.equal(sanitizeLatex('\\vfill'), '\\vfill');
    assert.equal(sanitizeLatex('\\quad'), '\\quad');
    assert.equal(sanitizeLatex('\\qquad'), '\\qquad');
    assert.equal(sanitizeLatex('\\item'), '\\item');
    assert.equal(sanitizeLatex('\\noindent'), '\\noindent');
    assert.equal(sanitizeLatex('\\LaTeX'), '\\LaTeX');
    assert.equal(sanitizeLatex('\\TeX'), '\\TeX');
    assert.equal(sanitizeLatex('\\today'), '\\today');
  });

  it('preserves argument-taking text styling macros', () => {
    assert.equal(sanitizeLatex('\\textbf{Clean Code}'), '\\textbf{Clean Code}');
    assert.equal(sanitizeLatex('\\textit{Software Engineer}'), '\\textit{Software Engineer}');
    assert.equal(sanitizeLatex('\\textsf{Sans Serif}'), '\\textsf{Sans Serif}');
    assert.equal(sanitizeLatex('\\texttt{System.out.println}'), '\\texttt{System.out.println}');
    assert.equal(sanitizeLatex('\\textsc{Capital Letters}'), '\\textsc{Capital Letters}');
    assert.equal(sanitizeLatex('\\emph{Emphasized}'), '\\emph{Emphasized}');
    assert.equal(sanitizeLatex('\\underline{Underlined}'), '\\underline{Underlined}');
  });

  it('sanitizes special characters nested inside preserved macros', () => {
    const input = '\\textbf{Profit & Loss: 100% of $500K}';
    const expected = '\\textbf{Profit \\& Loss: 100\\% of \\$500K}';
    assert.equal(sanitizeLatex(input), expected);
  });

  it('preserves nested macros while sanitizing contents', () => {
    const input = '\\textbf{Led team of 10 & delivered \\textit{Mission Critical #1} system}';
    const expected = '\\textbf{Led team of 10 \\& delivered \\textit{Mission Critical \\#1} system}';
    assert.equal(sanitizeLatex(input), expected);
  });

  it('handles \\href with URL sanitization and display text escaping', () => {
    const input = '\\href{https://github.com/nafiswalid#projects}{GitHub & Portfolio}';
    const expected = '\\href{https://github.com/nafiswalid\\#projects}{GitHub \\& Portfolio}';
    assert.equal(sanitizeLatex(input), expected);
  });

  it('handles \\url macros with hash and percent escaping', () => {
    const input = '\\url{https://example.com/api#v1%20spec}';
    const expected = '\\url{https://example.com/api\\#v1\\%20spec}';
    assert.equal(sanitizeLatex(input), expected);
  });

  it('escapes unknown or arbitrary command macros for injection safety', () => {
    assert.equal(sanitizeLatex('\\write18{malicious}'), '\\textbackslash{}write18\\{malicious\\}');
    assert.equal(sanitizeLatex('\\input{/etc/passwd}'), '\\textbackslash{}input\\{/etc/passwd\\}');
  });
});

describe('LaTeX Sanitizer - Strict Mode & Special Functions', () => {
  it('escapeLatexSpecialChars disables macro preservation strictly', () => {
    assert.equal(escapeLatexSpecialChars('\\textbf{bold}'), '\\textbackslash{}textbf\\{bold\\}');
    assert.equal(escapeLatexSpecialChars('\\href{url}{text}'), '\\textbackslash{}href\\{url\\}\\{text\\}');
    assert.equal(escapeLatexSpecialChars('\\faGithub'), '\\textbackslash{}faGithub');
    assert.equal(escapeLatexSpecialChars('Price $100 & 50%'), 'Price \\$100 \\& 50\\%');
  });

  it('sanitizeObject deeply processes nested objects and arrays', () => {
    const rawData = {
      name: 'Nafis & Walid',
      metrics: {
        revenue: '$1.2M',
        growth: '250%',
        tags: ['#embedded', 'C_C++', 'O(n^2)']
      },
      count: 42,
      active: true,
      nullable: null
    };

    const sanitized = sanitizeObject(rawData);

    assert.equal(sanitized.name, 'Nafis \\& Walid');
    assert.equal(sanitized.metrics.revenue, '\\$1.2M');
    assert.equal(sanitized.metrics.growth, '250\\%');
    assert.deepEqual(sanitized.metrics.tags, ['\\#embedded', 'C\\_C++', 'O(n\\textasciicircum{}2)']);
    assert.equal(sanitized.count, 42);
    assert.equal(sanitized.active, true);
    assert.equal(sanitized.nullable, null);
  });

  it('isLatexSafe accurately detects unescaped characters', () => {
    assert.equal(isLatexSafe('Simple safe alphanumeric text'), true);
    assert.equal(isLatexSafe('Escaped \\& and \\% and \\$'), true);
    assert.equal(isLatexSafe('Unescaped & symbol'), false);
    assert.equal(isLatexSafe('Unescaped % symbol'), false);
    assert.equal(isLatexSafe('Unescaped $ symbol'), false);
    assert.equal(isLatexSafe('Unescaped # symbol'), false);
    assert.equal(isLatexSafe('Unescaped _ symbol'), false);
    assert.equal(isLatexSafe('Unescaped { symbol'), false);
    assert.equal(isLatexSafe('Unescaped } symbol'), false);
    assert.equal(isLatexSafe('Unescaped ^ symbol'), false);
    assert.equal(isLatexSafe('Unescaped ~ symbol'), false);
  });

  it('handles edge cases: empty strings, null, undefined, numbers', () => {
    assert.equal(sanitizeLatex(''), '');
    assert.equal(sanitizeLatex(null), '');
    assert.equal(sanitizeLatex(undefined), '');
    assert.equal(sanitizeLatex(12345), '12345');
    assert.equal(sanitizeLatex(false), 'false');
  });
});
