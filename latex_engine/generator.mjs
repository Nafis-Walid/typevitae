/**
 * TypeVitae - LaTeX Engine: Modular Generator
 * 
 * Generates production-grade, ATS-optimized LaTeX documents from profile data.
 * Supports:
 * - Multiple templates (Modern Sans, Classic Serif, Compact 1-Page, Master Full)
 * - Photo toggle (\cvheaderwithphoto vs \cvheader)
 * - Presets (Full Master, Industry 2-Page, Academic 2-Page, Compact 1-Page)
 * - Dynamic custom section injection
 * - ATS semantic tagging and Unicode glyph mapping
 * 
 * Zero external dependencies. Pure Node.js ES Module.
 */

import fs from 'node:fs';
import path from 'node:path';
import { sanitizeLatex } from './sanitizer.mjs';

/**
 * Standard Presets aligned with TypeVitae architecture
 */
export const PRESETS = {
  master: {
    id: 'master',
    name: 'Full Master (Comprehensive)',
    description: 'All experience, publications, teaching, projects, and skills (3-4 pages)',
    enabledSections: [
      'career_objective', 'education', 'research_interests', 'publications',
      'experience', 'projects', 'teaching', 'skills', 'awards', 'volunteer', 'references'
    ],
    objectiveProfiles: [
      'Embedded Software Engineering (Industry)',
      'Academic & Higher Education (Lecturer in CSE)',
      'Hardware Systems & Processor Architecture (VLSI)',
      'Human-Computer Interaction (HCI & Social Impact)'
    ]
  },
  industry: {
    id: 'industry',
    name: 'Industry SWE / Embedded (2-Page)',
    description: 'Focused on Firmware, Networking, C/C++, Systems Projects & Core Skills',
    enabledSections: ['career_objective', 'education', 'experience', 'projects', 'skills', 'awards'],
    objectiveProfiles: [
      'Embedded Software Engineering (Industry)',
      'Hardware Systems & Processor Architecture (VLSI)'
    ]
  },
  academic: {
    id: 'academic',
    name: 'Academic / Faculty (2-Page)',
    description: 'Focused on Teaching, Research, Publications, and Academic Background',
    enabledSections: [
      'career_objective', 'education', 'research_interests', 'publications',
      'teaching', 'skills', 'references'
    ],
    objectiveProfiles: [
      'Academic & Higher Education (Lecturer in CSE)',
      'Human-Computer Interaction (HCI & Social Impact)'
    ]
  },
  compact: {
    id: 'compact',
    name: 'Compact Executive (1-Page)',
    description: 'High-density 1-page resume with essential credentials and recent role',
    enabledSections: ['career_objective', 'education', 'experience', 'projects', 'skills'],
    objectiveProfiles: [
      'Embedded Software Engineering (Industry)'
    ],
    limits: {
      maxDegreeItems: 2,
      maxExperienceItems: 1,
      maxExperienceBullets: 4,
      maxProjectItems: 3,
      maxProjectBullets: 2
    }
  }
};

/**
 * Typographic template configurations
 */
export const TEMPLATES = {
  modern: {
    id: 'modern',
    name: 'Modern Sans',
    fontFamily: '\\renewcommand{\\familydefault}{\\sfdefault}',
    geometry: '\\geometry{top=1.3cm, bottom=1.3cm, left=1.2cm, right=1.2cm}',
    extraPreamble: ''
  },
  classic: {
    id: 'classic',
    name: 'Classic Serif',
    fontFamily: '\\renewcommand{\\familydefault}{\\rmdefault}',
    geometry: '\\geometry{top=1.5cm, bottom=1.5cm, left=1.3cm, right=1.3cm}',
    extraPreamble: ''
  },
  compact: {
    id: 'compact',
    name: 'Compact 1-Page',
    fontFamily: '\\renewcommand{\\familydefault}{\\sfdefault}',
    geometry: '\\geometry{top=0.8cm, bottom=0.8cm, left=1.0cm, right=1.0cm}',
    extraPreamble: `
\\titlespacing{\\section}{0pt}{-1.0em}{-1.2em}
\\setlength{\\parskip}{0pt}
`
  },
  master: {
    id: 'master',
    name: 'Master Full',
    fontFamily: '\\renewcommand{\\familydefault}{\\sfdefault}',
    geometry: '\\geometry{top=1.5cm, bottom=1.5cm, left=1.2cm, right=1.2cm}',
    extraPreamble: `
\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\cfoot{\\footnotesize\\thepage}
`
  }
};

