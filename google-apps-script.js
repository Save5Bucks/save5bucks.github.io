/**
 * GOOGLE APPS SCRIPT — Paste this into https://script.google.com
 *
 * This receives contact form submissions from flinnbuilt.com
 * and sends them to tim.e.flinn@gmail.com with the visitor's
 * full ship card data (character, XP, stats, weapons, etc.)
 *
 * Setup:
 *   1. Go to https://script.google.com
 *   2. Click "New Project"
 *   3. Delete the default code and paste THIS entire file
 *   4. Click Deploy → New Deployment
 *   5. Type = "Web App"
 *   6. Execute as: "Me"
 *   7. Who has access: "Anyone"
 *   8. Click Deploy → copy the URL
 *   9. Paste the URL into APPS_SCRIPT_URL in src/game/contactForm.js
 */

function doGet(e) {
  try {
    var data = JSON.parse(e.parameter.payload);

    var name = data.name || '(no name)';
    var email = data.email || '(no email)';
    var message = data.message || '(no message)';
    var shipCard = data.shipCard || '(no ship card data)';

    var subject = 'FlinnBuilt.com — New Message from ' + name;

    var body = 'FROM: ' + name + '\n'
             + 'EMAIL: ' + email + '\n'
             + '─────────────────────────────────\n\n'
             + 'MESSAGE:\n' + message + '\n\n'
             + '─────────────────────────────────\n\n'
             + 'VISITOR SHIP CARD:\n\n' + shipCard + '\n';

    GmailApp.sendEmail('tim.e.flinn@gmail.com', subject, body, {
      replyTo: email,
      name: 'FlinnBuilt Contact Form'
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
