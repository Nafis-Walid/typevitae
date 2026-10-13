import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4200;
const DATA_DIR = path.join(__dirname, 'data');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const PUBLIC_DIR = path.join(__dirname, 'public');
const CACHE_DIR = path.join(__dirname, 'build_cache');

if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

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
    const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json') && f !== 'active.json');
    const profiles = files.map(f => {
      const id = f.replace('.json', '');
      try {
        const d = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, f), 'utf-8'));
        return { id, name: d.header?.name || id, title: d.header?.email || '' };
      } catch {
        return { id, name: id, title: '' };
      }
    });
    return sendJson(res, 200, { profiles, activeId: 'default_nafis' });
  }

  // 5. API: Get Profile
  if (pathname === '/api/profile' && req.method === 'GET') {
    const profileId = urlObj.searchParams.get('id') || 'active';
    const filePath = path.join(PROFILES_DIR, `${profileId}.json`);
    const fallbackPath = path.join(PROFILES_DIR, 'active.json');
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
      const activePath = path.join(PROFILES_DIR, 'active.json');

      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.writeFileSync(activePath, JSON.stringify(data, null, 2), 'utf-8');

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 7. API: Compile to PDF
  if (pathname === '/api/compile' && req.method === 'POST') {
    try {
      let bodyData = await parseJsonBody(req);
      const activePath = path.join(PROFILES_DIR, 'active.json');
      if (Object.keys(bodyData).length > 0) {
        fs.writeFileSync(activePath, JSON.stringify(bodyData, null, 2), 'utf-8');
      } else if (fs.existsSync(activePath)) {
        bodyData = JSON.parse(fs.readFileSync(activePath, 'utf-8'));
      }

      // Dynamic import of compiler
      const compilerModule = await import(`./latex_engine/compiler.mjs?t=${Date.now()}`);
      const result = await compilerModule.compileProfile(bodyData, {
        outputDir: CACHE_DIR,
        templatesDir: path.join(__dirname, 'latex_engine/templates'),
        photoPath: path.join(DATA_DIR, 'photo.png')
      });

      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 8. API: Stream PDF
  if (pathname === '/api/pdf' && (req.method === 'GET' || req.method === 'HEAD')) {
    const pdfPath = path.join(CACHE_DIR, 'typevitae.pdf');
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

  // 9. API: Open in macOS System Viewer
  if (pathname === '/api/open-system' && req.method === 'POST') {
    const pdfPath = path.join(CACHE_DIR, 'typevitae.pdf');
    if (fs.existsSync(pdfPath)) {
      exec(`open "${pdfPath}"`, (err) => {
        if (err) return sendJson(res, 500, { error: err.message });
        return sendJson(res, 200, { success: true });
      });
    } else {
      return sendJson(res, 404, { error: 'PDF not found' });
    }
    return;
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

export { server, PRESETS, PORT };
export default server;
