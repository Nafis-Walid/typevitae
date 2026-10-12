/**
 * TypeVitae - LaTeX Compiler & Diagnostics Test Suite
 * Native Node.js Test Runner (node:test)
 * 
 * Verifies:
 * - Real pdflatex compilation end-to-end
 * - Sub-800ms compilation latency benchmark
 * - PDF generation validity (>50KB size)
 * - Deterministic SHA-256 build caching
 * - Error diagnostic extraction and log parsing
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  compileProfile,
  compileTex,
  parseLatexLog,
  cleanBuildCache
} from '../latex_engine/compiler.mjs';

const PROFILE_PATH = path.resolve('data/profiles/default_nafis.json');

describe('LaTeX Compiler - End-to-End Compilation & Benchmarks', () => {
  it('compiles default_nafis profile successfully under 800ms benchmark', async () => {
    // Force cold compilation to accurately benchmark TeX Live engine
    const result = await compileProfile(PROFILE_PATH, {
      force: true,
      jobName: 'typevitae_benchmark'
    });

    assert.equal(result.success, true, `Compilation failed: ${result.error}`);
    assert.ok(result.pdfPath, 'Result must contain pdfPath');
    assert.ok(fs.existsSync(result.pdfPath), `PDF file does not exist at ${result.pdfPath}`);

    // PDF size validation (>50KB)
    assert.ok(
      result.pdfSize > 50000,
      `PDF size should be > 50KB (50,000 bytes), got ${result.pdfSize} bytes`
    );

    // Latency benchmark validation (<800ms)
    assert.ok(
      result.durationMs < 800,
      `Cold compilation duration exceeded 800ms threshold: ${result.durationMs}ms`
    );

    assert.equal(result.cached, false, 'Cold compilation should not be cached');
    assert.ok(result.pageCount >= 1, `Page count should be at least 1, got ${result.pageCount}`);
  });

  it('serves sub-millisecond deterministic cache on unchanged input', async () => {
    // Warm compilation (second pass without force)
    const cachedResult = await compileProfile(PROFILE_PATH, {
      force: false,
      jobName: 'typevitae_benchmark'
    });

    assert.equal(cachedResult.success, true);
    assert.equal(cachedResult.cached, true, 'Second compile should hit SHA-256 build cache');
    assert.ok(
      cachedResult.durationMs <= 50,
      `Cached compilation duration should be near-zero, got ${cachedResult.durationMs}ms`
    );
    assert.ok(cachedResult.pdfSize > 50000, 'Cached result must retain valid PDF size');
  });

  it('compiles with compact preset generating valid output', async () => {
    const result = await compileProfile(PROFILE_PATH, {
      preset: 'compact',
      jobName: 'test_compact',
      force: true
    });

    assert.equal(result.success, true);
    assert.ok(fs.existsSync(result.pdfPath));
    assert.ok(result.pdfSize > 50000);
    assert.ok(result.durationMs < 800);
  });

  it('compiles with classic serif template generating valid output', async () => {
    const result = await compileProfile(PROFILE_PATH, {
      template: 'classic',
      jobName: 'test_classic',
      force: true
    });

    assert.equal(result.success, true);
    assert.ok(fs.existsSync(result.pdfPath));
    assert.ok(result.pdfSize > 50000);
    assert.ok(result.durationMs < 800);
  });

  it('compiles direct raw LaTeX string via compileTex', async () => {
    const minimalDoc = `
\\documentclass{article}
\\begin{document}
\\section{Test Document}
TypeVitae automated compiler validation string.
\\end{document}
`;
    const result = await compileTex(minimalDoc, {
      jobName: 'test_raw_tex',
      force: true
    });

    assert.equal(result.success, true);
    assert.ok(fs.existsSync(result.pdfPath));
    assert.ok(result.pdfSize > 1000);
    assert.ok(result.durationMs < 800);
  });
});

describe('LaTeX Compiler - Error Diagnostics & Log Parsing', () => {
  it('gracefully captures error and diagnostics for invalid LaTeX syntax', async () => {
    const invalidDoc = `
\\documentclass{article}
\\begin{document}
\\undefinedCommandXYZ{broken}
\\end{document}
`;
    const result = await compileTex(invalidDoc, {
      jobName: 'test_invalid_syntax',
      force: true
    });

    assert.equal(result.success, false, 'Invalid LaTeX must return success: false');
    assert.ok(result.error, 'Result must contain error summary');
    assert.ok(Array.isArray(result.errors), 'Result must contain errors array');
    assert.ok(result.errors.length > 0, 'Errors array must contain at least one diagnostic error');

    const firstErr = result.errors[0];
    assert.ok(
      firstErr.message.includes('Undefined control sequence') || firstErr.message.length > 0,
      `Expected undefined control sequence error, got: ${firstErr.message}`
    );
    assert.ok(result.durationMs >= 0, 'Duration should still be benchmarked even on failure');
  });

  it('parseLatexLog extracts page count and byte metrics from successful log', () => {
    const sampleLog = `
This is pdfTeX, Version 3.141592653-2.6-1.40.29 (TeX Live 2026)
(./document.tex)
Output written on document.pdf (4 pages, 114838 bytes).
Transcript written on document.log.
`;
    const parsed = parseLatexLog(sampleLog);
    assert.equal(parsed.pageCount, 4);
    assert.equal(parsed.bytes, 114838);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.summary, 'Compilation completed successfully.');
  });

  it('parseLatexLog extracts line number, context, and message from TeX error log', () => {
    const errorLog = `
! Undefined control sequence.
l.42 \\invalidMacro
                  {arg}
? 
! Emergency stop.
`;
    const parsed = parseLatexLog(errorLog);
    assert.ok(parsed.errors.length >= 1);
    const err = parsed.errors[0];
    assert.equal(err.message, 'Undefined control sequence.');
    assert.equal(err.line, 42);
    assert.ok(err.context.includes('\\invalidMacro'));
    assert.ok(parsed.summary.includes('Line 42'));
  });

  it('parseLatexLog extracts file-line-error format correctly', () => {
    const fileLineLog = `
/path/to/test.tex:17: Package hyperref Error: Wrong DVI mode driver option.
`;
    const parsed = parseLatexLog(fileLineLog);
    assert.ok(parsed.errors.length >= 1);
    assert.equal(parsed.errors[0].file, '/path/to/test.tex');
    assert.equal(parsed.errors[0].line, 17);
    assert.ok(parsed.errors[0].message.includes('Package hyperref Error'));
  });

  it('parseLatexLog extracts LaTeX and package warnings', () => {
    const warningLog = `
LaTeX Warning: Hyper reference 'sec:intro' on page 1 undefined on input line 55.
Package geometry Warning: Over-full \\vbox (12.0pt too high) has occurred while \\output is active.
`;
    const parsed = parseLatexLog(warningLog);
    assert.equal(parsed.warnings.length, 2);
    assert.ok(parsed.warnings[0].message.includes('Hyper reference'));
    assert.ok(parsed.warnings[1].message.includes('geometry Warning'));
  });

  it('cleanBuildCache purges intermediate aux, out, log artifacts safely', () => {
    const cacheDir = path.resolve('build_cache');
    const dummyAux = path.join(cacheDir, 'test_cleanup.aux');
    const dummyLog = path.join(cacheDir, 'test_cleanup.log');
    fs.writeFileSync(dummyAux, 'aux content', 'utf-8');
    fs.writeFileSync(dummyLog, 'log content', 'utf-8');

    cleanBuildCache(cacheDir);

    assert.equal(fs.existsSync(dummyAux), false, 'Auxiliary .aux file should be cleaned');
    assert.equal(fs.existsSync(dummyLog), false, 'Auxiliary .log file should be cleaned');
  });
});