/**
 * Normalizes template key.
 */
function normalizeTemplateKey(key) {
  if (!key) return 'modern';
  const norm = String(key).toLowerCase().replace(/[\s\-_]+/g, '');
  if (norm.includes('classic') || norm.includes('serif')) return 'classic';
  if (norm.includes('compact') || norm.includes('1page')) return 'compact';
  if (norm.includes('master') || norm.includes('full')) return 'master';
  return 'modern';
}

/**
 * Normalizes preset key.
 */
function normalizePresetKey(key) {
  if (!key) return 'master';
  const norm = String(key).toLowerCase().replace(/[\s\-_]+/g, '');
  if (norm.includes('indus')) return 'industry';
  if (norm.includes('acad') || norm.includes('fac')) return 'academic';
  if (norm.includes('comp') || norm.includes('1page')) return 'compact';
  return 'master';
}

/**
 * Generates ATS-friendly PDF metadata.
 */
function generatePdfMetadata(header) {
  const name = sanitizeLatex(header?.name || 'Curriculum Vitae');
  return `
% ATS / PDF Semantic Tagging & Metadata
\\hypersetup{
  pdftitle={${name} - Curriculum Vitae},
  pdfauthor={${name}},
  pdfsubject={Curriculum Vitae / Professional Resume},
  pdfkeywords={Curriculum Vitae, Resume, Engineering, Professional Experience},
  pdfcreator={TypeVitae Monochrome Operating System},
  pdfproducer={pdfTeX TeX Live},
  hidelinks
}
`;
}

/**
 * Generates the CV header with optional photo.
 */
function generateHeader(header, options = {}) {
  const name = sanitizeLatex(header?.name || 'Applicant Name');
  const includePhoto = options.includePhoto !== undefined
    ? options.includePhoto
    : (header?.includePhoto === true);

  const photoPath = options.photoPath || header?.photoPath || 'photo.png';
  // Ensure photo path uses forward slashes for TeX
  const normalizedPhotoPath = String(photoPath).replace(/\\/g, '/');

  // Contact info
  const addressText = header?.address ? `\\faMapMarker*\\ ${sanitizeLatex(header.address)}` : '';
  const emailText = header?.email
    ? `\\faEnvelope\\ \\href{mailto:${header.email}}{${sanitizeLatex(header.email)}}`
    : '';
  const phoneText = header?.phone
    ? `\\faPhone\\ ${sanitizeLatex(header.phone)}`
    : '';

  // Social / Web links
  const links = [];
  if (header?.linkedin) {
    const label = sanitizeLatex(header.linkedinLabel || 'LinkedIn');
    links.push(`\\faLinkedin\\ \\href{${header.linkedin}}{${label}}`);
  }
  if (header?.github) {
    const label = sanitizeLatex(header.githubLabel || 'GitHub');
    links.push(`\\faGithub\\ \\href{${header.github}}{${label}}`);
  }
  if (header?.website) {
    const label = sanitizeLatex(header.websiteLabel || 'Portfolio');
    links.push(`\\faGlobe\\ \\href{${header.website}}{${label}}`);
  }
  const linksText = links.join(' \\quad ');

  let code = '% ATS:SECTION:CONTACT_HEADER\n';
  if (includePhoto) {
    code += `\\cvheaderwithphoto{${name}}{${addressText}}{${emailText}}{${phoneText}}{${linksText}}{${normalizedPhotoPath}}\n`;
  } else {
    code += `\\cvheader{${name}}{${addressText}}{${emailText}}{${phoneText}}{${linksText}}\n`;
  }

  return code;
}

