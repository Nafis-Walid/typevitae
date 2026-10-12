/**
 * TypeVitae - LaTeX Engine: Sanitizer
 * 
 * Hardened sanitizer that escapes unescaped LaTeX special characters:
 * &, %, $, #, _, {, }, ~, ^, \
 * while safely preserving intentional macros like \textbf{}, \href{}, \faGithub, etc.
 * 
 * Zero external dependencies. Pure Node.js ES Module.
 */

const KNOWN_ZERO_ARG_MACROS = new Set([
  'newline', 'hfill', 'vfill', 'quad', 'qquad', 'item', 'noindent',
  'centering', 'raggedright', 'raggedleft', 'LaTeX', 'TeX', 'today',
  'smallskip', 'medskip', 'bigskip', 'relax', 'small', 'footnotesize',
  'large', 'Large', 'LARGE', 'huge', 'Huge', 'normalsize'
]);

const KNOWN_ARG_MACROS = new Set([
  'textbf', 'textit', 'textsf', 'texttt', 'textsc', 'textmd', 'textup', 'textsl',
  'emph', 'underline', 'sout', 'hspace', 'vspace', 'carrObj', 'researchInterest',
  'edu', 'profExp', 'teachExp', 'project', 'skills', 'award', 'activity',
  'section', 'subsection', 'subsubsection', 'color', 'textcolor'
]);

/**
 * Extracts balanced braces argument `{...}` starting at or near startIdx.
 * Handles nested braces properly.
 */
function extractBalancedArg(text, startIdx) {
  const len = text.length;
  let idx = startIdx;
  while (idx < len && /\s/.test(text[idx])) idx++;
  if (idx >= len || text[idx] !== '{') return null;

  let depth = 0;
  const argStart = idx + 1;
  for (let k = idx; k < len; k++) {
    if (text[k] === '{' && (k === idx || text[k - 1] !== '\\')) {
      depth++;
    } else if (text[k] === '}' && text[k - 1] !== '\\') {
      depth--;
      if (depth === 0) {
        return {
          raw: text.slice(idx, k + 1),
          content: text.slice(argStart, k),
          start: idx,
          end: k + 1
        };
      }
    }
  }
  return null;
}

/**
 * Escapes URL characters for LaTeX hyperref (\href / \url).
 * Ensures # and % are escaped while leaving URLs valid for pdfTeX.
 */
