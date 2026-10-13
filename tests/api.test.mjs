/**
 * TypeVitae - HTTP Server & API Integration Test Suite
 * Native Node.js Test Runner (node:test)
 * 
 * Verifies:
 * - GET /api/presets
 * - GET /api/profiles
 * - GET /api/profile
 * - POST /api/profile
 * - POST /api/compile
 * - GET /api/pdf
 * - Static UI & Asset endpoints
 * - CORS preflight and error diagnostics
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { server, reapBuildCache } from '../server.mjs';

const PROFILES_DIR = path.resolve('data/profiles');
const ACTIVE_PROFILE_PATH = path.join(PROFILES_DIR, 'active.json');
const DEFAULT_PROFILE_PATH = path.join(PROFILES_DIR, 'default_nafis.json');

let baseUrl;
let originalActiveContent = null;
const TEMP_PROFILE_ID = 'test_integration_qa';
const TEMP_PROFILE_PATH = path.join(PROFILES_DIR, `${TEMP_PROFILE_ID}.json`);

before(async () => {
  // Preserve original active.json to prevent test side-effects
  if (fs.existsSync(ACTIVE_PROFILE_PATH)) {
    originalActiveContent = fs.readFileSync(ACTIVE_PROFILE_PATH, 'utf-8');
  }

  // Bind to dynamic ephemeral port 0 to prevent port collisions
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  // Restore original active.json
  if (originalActiveContent !== null) {
    fs.writeFileSync(ACTIVE_PROFILE_PATH, originalActiveContent, 'utf-8');
  }
  // Clean up temporary test files
  if (fs.existsSync(TEMP_PROFILE_PATH)) {
    try { fs.unlinkSync(TEMP_PROFILE_PATH); } catch { /* ignore */ }
  }

  await new Promise((resolve) => server.close(resolve));
});

describe('HTTP API - Presets & Profile Discovery', () => {
  it('GET /api/presets returns all valid preset configurations', async () => {
    const res = await fetch(`${baseUrl}/api/presets`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));

    const presets = await res.json();
    assert.ok(presets.master, 'Presets should include "master"');
    assert.ok(presets.industry, 'Presets should include "industry"');
    assert.ok(presets.academic, 'Presets should include "academic"');
    assert.ok(presets.compact, 'Presets should include "compact"');

    assert.equal(presets.master.name, 'Full Master (Comprehensive)');
    assert.ok(Array.isArray(presets.master.enabledSections));
  });

  it('GET /api/profiles returns list of profiles with starter_template as default activeId', async () => {
    const res = await fetch(`${baseUrl}/api/profiles`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));

    const data = await res.json();
    assert.ok(Array.isArray(data.profiles));
    assert.equal(data.activeId, 'starter_template');

    const starterProf = data.profiles.find(p => p.id === 'starter_template');
    assert.ok(starterProf, 'starter_template profile must be present in profile list');
    assert.equal(starterProf.name, 'Alex Morgan');

    const defaultProf = data.profiles.find(p => p.id === 'default_nafis');
    assert.ok(defaultProf, 'default_nafis profile must be present on local test host');
    assert.equal(defaultProf.name, 'Md Nafis Walid');
  });

  it('GET /api/profile?id=starter_template returns full starter profile schema object', async () => {
    const res = await fetch(`${baseUrl}/api/profile?id=starter_template`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));

    const profile = await res.json();
    assert.ok(profile.header);
    assert.equal(profile.header.name, 'Alex Morgan');
    assert.ok(Array.isArray(profile.sections));
    assert.ok(profile.sections.length > 5);
  });

  it('GET /api/profile?id=default_nafis returns full personal profile schema object', async () => {
    const res = await fetch(`${baseUrl}/api/profile?id=default_nafis`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));

    const profile = await res.json();
    assert.ok(profile.header);
    assert.equal(profile.header.name, 'Md Nafis Walid');
    assert.ok(Array.isArray(profile.sections));
    assert.ok(profile.sections.length > 5);
  });
});

