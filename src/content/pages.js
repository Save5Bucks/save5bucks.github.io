/**
 * Page content for each section — rendered as HTML overlays
 * Uses the 3x3 triangle composition theory for layout
 */
export const pageContent = {
  home: `
    <div class="page home-page">
      <h1 class="glitch" data-text="FLINN BUILT">FLINN BUILT</h1>
      <p class="tagline">Construction. Code. Community. — Built to Last.</p>
      <div class="home-cta">
        <p class="explore-hint">Scroll or use navigation to explore</p>
        <div class="scroll-indicator">
        </div>
      </div>
    </div>
  `,

  about: `
    <div class="page about-page">
      <h2 class="section-title">ABOUT</h2>
      <div class="content-grid">
        <div class="content-block">
          <h3><i class="bi bi-person-badge"></i> Who I Am</h3>
          <p>I'm <strong>Tim Flinn</strong> — with over <strong>15 years in construction management</strong> and a degree in <strong>Computer Engineering from DeVry University</strong>, I've built a career bridging hands-on field experience with software and game development.</p>
        </div>
        <div class="content-block">
          <h3><i class="bi bi-hammer"></i> Construction Roots</h3>
          <p>From managing crews and budgets to project estimating and delivering residential &amp; commercial builds that stand the test of time — construction is where it all started. That discipline carries into everything I build.</p>
        </div>
        <div class="content-block">
          <h3><i class="bi bi-code-slash"></i> Tech &amp; Software</h3>
          <p>I specialize in <strong>business applications</strong>, <strong>mobile apps</strong> for iOS &amp; Android, <strong>game server hosting</strong>, and building tools that solve real problems. From backend systems to published apps — built with reliability and real users in mind.</p>
        </div>
        <div class="content-block">
          <h3><i class="bi bi-building"></i> Commercial Solutions</h3>
          <p><strong>Video surveillance</strong>, <strong>networking infrastructure</strong>, and <strong>commercial audio systems</strong> — I design and deploy integrated technology solutions for commercial spaces that keep businesses connected and secure.</p>
        </div>
        <div class="content-block">
          <h3><i class="bi bi-controller"></i> Gaming &amp; Community</h3>
          <p>Designing mods, scripting features, and running <strong>multiplayer game servers</strong> — building communities that keep players engaged and connected across the digital frontier.</p>
        </div>
        <div class="content-block">
          <h3><i class="bi bi-bullseye"></i> The Mission</h3>
          <p>To build solutions — physical and digital — that aren't just functional, but <strong>genuinely unforgettable</strong>. Whether it's a building, an app, or a server, if it has my name on it, it's built to last.</p>
        </div>
      </div>
    </div>
  `,

  services: `
    <div class="page services-page">
      <h2 class="section-title">SERVICES</h2>
      <div class="services-grid">
        <div class="service-card">
          <div class="service-icon"><i class="bi bi-hammer"></i></div>
          <h3>Construction Management</h3>
          <p>Project management, estimating, and delivering residential &amp; commercial builds — from foundation to finish. Over 15 years of hands-on field experience.</p>
        </div>
        <div class="service-card">
          <div class="service-icon"><i class="bi bi-code-slash"></i></div>
          <h3>Software Development</h3>
          <p>Custom business applications, web platforms, and backend systems built for reliability and real-world use.</p>
        </div>
        <div class="service-card">
          <div class="service-icon"><i class="bi bi-phone"></i></div>
          <h3>Mobile Apps</h3>
          <p>Native iOS and Android applications — from concept to App Store. Built with real users in mind.</p>
        </div>
        <div class="service-card">
          <div class="service-icon"><i class="bi bi-camera-video"></i></div>
          <h3>Video Surveillance</h3>
          <p>Commercial surveillance system design, installation, and monitoring — keeping your spaces secure around the clock.</p>
        </div>
        <div class="service-card">
          <div class="service-icon"><i class="bi bi-hdd-network"></i></div>
          <h3>Networking</h3>
          <p>Enterprise-grade networking infrastructure — structured cabling, wireless deployments, and system integration for commercial spaces.</p>
        </div>
        <div class="service-card">
          <div class="service-icon"><i class="bi bi-speaker"></i></div>
          <h3>Commercial Audio</h3>
          <p>Audio system design and installation for commercial environments — from conference rooms to full-building sound.</p>
        </div>
        <div class="service-card">
          <div class="service-icon"><i class="bi bi-controller"></i></div>
          <h3>Game Servers &amp; Modding</h3>
          <p>Multiplayer game server hosting, custom mods, scripted features, and community management that keeps players engaged.</p>
        </div>
        <div class="service-card">
          <div class="service-icon"><i class="bi bi-cloud-check"></i></div>
          <h3>Cloud &amp; Infrastructure</h3>
          <p>Scalable cloud hosting, server administration, and DevOps — the backbone behind your applications and services.</p>
        </div>
      </div>
    </div>
  `,

  software: `
    <div class="page software-page">
      <h2 class="section-title">SOFTWARE</h2>
      <div class="platform-grid">
        <div class="platform-card">
          <div class="platform-icon"><i class="bi bi-apple"></i></div>
          <h3>iOS</h3>
          <p>Swift-powered native iOS applications with beautiful design and seamless performance. Built for the Apple ecosystem.</p>
          <ul class="tech-list">
            <li>Swift / SwiftUI</li>
            <li>Core Data</li>
            <li>ARKit / RealityKit</li>
            <li>App Store Optimization</li>
          </ul>
        </div>
        <div class="platform-card">
          <div class="platform-icon"><i class="bi bi-android2"></i></div>
          <h3>Android</h3>
          <p>Kotlin-first Android applications built with Material Design and modern architecture patterns.</p>
          <ul class="tech-list">
            <li>Kotlin / Jetpack Compose</li>
            <li>Room Database</li>
            <li>Google Play Services</li>
            <li>Material Design 3</li>
          </ul>
        </div>
      </div>

      <div class="privacy-policy">
        <div class="protocol-header">
          <i class="bi bi-shield-lock-fill"></i>
          <h3>PRIVACY POLICY</h3>
        </div>
        <p>Applications forged aboard the Flinn Built starship may request access to certain systems within your device to enable critical functionality. For instance, the Flashlight Tool requires camera array authorization to command the flash beacon.</p>
        <p>No personal data is harvested, stored, or transmitted to any outpost across the void. The only signals that leave your vessel are automated crash telemetry and transaction data processed through the Google or Apple relay networks. <strong>Your data is never captured, recorded, or sold by Flinn Built.</strong></p>
      </div>
    </div>
  `,

  portfolio: `
    <div class="page portfolio-page">
      <h2 class="section-title">PORTFOLIO</h2>
      <div class="portfolio-grid">
        <div class="portfolio-item">
          <div class="portfolio-thumb" style="background: linear-gradient(135deg, #4488ff, #44ffaa)"></div>
          <h3>Project Alpha</h3>
          <p>Immersive 3D web experience</p>
        </div>
        <div class="portfolio-item">
          <div class="portfolio-thumb" style="background: linear-gradient(135deg, #ff8844, #ff4488)"></div>
          <h3>Project Beta</h3>
          <p>Cross-platform mobile app</p>
        </div>
        <div class="portfolio-item">
          <div class="portfolio-thumb" style="background: linear-gradient(135deg, #aa44ff, #4488ff)"></div>
          <h3>Project Gamma</h3>
          <p>Cloud infrastructure platform</p>
        </div>
        <div class="portfolio-item">
          <div class="portfolio-thumb" style="background: linear-gradient(135deg, #44ddff, #44ffaa)"></div>
          <h3>Project Delta</h3>
          <p>AI-powered analytics dashboard</p>
        </div>
      </div>
      <p class="portfolio-note">More projects coming soon...</p>
    </div>
  `,

  contact: `
    <div class="page contact-page">
      <h2 class="section-title">CONTACT</h2>
      <div class="contact-grid">
        <div class="contact-info">
          <h3>Get In Touch</h3>
          <p>Ready to build something extraordinary? Let's talk.</p>
          <div class="contact-links">
            <a href="mailto:hello@flinnbuilt.com" class="contact-link">
              <span class="link-icon"><i class="bi bi-envelope"></i></span>
              hello@flinnbuilt.com
            </a>
            <a href="https://flinnbuilt.com" class="contact-link" target="_blank">
              <span class="link-icon"><i class="bi bi-globe2"></i></span>
              www.flinnbuilt.com
            </a>
          </div>
        </div>
        <form class="contact-form" onsubmit="event.preventDefault();">
          <input type="text" name="name" placeholder="Your Name" class="form-input" required />
          <input type="email" name="email" placeholder="Your Email" class="form-input" required />
          <textarea name="message" placeholder="Your Message" class="form-input form-textarea" rows="4" required></textarea>
          <button type="submit" class="form-submit">TRANSMIT MESSAGE</button>
        </form>
      </div>
    </div>
  `,
};
