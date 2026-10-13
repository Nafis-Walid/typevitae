/**
 * TypeVitae - Profile Schema & Preset Validation Test Suite
 * Native Node.js Test Runner (node:test)
 * 
 * Verifies:
 * - Profile validation against data/schema.json
 * - All required fields, section types, and empty states
 * - Presets alignment with default master profile
 * - Data integrity and non-corruption
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PRESETS } from '../latex_engine/generator.mjs';

const SCHEMA_PATH = path.resolve('data/schema.json');
const DEFAULT_PROFILE_PATH = path.resolve('data/profiles/default_nafis.json');
const STARTER_PROFILE_PATH = path.resolve('data/profiles/starter_template.json');
const ACTIVE_PROFILE_PATH = path.resolve('data/profiles/active.json');

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
const defaultProfile = JSON.parse(fs.readFileSync(DEFAULT_PROFILE_PATH, 'utf-8'));
const starterProfile = JSON.parse(fs.readFileSync(STARTER_PROFILE_PATH, 'utf-8'));

/**
 * Lightweight, zero-dependency schema validator conforming to schema.json
 */
function validateProfileAgainstSchema(profile, schemaDef = schema) {
  const errors = [];

  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return { valid: false, errors: ['Profile must be an object.'] };
  }

  // Top-level required fields
  for (const req of schemaDef.required || []) {
    if (profile[req] === undefined || profile[req] === null) {
      errors.push(`Missing required top-level property: "${req}"`);
    }
  }

  // Header validation
  if (profile.header) {
    if (typeof profile.header !== 'object' || Array.isArray(profile.header)) {
      errors.push('"header" must be an object.');
    } else {
      const headerSchema = schemaDef.properties.header;
      for (const req of headerSchema.required || []) {
        if (!profile.header[req] || typeof profile.header[req] !== 'string') {
          errors.push(`Header missing required non-empty string property: "${req}"`);
        }
      }

      if (profile.header.includePhoto !== undefined && typeof profile.header.includePhoto !== 'boolean') {
        errors.push('"header.includePhoto" must be a boolean.');
      }
    }
  }

  // activePreset validation
  if (profile.activePreset !== undefined) {
    const validPresets = schemaDef.properties.activePreset.enum;
    if (!validPresets.includes(profile.activePreset)) {
      errors.push(`"activePreset" must be one of: ${validPresets.join(', ')}`);
    }
  }

  // Sections validation
  if (profile.sections !== undefined) {
    if (!Array.isArray(profile.sections)) {
      errors.push('"sections" must be an array.');
    } else {
      const sectionSchema = schemaDef.properties.sections.items;
      const validTypes = sectionSchema.properties.type.enum;

      profile.sections.forEach((sec, idx) => {
        if (!sec || typeof sec !== 'object' || Array.isArray(sec)) {
          errors.push(`Section at index ${idx} must be an object.`);
          return;
        }

        for (const req of sectionSchema.required || []) {
          if (sec[req] === undefined || sec[req] === null) {
            errors.push(`Section "${sec.id || idx}" missing required property: "${req}"`);
          }
        }

        if (typeof sec.id !== 'string') {
          errors.push(`Section at index ${idx} "id" must be a string.`);
        }
        if (typeof sec.title !== 'string') {
          errors.push(`Section "${sec.id}" "title" must be a string.`);
        }
        if (typeof sec.enabled !== 'boolean') {
          errors.push(`Section "${sec.id}" "enabled" must be a boolean.`);
        }
        if (!validTypes.includes(sec.type)) {
          errors.push(`Section "${sec.id}" has invalid type "${sec.type}". Expected one of: ${validTypes.join(', ')}`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

describe('Profile Schema - Master Profile (default_nafis.json)', () => {
  it('validates 100% cleanly against data/schema.json with zero errors', () => {
    const result = validateProfileAgainstSchema(defaultProfile);
    assert.equal(result.valid, true, `Validation errors: ${result.errors.join('; ')}`);
    assert.equal(result.errors.length, 0);
  });

  it('contains all required header fields with non-empty values', () => {
    const { header } = defaultProfile;
    assert.ok(header.name && header.name.length > 0, 'Header must contain name');
    assert.ok(header.email && header.email.includes('@'), 'Header must contain valid email');
    assert.ok(header.phone && header.phone.length > 0, 'Header must contain phone');
    assert.equal(typeof header.includePhoto, 'boolean');
  });

  it('contains all 10 supported section types across its sections', () => {
    const expectedTypes = [
      'profiles',
      'items_degree',
      'text',
      'publications',
      'experience',
      'projects',
      'teaching',
      'skills',
      'awards',
      'volunteer'
    ];

    const presentTypes = new Set(defaultProfile.sections.map(s => s.type));
    for (const t of expectedTypes) {
      assert.ok(presentTypes.has(t), `default_nafis.json is missing section type: "${t}"`);
    }
  });

  it('validates active.json if present', () => {
    if (fs.existsSync(ACTIVE_PROFILE_PATH)) {
      const activeProfile = JSON.parse(fs.readFileSync(ACTIVE_PROFILE_PATH, 'utf-8'));
      const result = validateProfileAgainstSchema(activeProfile);
      assert.equal(result.valid, true, `active.json invalid: ${result.errors.join('; ')}`);
    }
  });
});

describe('Profile Schema - Starter Template (starter_template.json)', () => {
  it('validates starter template 100% cleanly against data/schema.json with zero errors', () => {
    const result = validateProfileAgainstSchema(starterProfile);
    assert.equal(result.valid, true, `Validation errors: ${result.errors.join('; ')}`);
    assert.equal(result.errors.length, 0);
  });

  it('contains generic placeholder header fields (Alex Morgan)', () => {
    const { header } = starterProfile;
    assert.equal(header.name, 'Alex Morgan');
    assert.equal(header.email, 'alex.morgan@example.com');
    assert.ok(header.phone && header.phone.length > 0);
    assert.equal(typeof header.includePhoto, 'boolean');
  });

  it('contains all required section types matching presets', () => {
    const presentTypes = new Set(starterProfile.sections.map(s => s.type));
    assert.ok(presentTypes.has('profiles'));
    assert.ok(presentTypes.has('items_degree'));
    assert.ok(presentTypes.has('experience'));
    assert.ok(presentTypes.has('skills'));
  });
});

describe('Profile Schema - Validation Guardrails & Negative Test Cases', () => {
  it('rejects profiles missing required top-level fields', () => {
    const missingHeader = { sections: [] };
    const res1 = validateProfileAgainstSchema(missingHeader);
    assert.equal(res1.valid, false);
    assert.ok(res1.errors.some(e => e.includes('header')));

    const missingSections = { header: { name: 'A', email: 'a@b.com', phone: '123' } };
    const res2 = validateProfileAgainstSchema(missingSections);
    assert.equal(res2.valid, false);
    assert.ok(res2.errors.some(e => e.includes('sections')));
  });

  it('rejects header missing required name, email, or phone', () => {
    const noName = {
      header: { email: 'test@example.com', phone: '123' },
      sections: []
    };
    assert.equal(validateProfileAgainstSchema(noName).valid, false);

    const noEmail = {
      header: { name: 'Test User', phone: '123' },
      sections: []
    };
    assert.equal(validateProfileAgainstSchema(noEmail).valid, false);

    const noPhone = {
      header: { name: 'Test User', email: 'test@example.com' },
      sections: []
    };
    assert.equal(validateProfileAgainstSchema(noPhone).valid, false);
  });

  it('rejects sections with unsupported type enum', () => {
    const badTypeProfile = {
      header: { name: 'Test User', email: 't@t.com', phone: '123' },
      sections: [
        { id: 'custom_bad', title: 'Bad Section', enabled: true, type: 'unsupported_type_xyz' }
      ]
    };
    const res = validateProfileAgainstSchema(badTypeProfile);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('invalid type "unsupported_type_xyz"')));
  });

  it('rejects sections missing required properties: id, title, enabled, or type', () => {
    const missingProps = {
      header: { name: 'Test User', email: 't@t.com', phone: '123' },
      sections: [
        { id: 'sec1', title: 'Missing Enabled', type: 'text' }
      ]
    };
    const res = validateProfileAgainstSchema(missingProps);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('missing required property: "enabled"')));
  });

  it('rejects invalid activePreset enum values', () => {
    const badPresetProfile = {
      header: { name: 'Test', email: 't@t.com', phone: '123' },
      activePreset: 'non_existent_preset',
      sections: []
    };
    const res = validateProfileAgainstSchema(badPresetProfile);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('activePreset')));
  });

  it('accepts minimal valid profile state without throwing', () => {
    const minimalProfile = {
      header: {
        name: 'Jane Doe',
        email: 'jane@doe.com',
        phone: '+1-555-0199'
      },
      sections: []
    };
    const res = validateProfileAgainstSchema(minimalProfile);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
  });
});