/**
 * Generates Career Objectives section.
 */
function generateProfilesSection(section, presetConfig) {
  const title = sanitizeLatex(section.title || 'Career Objective');
  const profiles = section.profiles || [];

  // Filter profiles based on preset objectiveProfiles whitelist
  let activeProfiles = profiles.filter(p => p.enabled !== false);
  if (presetConfig?.objectiveProfiles && presetConfig.objectiveProfiles.length > 0) {
    activeProfiles = activeProfiles.filter(p => presetConfig.objectiveProfiles.includes(p.name));
  }

  if (activeProfiles.length === 0 && profiles.length > 0) {
    activeProfiles = [profiles[0]];
  }

  let body = '';
  if (activeProfiles.length === 1) {
    body = `\\carrObj{\n${sanitizeLatex(activeProfiles[0].text)}\n}\n`;
  } else {
    const formatted = activeProfiles.map(p => {
      const pName = sanitizeLatex(p.name);
      const pText = sanitizeLatex(p.text);
      return `\\textbf{${pName}:} ${pText}`;
    }).join(' \\\\[4pt]\n');
    body = `\\carrObj{\n${formatted}\n}\n`;
  }

  return `
% ATS:SECTION:CAREER_OBJECTIVE
\\section{${title}}
${body}
`;
}

/**
 * Generates Education section.
 */
function generateEducationSection(section, presetConfig) {
  const title = sanitizeLatex(section.title || 'Educational Qualification');
  let items = (section.items || []).filter(it => it.enabled !== false);

  if (presetConfig?.limits?.maxDegreeItems) {
    items = items.slice(0, presetConfig.limits.maxDegreeItems);
  }

  const itemsCode = items.map(it => {
    const degree = sanitizeLatex(it.degree || '');
    const dates = sanitizeLatex(it.dates || '');
    const institution = sanitizeLatex(it.institution || '');
    const grade = sanitizeLatex(it.grade || '');
    return `\\edu{${degree}}{${dates}}{${institution}}{${grade}}`;
  }).join('\n');

  return `
% ATS:SECTION:EDUCATION
\\section{${title}}
${itemsCode}
`;
}

/**
 * Generates Research Interests or free-form text section.
 */
function generateTextSection(section) {
  const title = sanitizeLatex(section.title || 'Research Interests');
  const text = sanitizeLatex(section.text || '');

  const macro = section.id === 'research_interests' ? '\\researchInterest' : '\\carrObj';

  return `
% ATS:SECTION:${section.id.toUpperCase()}
\\section{${title}}
${macro}{${text}}
`;
}

/**
 * Generates Publications section.
 */
function generatePublicationsSection(section) {
  const title = sanitizeLatex(section.title || 'Research & Publications');
  const items = (section.items || []).filter(it => it.enabled !== false);

  const itemsCode = items.map(it => {
    let authors = sanitizeLatex(it.authors || '');
    if (it.highlightAuthor) {
      const hlSanitized = sanitizeLatex(it.highlightAuthor);
      if (authors.includes(hlSanitized)) {
        authors = authors.replace(hlSanitized, `\\textbf{${hlSanitized}}`);
      }
    }

    const pubTitle = sanitizeLatex(it.title || '');
    const venue = sanitizeLatex(it.venue || '');
    const year = sanitizeLatex(it.year || '');
    const note = it.url
      ? `\\href{${it.url}}{[Link]}`
      : sanitizeLatex(it.note || it.doi || '');

    return `  \\publicationItem{${authors}}{${pubTitle}}{${venue}}{${year}}{${note}}`;
  }).join('\n');

  return `
% ATS:SECTION:PUBLICATIONS
\\section{${title}}
\\publication{Conference Papers}{
${itemsCode}
}
`;
}

