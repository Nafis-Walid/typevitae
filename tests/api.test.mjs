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
import { server } from '../server.mjs';

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

  it('GET /api/profiles returns list of profiles with default_nafis', async () => {
    const res = await fetch(`${baseUrl}/api/profiles`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));

    const data = await res.json();
    assert.ok(Array.isArray(data.profiles));
    assert.equal(data.activeId, 'default_nafis');

    const defaultProf = data.profiles.find(p => p.id === 'default_nafis');
    assert.ok(defaultProf, 'default_nafis profile must be present in profile list');
    assert.equal(defaultProf.name, 'Md Nafis Walid');
  });

  it('GET /api/profile?id=default_nafis returns full profile schema object', async () => {
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
  it('POST /api/compile compiles profile to PDF successfully', async () => {
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
    assert.ok(data.pdfPath);
    assert.ok(data.pdfSize > 50000, `PDF size must be > 50KB, got ${data.pdfSize}`);
    assert.ok(data.durationMs >= 0);
    assert.ok(data.pageCount >= 1);
  });

  it('GET /api/pdf streams valid binary PDF with correct MIME and magic bytes', async () => {
    const res = await fetch(`${baseUrl}/api/pdf`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/pdf'));

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    assert.ok(buffer.length > 50000, `PDF payload should be > 50KB, got ${buffer.length}`);
    const magicHeader = buffer.subarray(0, 4).toString('utf-8');
    assert.equal(magicHeader, '%PDF', 'PDF stream must start with %PDF magic header');
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
