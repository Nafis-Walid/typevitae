/**
 * TypeVitae - LaTeX Engine: Compiler Pipeline & Diagnostics
 * 
 * Compiles LaTeX source files to PDF using native pdflatex (TeX Live).
 * Features:
 * - Deterministic caching in build_cache/ (sub-millisecond cache hits via SHA-256)
 * - Real-time duration benchmarking (in ms)
 * - Strict PDF validation (existence and non-zero byte size)
 * - Robust log parsing extracting line numbers, context, and clean error messages
 * - Environment configuration for TeX Live binaries on macOS
 * 
 * Zero external dependencies. Pure Node.js ES Module.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { generateLatex } from './generator.mjs';

const DEFAULT_CACHE_DIR = path.resolve('build_cache');
const DEFAULT_TEMPLATES_DIR = path.resolve('latex_engine/templates');
const DEFAULT_PHOTO_PATH = path.resolve('data/photo.png');

/**
 * Standard paths for TeX Live on macOS / POSIX
 */
const TEX_BIN_PATHS = [
  '/Library/TeX/texbin',
  '/usr/local/texlive/2026basic/bin/universal-darwin',
  '/usr/local/texlive/2026/bin/universal-darwin',
  '/usr/local/texlive/2025/bin/universal-darwin',
  '/usr/local/bin',
  '/opt/homebrew/bin'
];

/**
 * Locates the pdflatex binary.
 */
function findPdflatexBinary() {
  for (const dir of TEX_BIN_PATHS) {
    const candidate = path.join(dir, 'pdflatex');
    if (fs.existsSync(candidate)) {
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {
        // Not executable, continue searching
      }
    }
  }
  return 'pdflatex';
}

/**
 * Constructs an optimized PATH environment string.
 */
function buildTexPathEnv() {
  const currentPath = process.env.PATH || '';
  const searchPrefix = TEX_BIN_PATHS.join(':');
  return `${searchPrefix}:${currentPath}`;
}

/**
 * Parses LaTeX log files for errors, warnings, line numbers, and output metrics.
 * 
 * @param {string} logContent - Contents of .log file
 * @returns {object} { errors: Array, warnings: Array, pageCount: number|null, bytes: number|null, summary: string }
 */
export function parseLatexLog(logContent) {
  if (!logContent || typeof logContent !== 'string') {
    return {
      errors: [],
      warnings: [],
      pageCount: null,
      bytes: null,
      summary: 'No log output captured.'
    };
  }

  const errors = [];
  const warnings = [];
  let pageCount = null;
  let bytes = null;

  // 1. Extract page count and byte size: Output written on ... (N pages, M bytes).
  const normalizedLog = logContent.replace(/(\.tex:)\r?\n\s*(\d+:)/g, '$1$2');
  const pageMatch = normalizedLog.match(/Output written on [^)]*\((\d+)\s+pages?,\s*(\d+)\s+bytes\)/i);
  if (pageMatch) {
    pageCount = parseInt(pageMatch[1], 10);
    bytes = parseInt(pageMatch[2], 10);
  }

  // 2. Parse errors line-by-line with TeX line-wrapping and context handling
  const lines = normalizedLog.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File-line error format: path/to/file.tex:123: Error message
    const match = line.match(/^([^\n:]+\.tex):(\d+):\s*(.*)$/);
    if (match) {
      const file = match[1].trim();
      const lineNum = parseInt(match[2], 10);
      let message = match[3].trim();

      // If line was wrapped at 79 chars by TeX, unwrap with next line
      if (line.length >= 79 && i + 1 < lines.length) {
        message += lines[i + 1].trim();
        i++;
      }

      // Check for code context on subsequent line (e.g. l.123 \badmacro)
      let context = '';
      if (i + 1 < lines.length && lines[i + 1].startsWith(`l.${lineNum}`)) {
        context = lines[i + 1].replace(new RegExp(`^l\\.${lineNum}\\s*`), '').trim();
        i++;
      }

      // Filter out redundant emergency/fatal banners
      if (!message.startsWith('==> Fatal error') && !message.startsWith('Emergency stop')) {
        errors.push({
          file,
          line: lineNum,
          message,
          context
        });
      }
      continue;
    }

    // Classic TeX error blocks: ! <message>
    if (line.startsWith('! ')) {
      let message = line.slice(2).trim();

      // Unwrap if line was wrapped at 79 chars
      if (line.length >= 79 && i + 1 < lines.length && !lines[i + 1].startsWith('l.')) {
        message += lines[i + 1].trim();
        i++;
      }

      let lineNum = null;
      let context = '';

      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        const lMatch = lines[j].match(/^l\.(\d+)\s*(.*)$/);
        if (lMatch) {
          lineNum = parseInt(lMatch[1], 10);
          context = lMatch[2].trim();
          break;
        }
      }

      // Filter out redundant emergency/fatal banners
      if (!message.startsWith('==> Fatal error') && !message.startsWith('Emergency stop')) {
        const alreadyCaptured = errors.some(e => e.message === message && (lineNum === null || e.line === lineNum));
        if (!alreadyCaptured) {
          errors.push({
            file: '',
            line: lineNum,
            message,
            context
          });
        }
      }
    } else if (line.includes('LaTeX Warning:') || (line.includes('Package ') && line.includes('Warning:'))) {
      warnings.push({
        message: line.trim()
      });
    }
  }

  // Generate concise human-readable summary
  let summary = '';
  if (errors.length > 0) {
    summary = errors.map(e => {
      const loc = e.line ? `Line ${e.line}` : (e.file ? e.file : 'TeX');
      const ctx = e.context ? ` (${e.context})` : '';
      return `${loc}: ${e.message}${ctx}`;
    }).join(' | ');
  } else {
    summary = 'Compilation completed successfully.';
  }

  return {
    errors,
    warnings,
    pageCount,
    bytes,
    summary
  };
}