/**
 * Generates Experience section.
 */
function generateExperienceSection(section, presetConfig) {
  const title = sanitizeLatex(section.title || 'Professional Experience');
  let items = (section.items || []).filter(it => it.enabled !== false);

  if (presetConfig?.limits?.maxExperienceItems) {
    items = items.slice(0, presetConfig.limits.maxExperienceItems);
  }

  const itemsCode = items.map(it => {
    const role = sanitizeLatex(it.role || '');
    const company = sanitizeLatex(it.company || '');
    const dates = sanitizeLatex(it.dates || '');

    let bullets = (it.bullets || []).filter(b => b);
    if (presetConfig?.limits?.maxExperienceBullets) {
      bullets = bullets.slice(0, presetConfig.limits.maxExperienceBullets);
    }

    const bulletsCode = bullets
      .map(b => `    \\item ${sanitizeLatex(b)}`)
      .join('\n');

    return `\\profExp{${role}}{${company}}{${dates}}{\n${bulletsCode}\n}`;
  }).join('\n\\vspace{4pt}\n');

  return `
% ATS:SECTION:EXPERIENCE
\\section{${title}}
${itemsCode}
`;
}

/**
 * Generates Projects section.
 */
function generateProjectsSection(section, presetConfig) {
  const title = sanitizeLatex(section.title || 'Projects');
  let items = (section.items || []).filter(it => it.enabled !== false);

  if (presetConfig?.limits?.maxProjectItems) {
    items = items.slice(0, presetConfig.limits.maxProjectItems);
  }

  const itemsCode = items.map(it => {
    const name = sanitizeLatex(it.name || '');
    const url = it.url || '';

    let bullets = (it.bullets || []).filter(b => b);
    if (presetConfig?.limits?.maxProjectBullets) {
      bullets = bullets.slice(0, presetConfig.limits.maxProjectBullets);
    }

    const bulletsCode = bullets
      .map(b => `    \\item ${sanitizeLatex(b)}`)
      .join('\n');

    return `\\project{${name}}{${url}}{\n${bulletsCode}\n}`;
  }).join('\n\\vspace{4pt}\n');

  return `
% ATS:SECTION:PROJECTS
\\section{${title}}
${itemsCode}
`;
}

/**
 * Generates Teaching Experience section.
 */
function generateTeachingSection(section) {
  const title = sanitizeLatex(section.title || 'Teaching Experience');
  const items = (section.items || []).filter(it => it.enabled !== false);

  const itemsCode = items.map(it => {
    const role = sanitizeLatex(it.role || '');
    const institution = sanitizeLatex(it.institution || '');
    const dates = sanitizeLatex(it.dates || '');

    const bulletsCode = (it.bullets || [])
      .map(b => `    \\item ${sanitizeLatex(b)}`)
      .join('\n');

    return `\\teachExp{${role}}{${institution}}{${dates}}{\n${bulletsCode}\n}`;
  }).join('\n\\vspace{4pt}\n');

  return `
% ATS:SECTION:TEACHING
\\section{${title}}
${itemsCode}
`;
}

/**
 * Generates Skills section.
 */
function generateSkillsSection(section) {
  const title = sanitizeLatex(section.title || 'Skills');
  const categories = section.categories || [];

  const catCode = categories.map(cat => {
    const catTitle = sanitizeLatex(cat.title || '');
    const itemsCode = (cat.items || []).map(it => {
      const label = sanitizeLatex(it.label || '');
      const val = sanitizeLatex(it.value || '');
      if (it.url) {
        return `  \\item \\textbf{${label}:} \\href{${it.url}}{${val}}`;
      }
      return `  \\item \\textbf{${label}:} ${val}`;
    }).join('\n');

    return `\\skills{${catTitle}}{\n${itemsCode}\n}`;
  }).join('\n\\vspace{4pt}\n');

  return `
% ATS:SECTION:SKILLS
\\section{${title}}
${catCode}
`;
}