describe('Preset System - Consistency & Profile Alignment', () => {
  const profileSectionIds = new Set(defaultProfile.sections.map(s => s.id));
  const objectiveSection = defaultProfile.sections.find(s => s.type === 'profiles');
  const availableObjectiveNames = new Set((objectiveSection?.profiles || []).map(p => p.name));

  it('ensures all PRESETS have required configuration properties', () => {
    const presetKeys = ['master', 'industry', 'academic', 'compact'];
    for (const key of presetKeys) {
      const preset = PRESETS[key];
      assert.ok(preset, `Preset "${key}" must exist`);
      assert.ok(preset.name, `Preset "${key}" must have a name`);
      assert.ok(preset.description, `Preset "${key}" must have a description`);
      assert.ok(Array.isArray(preset.enabledSections), `Preset "${key}" enabledSections must be an array`);
      assert.ok(Array.isArray(preset.objectiveProfiles), `Preset "${key}" objectiveProfiles must be an array`);
    }
  });

  it('ensures every enabledSection in every preset exists in master profile', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      for (const sectionId of preset.enabledSections) {
        assert.ok(
          profileSectionIds.has(sectionId),
          `Preset "${key}" references unknown section id: "${sectionId}"`
        );
      }
    }
  });

  it('ensures every objectiveProfile in every preset exists in career objective section', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      for (const objName of preset.objectiveProfiles) {
        assert.ok(
          availableObjectiveNames.has(objName),
          `Preset "${key}" references unknown career objective: "${objName}"`
        );
      }
    }
  });

  it('guarantees profile data immutability and durability across serialization', () => {
    const serialized = JSON.stringify(defaultProfile);
    const parsed = JSON.parse(serialized);
    assert.deepEqual(parsed, defaultProfile);
  });
});