/**
 * Computes a SHA-256 hash for cache verification.
 */
function computeCacheHash(content, extraDependencies = []) {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  for (const dep of extraDependencies) {
    if (dep && fs.existsSync(dep)) {
      try {
        const stat = fs.statSync(dep);
        hash.update(`${dep}:${stat.mtimeMs}:${stat.size}`);
      } catch {
        // Skip unreadable files
      }
    }
  }
  return hash.digest('hex');
}

/**
 * Compiles a raw TeX string to PDF in outputDir.
 * 
 * @param {string} texContent - Full LaTeX code to compile
 * @param {object} [options]
 * @param {string} [options.outputDir] - Cache/build directory
 * @param {string} [options.jobName='typevitae'] - Output base filename
 * @param {string} [options.templatesDir] - Directory containing .sty templates
 * @param {string} [options.photoPath] - Path to photo asset
 * @param {boolean} [options.force=false] - Bypass cache and force recompile
 * @returns {Promise<object>} Compilation result object
 */
export async function compileTex(texContent, options = {}) {
  const outputDir = path.resolve(options.outputDir || DEFAULT_CACHE_DIR);
  const templatesDir = path.resolve(options.templatesDir || DEFAULT_TEMPLATES_DIR);
  const photoPath = options.photoPath ? path.resolve(options.photoPath) : DEFAULT_PHOTO_PATH;
  const jobName = options.jobName || 'typevitae';
  const force = options.force === true;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Ensure typevitae.sty is accessible in outputDir as well
  const stySource = path.join(templatesDir, 'typevitae.sty');
  const styTarget = path.join(outputDir, 'typevitae.sty');
  if (fs.existsSync(stySource) && !fs.existsSync(styTarget)) {
    try {
      fs.copyFileSync(stySource, styTarget);
    } catch {
      // Continue if copy fails; TEXINPUTS handles resolution
    }
  }

  const texPath = path.join(outputDir, `${jobName}.tex`);
  const pdfPath = path.join(outputDir, `${jobName}.pdf`);
  const logPath = path.join(outputDir, `${jobName}.log`);
  const cacheMetaPath = path.join(outputDir, `.${jobName}_cache.json`);

  // Dependency list for cache hashing
  const cacheDeps = [stySource];
  if (fs.existsSync(photoPath)) cacheDeps.push(photoPath);

  const currentHash = computeCacheHash(texContent, cacheDeps);

  // 1. Check build cache
  if (!force && fs.existsSync(cacheMetaPath) && fs.existsSync(pdfPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(cacheMetaPath, 'utf-8'));
      const pdfStat = fs.statSync(pdfPath);
      if (meta.hash === currentHash && pdfStat.size > 0) {
        return {
          success: true,
          pdfPath,
          pdfSize: pdfStat.size,
          durationMs: 0,
          pageCount: meta.pageCount || 1,
          cached: true,
          warnings: []
        };
      }
    } catch {
      // Invalid cache metadata, proceed with compilation
    }
  }

  // Write the LaTeX source file
  fs.writeFileSync(texPath, texContent, 'utf-8');

  const pdflatexBin = findPdflatexBinary();
  const args = [
    '-interaction=nonstopmode',
    '-halt-on-error',
    '-file-line-error',
    `-output-directory=${outputDir}`,
    `-jobname=${jobName}`,
    texPath
  ];

  const startTime = performance.now();

  const env = {
    ...process.env,
    PATH: buildTexPathEnv(),
    TEXINPUTS: `.:${templatesDir}:${path.dirname(photoPath)}//:`,
    max_print_line: '10000'
  };

  return new Promise((resolve) => {
    execFile(pdflatexBin, args, { env, cwd: outputDir, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      const durationMs = Math.round(performance.now() - startTime);

      let logContent = '';
      if (fs.existsSync(logPath)) {
        try {
          logContent = fs.readFileSync(logPath, 'utf-8');
        } catch {
          logContent = '';
        }
      } else {
        logContent = stdout || stderr || '';
      }

      const parsedLog = parseLatexLog(logContent);
      const pdfExists = fs.existsSync(pdfPath);
      let pdfSize = 0;
      if (pdfExists) {
        try {
          pdfSize = fs.statSync(pdfPath).size;
        } catch {
          pdfSize = 0;
        }
      }

      const isSuccess = !err && pdfExists && pdfSize > 0;

      if (isSuccess) {
        // Save cache metadata
        const pageCount = parsedLog.pageCount || 1;
        try {
          fs.writeFileSync(cacheMetaPath, JSON.stringify({
            hash: currentHash,
            pageCount,
            pdfSize,
            compiledAt: new Date().toISOString(),
            durationMs
          }, null, 2), 'utf-8');
        } catch {
          // Ignore cache write errors
        }

        resolve({
          success: true,
          pdfPath,
          pdfSize,
          durationMs,
          pageCount,
          cached: false,
          warnings: parsedLog.warnings
        });
      } else {
        const primaryError = parsedLog.errors.length > 0
          ? parsedLog.summary
          : (err ? err.message : 'PDF generation failed or resulted in 0 bytes');

        resolve({
          success: false,
          error: primaryError,
          errors: parsedLog.errors,
          durationMs,
          logPath: fs.existsSync(logPath) ? logPath : null,
          stderr: stderr || stdout
        });
      }
    });
  });
}