/**
 * Generates Awards section.
 */
function generateAwardsSection(section) {
  const title = sanitizeLatex(section.title || 'Achievements & Awards');
  const items = (section.items || []).filter(it => it.enabled !== false);

  const itemsCode = items.map(it => {
    const awardTitle = sanitizeLatex(it.title || '');
    const org = sanitizeLatex(it.organization || '');
    const bulletsCode = (it.bullets || [])
      .map(b => `    \\item ${sanitizeLatex(b)}`)
      .join('\n');

    return `\\award{${awardTitle}}{${org}}{\n${bulletsCode}\n}`;
  }).join('\n\\vspace{4pt}\n');

  return `
% ATS:SECTION:AWARDS
\\section{${title}}
${itemsCode}
`;
}

/**
 * Generates Volunteer Activities section.
 */
function generateVolunteerSection(section) {
  const title = sanitizeLatex(section.title || 'Volunteer Activities');
  const items = (section.items || []).filter(it => it.enabled !== false);

  const itemsCode = items.map(it => {
    const role = sanitizeLatex(it.role || '');
    const dates = sanitizeLatex(it.dates || '');
    const bulletsCode = (it.bullets || [])
      .map(b => `    \\item ${sanitizeLatex(b)}`)
      .join('\n');

    return `\\activity{${role}}{${dates}}{\n${bulletsCode}\n}`;
  }).join('\n\\vspace{4pt}\n');

  return `
% ATS:SECTION:VOLUNTEER
\\section{${title}}
${itemsCode}
`;
}

/**
 * Generates arbitrary or custom user sections.
 */
function generateCustomSection(section) {
  const title = sanitizeLatex(section.title || 'Additional Information');

  if (section.text) {
    return `
% ATS:SECTION:CUSTOM_${(section.id || 'SECTION').toUpperCase()}
\\section{${title}}
\\carrObj{${sanitizeLatex(section.text)}}
`;
  }

  if (section.items && Array.isArray(section.items)) {
    const itemsCode = section.items.map(it => {
      if (typeof it === 'string') {
        return `\\item ${sanitizeLatex(it)}`;
      }
      const itemTitle = sanitizeLatex(it.title || it.name || it.role || '');
      const subtitle = sanitizeLatex(it.subtitle || it.organization || it.institution || it.issuer || '');
      const dates = sanitizeLatex(it.dates || it.date || '');
      const bullets = (it.bullets || []).map(b => `    \\item ${sanitizeLatex(b)}`).join('\n');

      return `
\\noindent
\\begin{tabular}[t]{p{\\textwidth}}
  \\textbf{${itemTitle}} ${subtitle ? `| ${subtitle}` : ''} \\hfill ${dates} \\\\
  \\vspace{-1.5em}
  \\begin{itemize}[label={-}, leftmargin=2em, itemsep=-0.2em]
${bullets}
  \\end{itemize}
\\end{tabular}
`;
    }).join('\n\\vspace{4pt}\n');

    return `
% ATS:SECTION:CUSTOM_${(section.id || 'SECTION').toUpperCase()}
\\section{${title}}
${itemsCode}
`;
  }

  return '';
}

/**
 * Dispatches a section to its respective generator based on section type.
 */
function generateSection(section, presetConfig) {
  if (section.enabled === false) return '';

  switch (section.type) {
    case 'profiles':
      return generateProfilesSection(section, presetConfig);
    case 'items_degree':
      return generateEducationSection(section, presetConfig);
    case 'text':
      return generateTextSection(section);
    case 'publications':
      return generatePublicationsSection(section);
    case 'experience':
      return generateExperienceSection(section, presetConfig);
    case 'projects':
      return generateProjectsSection(section, presetConfig);
    case 'teaching':
      return generateTeachingSection(section);
    case 'skills':
      return generateSkillsSection(section);
    case 'awards':
      return generateAwardsSection(section);
    case 'volunteer':
      return generateVolunteerSection(section);
    default:
      return generateCustomSection(section);
  }
}