function sanitizeUrlForLatex(url) {
  if (!url) return '';
  return String(url).replace(/([#%])/g, (m, c, offset, s) => {
    return (offset > 0 && s[offset - 1] === '\\') ? c : '\\' + c;
  });
}

/**
 * Sanitizes a string for safe inclusion in LaTeX documents.
 * 
 * @param {string|any} input - Text to sanitize
 * @param {object} [options]
 * @param {boolean} [options.preserveMacros=true] - Preserve intentional LaTeX macros
 * @param {Set<string>|Array<string>} [options.allowedMacros] - Extra macro names to whitelist
 * @returns {string} Sanitized LaTeX string
 */
export function sanitizeLatex(input, options = {}) {
  if (input === null || input === undefined) return '';
  const text = typeof input === 'string' ? input : String(input);
  if (!text) return '';

  const {
    preserveMacros = true,
    allowedMacros = null
  } = options;

  const allowedSet = allowedMacros instanceof Set
    ? allowedMacros
    : (Array.isArray(allowedMacros) ? new Set(allowedMacros) : null);

  let result = '';
  let i = 0;
  const len = text.length;

  const isAlpha = (ch) => (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');

  while (i < len) {
    const ch = text[i];

    if (ch === '\\') {
      // 1. Line break: \\ or \\[5pt]
      if (text[i + 1] === '\\') {
        let breakEnd = i + 2;
        if (text[breakEnd] === '[') {
          const bracketClose = text.indexOf(']', breakEnd);
          if (bracketClose !== -1) {
            result += text.slice(i, bracketClose + 1);
            i = bracketClose + 1;
            continue;
          }
        }
        result += '\\\\';
        i += 2;
        continue;
      }

      // 2. Control space: \ 
      if (text[i + 1] === ' ') {
        result += '\\ ';
        i += 2;
        continue;
      }

      // 3. Spacing modifiers: \, \! \; \:
      if (/[,!;:]/.test(text[i + 1])) {
        result += '\\' + text[i + 1];
        i += 2;
        continue;
      }

      // 4. Already escaped special characters: \&, \%, \$, \#, \_, \{, \}
      if (/[&%$#_{}]/.test(text[i + 1])) {
        result += '\\' + text[i + 1];
        i += 2;
        continue;
      }

      // 5. Already escaped special macros: \textbackslash{}, \textasciitilde{}, \textasciicircum{}
      if (text.startsWith('\\textbackslash{}', i) || text.startsWith('\\textbackslash', i)) {
        const full = text.startsWith('\\textbackslash{}', i) ? '\\textbackslash{}' : '\\textbackslash';
        result += full;
        i += full.length;
        continue;
      }
      if (text.startsWith('\\textasciitilde{}', i) || text.startsWith('\\textasciitilde', i)) {
        const full = text.startsWith('\\textasciitilde{}', i) ? '\\textasciitilde{}' : '\\textasciitilde';
        result += full;
        i += full.length;
        continue;
      }
      if (text.startsWith('\\textasciicircum{}', i) || text.startsWith('\\textasciicircum', i)) {
        const full = text.startsWith('\\textasciicircum{}', i) ? '\\textasciicircum{}' : '\\textasciicircum';
        result += full;
        i += full.length;
        continue;
      }

      // 6. Letter macro: \command
      if (isAlpha(text[i + 1])) {
        let cmdEnd = i + 1;
        while (cmdEnd < len && isAlpha(text[cmdEnd])) cmdEnd++;
        const cmdName = text.slice(i + 1, cmdEnd);

        // FontAwesome icons: \fa[A-Za-z]+ or \fa[A-Za-z]+*
        if (preserveMacros && cmdName.startsWith('fa')) {
          let extraStar = '';
          if (text[cmdEnd] === '*') {
            extraStar = '*';
            cmdEnd++;
          }
          result += '\\' + cmdName + extraStar;
          i = cmdEnd;
          continue;
        }

        // Known zero-argument macros
        if (preserveMacros && KNOWN_ZERO_ARG_MACROS.has(cmdName)) {
          result += '\\' + cmdName;
          i = cmdEnd;
          continue;
        }

        // \href{url}{text}
        if (preserveMacros && cmdName === 'href') {
          const arg1 = extractBalancedArg(text, cmdEnd);
          if (arg1) {
            const arg2 = extractBalancedArg(text, arg1.end);
            if (arg2) {
              const sanitizedUrl = sanitizeUrlForLatex(arg1.content);
              const sanitizedDisplayText = sanitizeLatex(arg2.content, options);
              result += `\\href{${sanitizedUrl}}{${sanitizedDisplayText}}`;
              i = arg2.end;
              continue;
            }
          }
        }

        // \url{url}
        if (preserveMacros && cmdName === 'url') {
          const arg1 = extractBalancedArg(text, cmdEnd);
          if (arg1) {
            const sanitizedUrl = sanitizeUrlForLatex(arg1.content);
            result += `\\url{${sanitizedUrl}}`;
            i = arg1.end;
            continue;
          }
        }

        // Macros taking arguments: e.g. \textbf{...}, \textit{...}
        const arg1 = extractBalancedArg(text, cmdEnd);
        if (arg1) {
          const isAllowed = preserveMacros && (
            KNOWN_ARG_MACROS.has(cmdName) ||
            (allowedSet ? allowedSet.has(cmdName) : false)
          );

          if (isAllowed) {
            const sanitizedContent = sanitizeLatex(arg1.content, options);
            result += `\\${cmdName}{${sanitizedContent}}`;
            i = arg1.end;
            continue;
          }
        }

        // Unrecognized macro or backslash in path (e.g. C:\Users\...)
        result += '\\textbackslash{}' + cmdName;
        i = cmdEnd;
        continue;
      }

      // Backslash without alphanumeric command: convert to \textbackslash{}
      result += '\\textbackslash{}';
      i++;
      continue;
    }

    // Special characters needing escape
    switch (ch) {
      case '&': result += '\\&'; break;
      case '%': result += '\\%'; break;
      case '$': result += '\\$'; break;
      case '#': result += '\\#'; break;
      case '_': result += '\\_'; break;
      case '{': result += '\\{'; break;
      case '}': result += '\\}'; break;
      case '~': result += '\\textasciitilde{}'; break;
      case '^': result += '\\textasciicircum{}'; break;
      default: result += ch; break;
    }
    i++;
  }

  return result;
}

/**
 * Escapes all LaTeX special characters strictly (no macro preservation).
 */
export function escapeLatexSpecialChars(input) {
  return sanitizeLatex(input, { preserveMacros: false });
}

export const escapeLatex = sanitizeLatex;

/**
 * Recursively traverses an object or array and sanitizes all string values.
 * 
 * @param {any} data - Object, array, or primitive
 * @param {object} [options] - Sanitizer options
 * @returns {any} Deeply sanitized copy
 */
export function sanitizeObject(data, options = {}) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return sanitizeLatex(data, options);
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeObject(item, options));
  }

  const result = {};
  for (const [key, val] of Object.entries(data)) {
    // Keep URLs in raw fields but sanitize them safely if required
    result[key] = sanitizeObject(val, options);
  }
  return result;
}

/**
 * Checks whether a text contains unescaped special characters that would break pdflatex.
 * 
 * @param {string} text
 * @returns {boolean} True if safe, false if contains unescaped characters
 */
export function isLatexSafe(text) {
  if (typeof text !== 'string') return true;
  // Look for unescaped special characters
  const unescapedRegex = /(?<!\\)[&%$#_{}]|(?<!\\textasciitilde)\~|(?<!\\textasciicircum)\^/;
  return !unescapedRegex.test(text);
}

export default sanitizeLatex;
