import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4200;
const DATA_DIR = path.join(__dirname, 'data');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const PUBLIC_DIR = path.join(__dirname, 'public');
const CACHE_DIR = path.join(__dirname, 'build_cache');

if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const CACHE_REAPER_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;         // 1 hour

/**
 * Automated background cache reaper that purges temp build files in build_cache/
 * older than 1 hour while preserving .gitkeep, templates (*.sty, template files),
 * active.json, and typevitae.pdf fallback.
 */
function reapBuildCache(cacheDir = CACHE_DIR, maxAgeMs = CACHE_MAX_AGE_MS) {
  if (!fs.existsSync(cacheDir)) return 0;
  const now = Date.now();
  let purgedCount = 0;

  try {
    const entries = fs.readdirSync(cacheDir);
    for (const file of entries) {
      if (
        file === '.gitkeep' ||
        file === 'active.json' ||
        file === 'typevitae.sty' ||
        file === 'typevitae.pdf' ||
        file.endsWith('.sty') ||
        file.includes('template')
      ) {
        continue;
      }

      const filePath = path.join(cacheDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile() && (now - stat.mtimeMs > maxAgeMs)) {
          fs.unlinkSync(filePath);
          purgedCount++;
        }
      } catch {
        // Skip inaccessible or already deleted files
      }
    }
  } catch (err) {
    console.error('Error in reapBuildCache:', err.message);
  }

  return purgedCount;
}

const reaperTimer = setInterval(() => {
  reapBuildCache(CACHE_DIR, CACHE_MAX_AGE_MS);
}, CACHE_REAPER_INTERVAL_MS);