/**
 * Loads a profile object from a JS object or a path to a JSON file.
 */
export function loadProfile(profileOrPath) {
  if (!profileOrPath) {
    const defaultPath = path.resolve('data/profiles/active.json');
    if (fs.existsSync(defaultPath)) {
      return JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
    }
    throw new Error(`Profile not specified and ${defaultPath} not found.`);
  }

  if (typeof profileOrPath === 'string') {
    if (fs.existsSync(profileOrPath)) {
      return JSON.parse(fs.readFileSync(profileOrPath, 'utf-8'));
    }
    try {
      return JSON.parse(profileOrPath);
    } catch {
      throw new Error(`Profile string is neither an existing file path nor valid JSON: ${profileOrPath}`);
    }
  }

  if (typeof profileOrPath === 'object') {
    return profileOrPath;
  }

  throw new Error('Invalid profile argument.');
}

/**
 * Main LaTeX Generator
 * 
 * @param {object|string} profileInput - Profile object or file path
 * @param {object} [options] - Generation options
 * @param {string} [options.template='modern'] - 'modern', 'classic', 'compact', 'master'
 * @param {string} [options.preset='master'] - 'master', 'industry', 'academic', 'compact'
 * @param {boolean} [options.includePhoto] - Force photo toggle on/off
 * @param {string} [options.photoPath] - Path to profile photo
 * @param {string} [options.styName='typevitae'] - LaTeX style package name
 * @param {Array<object>} [options.customSections] - Additional custom sections to inject
 * @param {Array<string>} [options.enabledSections] - Explicit list of section IDs to include
 * @returns {string} Generated full LaTeX document string
 */
export function generateLatex(profileInput, options = {}) {
  const profile = loadProfile(profileInput);

  const presetKey = normalizePresetKey(options.preset || profile.activePreset || 'master');
  const presetConfig = PRESETS[presetKey] || PRESETS.master;

  const templateKey = normalizeTemplateKey(options.template || 'modern');
  const templateConfig = TEMPLATES[templateKey] || TEMPLATES.modern;

  const styName = options.styName || 'typevitae';

  // Merge sections and custom injected sections
  let sections = [...(profile.sections || [])];
  if (Array.isArray(options.customSections)) {
    sections = sections.concat(options.customSections);
  }

  // Filter sections by preset or explicit options.enabledSections
  const customSectionIds = new Set(
    Array.isArray(options.customSections) ? options.customSections.map(s => s.id) : []
  );
  const allowedSectionIds = options.enabledSections || presetConfig.enabledSections;
  if (allowedSectionIds && Array.isArray(allowedSectionIds)) {
    const allowedSet = new Set(allowedSectionIds);
    sections = sections.filter(sec => (allowedSet.has(sec.id) || customSectionIds.has(sec.id)) && sec.enabled !== false);
  } else {
    sections = sections.filter(sec => sec.enabled !== false);
  }

  // Generate Document Parts
  const pdfMeta = generatePdfMetadata(profile.header);
  const headerCode = generateHeader(profile.header, options);

  const sectionsCode = sections
    .map(sec => generateSection(sec, presetConfig))
    .filter(code => code.trim().length > 0)
    .join('\n');

  const fullLatex = `% =========================================================================
% TypeVitae CV Operating System - Deterministic Typographic Document
% Template: ${templateConfig.name} | Preset: ${presetConfig.name}
% =========================================================================

\\documentclass[10pt,a4paper]{article}

% ATS-Friendly Glyphs & Unicode Mapping
\\input{glyphtounicode}
\\pdfgentounicode=1

% Core Typographic Style
\\usepackage{${styName}}

% Dynamic Template Settings
${templateConfig.geometry}
${templateConfig.fontFamily}
${templateConfig.extraPreamble}

${pdfMeta}

\\begin{document}

${headerCode}
${sectionsCode}

\\end{document}
`;

  return fullLatex;
}

export default generateLatex;