describe('HTTP API - Profile State Mutation (CRUD)', () => {
  it('POST /api/profile creates a new profile and persists it', async () => {
    const payload = {
      header: {
        name: 'Automated QA Engineer',
        email: 'qa@typevitae.internal',
        phone: '+1-555-0100',
        includePhoto: false
      },
      activePreset: 'compact',
      sections: [
        {
          id: 'career_objective',
          title: 'Career Objective',
          enabled: true,
          type: 'text',
          text: 'Architecting zero-defect test systems.'
        }
      ]
    };

    const postRes = await fetch(`${baseUrl}/api/profile?id=${TEMP_PROFILE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(postRes.status, 200);
    const postData = await postRes.json();
    assert.equal(postData.success, true);
    assert.ok(fs.existsSync(TEMP_PROFILE_PATH), 'File should be written to data/profiles/');

    // Fetch the saved profile back
    const getRes = await fetch(`${baseUrl}/api/profile?id=${TEMP_PROFILE_ID}`);
    assert.equal(getRes.status, 200);
    const saved = await getRes.json();
    assert.equal(saved.header.name, 'Automated QA Engineer');
    assert.equal(saved.header.email, 'qa@typevitae.internal');
  });
});

describe('HTTP API - LaTeX Compilation Pipeline & PDF Delivery', () => {
  let lastBuildId;

  it('POST /api/compile compiles profile to PDF successfully with isolated buildId', async () => {
    const sampleProfile = JSON.parse(fs.readFileSync(DEFAULT_PROFILE_PATH, 'utf-8'));

    const res = await fetch(`${baseUrl}/api/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleProfile)
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));

    const data = await res.json();
    assert.equal(data.success, true, `Compilation failed: ${data.error}`);
    assert.ok(data.buildId, 'Result must contain unique buildId');
    assert.equal(data.pdfUrl, `/api/pdf?id=${data.buildId}`, 'Result pdfUrl must reference buildId');
    assert.ok(data.pdfPath);
    assert.ok(data.pdfSize > 50000, `PDF size must be > 50KB, got ${data.pdfSize}`);
    assert.ok(data.durationMs >= 0);
    assert.ok(data.pageCount >= 1);
    lastBuildId = data.buildId;
  });

  it('POST /api/compile accepts client-provided sessionId / buildId', async () => {
    const sampleProfile = JSON.parse(fs.readFileSync(DEFAULT_PROFILE_PATH, 'utf-8'));
    const customBuildId = 'build_custom_qa_session_999';

    const res = await fetch(`${baseUrl}/api/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sampleProfile, buildId: customBuildId })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.buildId, customBuildId);
    assert.equal(data.pdfUrl, `/api/pdf?id=${customBuildId}`);
    assert.ok(fs.existsSync(path.resolve(`build_cache/${customBuildId}.pdf`)));
  });

  it('GET /api/pdf streams fallback binary PDF without id parameter', async () => {
    const res = await fetch(`${baseUrl}/api/pdf`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/pdf'));
    assert.equal(res.headers.get('access-control-allow-origin'), '*');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    assert.ok(buffer.length > 50000, `PDF payload should be > 50KB, got ${buffer.length}`);
    const magicHeader = buffer.subarray(0, 4).toString('utf-8');
    assert.equal(magicHeader, '%PDF', 'PDF stream must start with %PDF magic header');
  });

  it('GET /api/pdf?id=... streams isolated binary PDF for specific buildId', async () => {
    assert.ok(lastBuildId, 'lastBuildId must be defined');
    const res = await fetch(`${baseUrl}/api/pdf?id=${lastBuildId}`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/pdf'));
    assert.equal(res.headers.get('access-control-allow-origin'), '*');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    assert.ok(buffer.length > 50000);
    const magicHeader = buffer.subarray(0, 4).toString('utf-8');
    assert.equal(magicHeader, '%PDF');
  });

  it('GET /api/pdf protects against directory traversal attacks', async () => {
    const res = await fetch(`${baseUrl}/api/pdf?id=../../../../etc/passwd`);
    assert.equal(res.status, 404);
  });

  it('POST /api/open-system has been removed and returns 404 Not Found', async () => {
    const res = await fetch(`${baseUrl}/api/open-system`, { method: 'POST' });
    assert.equal(res.status, 404);
  });
});

describe('HTTP API - Static Assets, CORS & Edge Cases', () => {
  it('GET / serves index.html web UI with 200 OK', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('TypeVitae'));
  });

  it('GET /public/styles.css serves CSS stylesheet', async () => {
    const res = await fetch(`${baseUrl}/public/styles.css`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/css'));
  });

  it('GET /public/app.js serves frontend application script', async () => {
    const res = await fetch(`${baseUrl}/public/app.js`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/javascript'));
  });

  it('OPTIONS /api/compile handles CORS preflight with 204 No Content', async () => {
    const res = await fetch(`${baseUrl}/api/compile`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST'
      }
    });

    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  });

  it('GET /api/nonexistent-route returns 404 Not Found', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent-route`);
    assert.equal(res.status, 404);
  });
});