if (reaperTimer && typeof reaperTimer.unref === 'function') {
  reaperTimer.unref();
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Preset configurations
const PRESETS = {
  master: {
    name: 'Full Master (Comprehensive)',
    description: 'All experience, publications, teaching, projects, and skills (3-4 pages)',
    enabledSections: ['career_objective', 'education', 'research_interests', 'publications', 'experience', 'projects', 'teaching', 'skills', 'awards', 'volunteer', 'references'],
    objectiveProfiles: ['Embedded Software Engineering (Industry)', 'Academic & Higher Education (Lecturer in CSE)', 'Hardware Systems & Processor Architecture (VLSI)', 'Human-Computer Interaction (HCI & Social Impact)']
  },
  industry: {
    name: 'Industry SWE / Embedded (2-Page)',
    description: 'Focused on Firmware, Networking, C/C++, Systems Projects & Core Skills',
    enabledSections: ['career_objective', 'education', 'experience', 'projects', 'skills', 'awards'],
    objectiveProfiles: ['Embedded Software Engineering (Industry)', 'Hardware Systems & Processor Architecture (VLSI)']
  },
  academic: {
    name: 'Academic / Faculty (2-Page)',
    description: 'Focused on Teaching, Research, Publications, and Academic Background',
    enabledSections: ['career_objective', 'education', 'research_interests', 'publications', 'teaching', 'skills', 'references'],
    objectiveProfiles: ['Academic & Higher Education (Lecturer in CSE)', 'Human-Computer Interaction (HCI & Social Impact)']
  },
  compact: {
    name: 'Compact Executive (1-Page)',
    description: 'High-density 1-page resume with essential credentials and recent role',
    enabledSections: ['career_objective', 'education', 'experience', 'projects', 'skills'],
    objectiveProfiles: ['Embedded Software Engineering (Industry)']
  }
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // 1. Static Web UI files
  if ((pathname === '/' || pathname === '/index.html') && (req.method === 'GET' || req.method === 'HEAD')) {
    const htmlPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(htmlPath).pipe(res);
    }
  }

  const publicRel = pathname.startsWith('/public/') ? pathname.replace('/public/', '') : pathname.replace(/^\//, '');
  const candidateFilePath = path.join(PUBLIC_DIR, publicRel);
  if (publicRel && fs.existsSync(candidateFilePath) && fs.statSync(candidateFilePath).isFile() && (req.method === 'GET' || req.method === 'HEAD')) {
    const ext = path.extname(candidateFilePath);
    const mimeTypes = {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(candidateFilePath).pipe(res);
  }

  // 2. Photo serving
  if ((pathname === '/data/photo.png' || pathname === '/photo.png') && (req.method === 'GET' || req.method === 'HEAD')) {
    const photoFile = path.join(DATA_DIR, 'photo.png');
    if (fs.existsSync(photoFile)) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(photoFile).pipe(res);
    } else {
      res.writeHead(404);
      return res.end('Photo not found');
    }
  }

  // 3. API: Presets
  if (pathname === '/api/presets' && req.method === 'GET') {
    return sendJson(res, 200, PRESETS);
  }

  // 4. API: Profiles list
  if (pathname === '/api/profiles' && req.method === 'GET') {
    const isLocalOrPrivate = urlObj.searchParams.get('include_private') === 'true' ||
                             req.headers.host?.includes('localhost') ||
                             req.headers.host?.includes('127.0.0.1');
    const files = fs.readdirSync(PROFILES_DIR).filter(f => {
      if (!f.endsWith('.json') || f === 'active.json') return false;
      // Protect personal profile from public exposure
      if (!isLocalOrPrivate && f === 'default_nafis.json') return false;
      return true;
    });

    const profiles = files.map(f => {
      const id = f.replace('.json', '');
      try {
        const d = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, f), 'utf-8'));
        return { id, name: d.header?.name || id, title: d.header?.email || '' };
      } catch {
        return { id, name: id, title: '' };
      }
    });

    // Ensure starter_template is prioritized first
    profiles.sort((a, b) => (a.id === 'starter_template' ? -1 : b.id === 'starter_template' ? 1 : 0));
    return sendJson(res, 200, { profiles, activeId: 'starter_template' });
  }

  // 5. API: Get Profile
  if (pathname === '/api/profile' && req.method === 'GET') {
    const profileId = urlObj.searchParams.get('id') || 'starter_template';
    const filePath = path.join(PROFILES_DIR, `${profileId}.json`);
    const fallbackPath = path.join(PROFILES_DIR, 'starter_template.json');
    const target = fs.existsSync(filePath) ? filePath : fallbackPath;

    if (fs.existsSync(target)) {
      const data = fs.readFileSync(target, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(data);
    }
    return sendJson(res, 404, { error: 'Profile not found' });
  }

  // 6. API: Save Profile
  if (pathname === '/api/profile' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const profileId = urlObj.searchParams.get('id') || 'active';
      const targetPath = path.join(PROFILES_DIR, `${profileId}.json`);

      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 7. API: Compile to PDF (Stateless in-memory compilation)
  if (pathname === '/api/compile' && req.method === 'POST') {
    try {
      let bodyData = await parseJsonBody(req);

      // Support client-provided sessionId or buildId or generate unique build identifier
      const clientBuildId = (bodyData && (bodyData.buildId || bodyData.sessionId)) ||
                            urlObj.searchParams.get('buildId') ||
                            urlObj.searchParams.get('sessionId');
      const sanitizedClientBuildId = (clientBuildId && typeof clientBuildId === 'string')
        ? clientBuildId.replace(/[^a-zA-Z0-9_-]/g, '')
        : '';
      const buildId = sanitizedClientBuildId || ('build_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'));

      // Use payload directly without overwriting shared server state
      let profileData = bodyData;
      if (!profileData || Object.keys(profileData).length === 0) {
        const starterPath = path.join(PROFILES_DIR, 'starter_template.json');
        const activePath = path.join(PROFILES_DIR, 'active.json');
        const fallback = fs.existsSync(starterPath) ? starterPath : activePath;
        if (fs.existsSync(fallback)) {
          profileData = JSON.parse(fs.readFileSync(fallback, 'utf-8'));
        }
      }

      // Dynamic import of compiler
      const compilerModule = await import(`./latex_engine/compiler.mjs?t=${Date.now()}`);
      const result = await compilerModule.compileProfile(profileData, {
        outputDir: CACHE_DIR,
        jobName: buildId,
        templatesDir: path.join(__dirname, 'latex_engine/templates'),
        photoPath: path.join(DATA_DIR, 'photo.png')
      });

      if (!result.success) {
        return sendJson(res, 200, {
          success: false,
          buildId,
          error: result.error || 'Compilation failed',
          errors: result.errors || [],
          durationMs: result.durationMs || 0,
          warnings: result.warnings || []
        });
      }

      // Maintain typevitae.pdf fallback for backward compatibility
      if (result.pdfPath && fs.existsSync(result.pdfPath)) {
        try {
          fs.copyFileSync(result.pdfPath, path.join(CACHE_DIR, 'typevitae.pdf'));
        } catch {
          // Non-critical fallback copy
        }
      }

      return sendJson(res, 200, {
        success: true,
        buildId,
        pdfUrl: `/api/pdf?id=${buildId}`,
        durationMs: result.durationMs,
        pageCount: result.pageCount,
        cached: result.cached,
        warnings: result.warnings || [],
        pdfPath: result.pdfPath,
        pdfSize: result.pdfSize
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 8. API: Stream PDF
  if (pathname === '/api/pdf' && (req.method === 'GET' || req.method === 'HEAD')) {
    const rawId = urlObj.searchParams.get('id');
    let targetFilename;

    if (rawId !== null && rawId !== undefined) {
      const sanitizedId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (!sanitizedId) {
        return sendJson(res, 404, { error: 'Invalid build ID' });
      }
      targetFilename = `${sanitizedId}.pdf`;
    } else {
      targetFilename = 'typevitae.pdf';
    }

    const pdfPath = path.join(CACHE_DIR, targetFilename);
    if (fs.existsSync(pdfPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="TypeVitae_CV.pdf"',
        'Access-Control-Allow-Origin': '*',
      });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(pdfPath).pipe(res);
    }
    return sendJson(res, 404, { error: 'PDF not generated yet' });
  }

  // 10. API: Upload Photo
  if (pathname === '/api/upload-photo' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const boundaryMatch = req.headers['content-type']?.match(/boundary=(.+)$/);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const parts = buffer.toString('binary').split('--' + boundary);
        for (const part of parts) {
          if (part.includes('filename="')) {
            const dataIndex = part.indexOf('\r\n\r\n');
            if (dataIndex !== -1) {
              const fileData = part.substring(dataIndex + 4, part.lastIndexOf('\r\n'));
              fs.writeFileSync(path.join(DATA_DIR, 'photo.png'), Buffer.from(fileData, 'binary'));
              return sendJson(res, 200, { success: true, photoPath: '/data/photo.png' });
            }
          }
        }
      }
      fs.writeFileSync(path.join(DATA_DIR, 'photo.png'), buffer);
      return sendJson(res, 200, { success: true, photoPath: '/data/photo.png' });
    });
    return;
  }

  // Fallback 404
  res.writeHead(404);
  res.end('Not found');
});

const isDirectExecution = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('server.mjs')
);

const HOST = process.env.HOST || '0.0.0.0';

if (isDirectExecution) {
  server.listen(PORT, HOST, () => {
    console.log(`TypeVitae Enterprise Server listening at http://${HOST}:${PORT}`);
  });
}

export {
  server,
  PRESETS,
  PORT,
  reapBuildCache,
  reaperTimer,
  CACHE_REAPER_INTERVAL_MS,
  CACHE_MAX_AGE_MS
};
export default server;