/**
 * High-level compiler for profile objects or paths.
 * 
 * @param {object|string} profileInput - Profile object or path to profile JSON
 * @param {object} [options] - Compiler and generator options
 * @returns {Promise<object>} Compilation result
 */
export async function compileProfile(profileInput, options = {}) {
  const templatesDir = options.templatesDir || DEFAULT_TEMPLATES_DIR;
  const photoPath = options.photoPath || DEFAULT_PHOTO_PATH;

  // Generate LaTeX document
  const texContent = generateLatex(profileInput, {
    ...options,
    photoPath,
    styName: 'typevitae'
  });

  return compileTex(texContent, {
    ...options,
    templatesDir,
    photoPath
  });
}

/**
 * Cleans temporary compilation artifacts in build_cache/.
 * 
 * @param {string} [cacheDir]
 */
export function cleanBuildCache(cacheDir = DEFAULT_CACHE_DIR) {
  if (!fs.existsSync(cacheDir)) return;
  const files = fs.readdirSync(cacheDir);
  for (const f of files) {
    if (f.endsWith('.aux') || f.endsWith('.out') || f.endsWith('.log') || f.endsWith('.toc')) {
      try {
        fs.unlinkSync(path.join(cacheDir, f));
      } catch {
        // Ignore file locks
      }
    }
  }
}

export default {
  compileProfile,
  compileTex,
  parseLatexLog,
  cleanBuildCache
};