describe('Automated Cache Reaper - Retention & Cleanup', () => {
  it('purges temp build files older than 1 hour while preserving .gitkeep, templates, and active.json', () => {
    const cacheDir = path.resolve('build_cache');
    const oldTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago

    // Create preserved files
    const gitkeepFile = path.join(cacheDir, '.gitkeep');
    if (!fs.existsSync(gitkeepFile)) fs.writeFileSync(gitkeepFile, '', 'utf-8');
    fs.utimesSync(gitkeepFile, oldTime / 1000, oldTime / 1000);

    const styFile = path.join(cacheDir, 'typevitae.sty');
    if (fs.existsSync(styFile)) fs.utimesSync(styFile, oldTime / 1000, oldTime / 1000);

    const activeJsonFile = path.join(cacheDir, 'active.json');
    fs.writeFileSync(activeJsonFile, '{"preserved": true}', 'utf-8');
    fs.utimesSync(activeJsonFile, oldTime / 1000, oldTime / 1000);

    // Create expired temp build files
    const oldTempFile1 = path.join(cacheDir, 'build_test_reaper_old.pdf');
    fs.writeFileSync(oldTempFile1, '%PDF dummy', 'utf-8');
    fs.utimesSync(oldTempFile1, oldTime / 1000, oldTime / 1000);

    const oldTempFile2 = path.join(cacheDir, 'build_test_reaper_old.tex');
    fs.writeFileSync(oldTempFile2, '\\documentclass{article}', 'utf-8');
    fs.utimesSync(oldTempFile2, oldTime / 1000, oldTime / 1000);

    // Create a fresh temp file (< 1 hour)
    const freshTempFile = path.join(cacheDir, 'build_test_reaper_fresh.pdf');
    fs.writeFileSync(freshTempFile, '%PDF fresh', 'utf-8');

    // Run reaper
    const purged = reapBuildCache(cacheDir, 60 * 60 * 1000);
    assert.ok(purged >= 2, `Expected at least 2 purged files, got ${purged}`);

    // Verify expired files deleted
    assert.equal(fs.existsSync(oldTempFile1), false, 'Old build PDF should be deleted');
    assert.equal(fs.existsSync(oldTempFile2), false, 'Old build TeX should be deleted');

    // Verify fresh file preserved
    assert.equal(fs.existsSync(freshTempFile), true, 'Fresh build PDF should be retained');
    fs.unlinkSync(freshTempFile);

    // Verify preserved files remain
    assert.equal(fs.existsSync(gitkeepFile), true, '.gitkeep must be preserved');
    if (fs.existsSync(styFile)) {
      assert.equal(fs.existsSync(styFile), true, 'typevitae.sty must be preserved');
    }
    assert.equal(fs.existsSync(activeJsonFile), true, 'active.json must be preserved');
    fs.unlinkSync(activeJsonFile);
  });
});

