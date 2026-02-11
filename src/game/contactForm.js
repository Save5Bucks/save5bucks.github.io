/**
 * Contact Form Handler — sends form data + full ship card via Google Apps Script
 *
 * Setup (one-time):
 *   1. Go to https://script.google.com  (sign in with tim.e.flinn@gmail.com)
 *   2. Create a new project, paste the Apps Script code from google-apps-script.js
 *   3. Deploy → New Deployment → Web App
 *        • Execute as: Me
 *        • Who has access: Anyone
 *   4. Copy the Web App URL and paste it into APPS_SCRIPT_URL below.
 */

import { loadCharacter, xpForLevel } from './saveSystem.js';

// ── Google Apps Script Web App URL (fill this in) ───────
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxU585kO4gwWoMGfISPMkRbdkjC1GF_UihtCeKGiB9qYIMq5vIEQc7cjqh89HxoKWQF_Q/exec';

/**
 * Build a text summary of the player's entire ship card
 */
function buildShipCardText() {
  const char = loadCharacter();
  if (!char) return '(No character data — visitor has not created a pilot)';

  const allSectors = ['home', 'about', 'services', 'software', 'portfolio', 'contact'];
  const explored = char.sectorsExplored || ['home'];
  const level = char.level || 1;
  const xp = char.xp || 0;

  const formatClass = (cls) => {
    if (cls === 'homeowner') return 'Home Owner';
    if (cls === 'businessowner') return 'Business Owner';
    if (cls === 'serverowner') return 'Server Owner';
    return cls || '—';
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return [
    '═══════════════════════════════════',
    '   STARSHIP CONSOLE — PILOT DATA',
    '═══════════════════════════════════',
    '',
    '── PILOT PROFILE ──',
    `  Name:     ${char.name || '—'}`,
    `  Race:     ${(char.race || '—').toUpperCase()}`,
    `  Class:    ${formatClass(char.class)}`,
    `  Gender:   ${(char.gender || '—').toUpperCase()}`,
    '',
    '── EXPLORATION LOG ──',
    `  Sectors Explored:  ${explored.length} / ${allSectors.length}`,
    `  Discovered:        ${explored.map(s => s.toUpperCase()).join(', ')}`,
    `  Total Jumps:       ${char.visits || 1}`,
    `  First Voyage:      ${formatDate(char.createdAt)}`,
    `  Last Seen:         ${formatDate(char.lastVisit || char.createdAt)}`,
    '',
    '── COMBAT & PROGRESSION ──',
    `  Level:             ${level}`,
    `  XP:                ${xp} / ${xpForLevel(level)}`,
    `  Stat Points:       ${char.statPoints || 0}`,
    `  Combat Kills:      ${char.combatKills || 0}`,
    `  Quests Completed:  ${char.questsCompleted || 0}`,
    '',
    '── WEAPON SYSTEMS ──',
    `  Gun Damage:   ${char.gunDamage || 1}`,
    `  Fire Rate:    ${char.gunSpeed || 1}`,
    '═══════════════════════════════════',
  ].join('\n');
}

/**
 * Attach submit handler to the contact form.
 * Call this after the contact page HTML is injected into the DOM.
 */
export function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  // Avoid double-binding
  if (form.dataset.bound) return;
  form.dataset.bound = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('.form-submit');
    const inputs = form.querySelectorAll('.form-input');
    const name = inputs[0]?.value.trim();
    const email = inputs[1]?.value.trim();
    const message = form.querySelector('.form-textarea')?.value.trim();

    if (!name || !email || !message) {
      showFormStatus(form, 'Please fill in all fields.', false);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'TRANSMITTING...';

    try {
      const shipCard = buildShipCardText();

      const payload = JSON.stringify({
        name,
        email,
        message,
        shipCard,
      });

      // Google Apps Script redirects on POST, so we encode payload as a query param
      // and use doGet on the server side for reliable cross-origin delivery
      const url = APPS_SCRIPT_URL + '?payload=' + encodeURIComponent(payload);

      await fetch(url, { mode: 'no-cors' });

      showFormStatus(form, 'TRANSMISSION RECEIVED — Message sent successfully!', true);
      inputs.forEach(i => (i.value = ''));
      form.querySelector('.form-textarea').value = '';
    } catch (err) {
      console.error('Contact form error:', err);
      showFormStatus(form, 'TRANSMISSION FAILED — Please try again later.', false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'TRANSMIT MESSAGE';
    }
  });
}

/**
 * Show a status message below the form
 */
function showFormStatus(form, msg, success) {
  let status = form.querySelector('.form-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'form-status';
    form.appendChild(status);
  }
  status.textContent = msg;
  status.className = 'form-status ' + (success ? 'form-status-success' : 'form-status-error');

  // Fade out after 5s
  setTimeout(() => {
    status.style.opacity = '0';
    setTimeout(() => status.remove(), 500);
  }, 5000);
}
