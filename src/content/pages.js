/**
 * Page content for each section — rendered as HTML overlays
 * Uses the 3x3 triangle composition theory for layout
 */
export const pageContent = {
  home: `
    <div class="page home-page">
      <h1 class="glitch" data-text="FLINN BUILT">FLINN BUILT</h1>
      <p class="tagline">Building the Future — One Pixel at a Time</p>
      <div class="home-cta">
        <p class="explore-hint">Scroll or use navigation to explore</p>
        <div class="scroll-indicator">
          <div class="scroll-arrow"></div>
        </div>
      </div>
    </div>
  `,

  about: `
    <div class="page about-page">
      <h2 class="section-title">ABOUT</h2>
      <div class="content-grid">
        <div class="content-block">
          <h3>Who We Are</h3>
          <p>Flinn Built is a creative technology studio pushing the boundaries of digital experiences. We blend cutting-edge development with bold design to craft solutions that stand out in the digital universe.</p>
        </div>
        <div class="content-block">
          <h3>Our Mission</h3>
          <p>To build software and digital experiences that are not just functional, but genuinely unforgettable. We believe technology should inspire wonder.</p>
        </div>
        <div class="content-block">
          <h3>Our Approach</h3>
          <p>Every project starts with exploration. We dive deep into the problem space, prototype fearlessly, and iterate until the result exceeds expectations.</p>
        </div>
      </div>
    </div>
  `,

  services: `
    <div class="page services-page">
      <h2 class="section-title">SERVICES</h2>
      <div class="services-grid">
        <div class="service-card">
          <div class="service-icon">⚡</div>
          <h3>Web Development</h3>
          <p>Modern, performant web applications built with the latest technologies.</p>
        </div>
        <div class="service-card">
          <div class="service-icon">📱</div>
          <h3>Mobile Apps</h3>
          <p>Native iOS and Android applications that users love.</p>
        </div>
        <div class="service-card">
          <div class="service-icon">🎮</div>
          <h3>Interactive Experiences</h3>
          <p>3D visualizations, WebGL, and immersive digital experiences.</p>
        </div>
        <div class="service-card">
          <div class="service-icon">🎨</div>
          <h3>UI/UX Design</h3>
          <p>Intuitive, beautiful interfaces designed with purpose.</p>
        </div>
        <div class="service-card">
          <div class="service-icon">☁️</div>
          <h3>Cloud & Backend</h3>
          <p>Scalable infrastructure and APIs that power your applications.</p>
        </div>
        <div class="service-card">
          <div class="service-icon">🔧</div>
          <h3>Custom Tools</h3>
          <p>Bespoke software tools tailored to your workflow.</p>
        </div>
      </div>
    </div>
  `,

  software: `
    <div class="page software-page">
      <h2 class="section-title">SOFTWARE</h2>
      <div class="platform-grid">
        <div class="platform-card">
          <div class="platform-icon"></div>
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
          <div class="platform-icon">🤖</div>
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
              <span class="link-icon">✉</span>
              hello@flinnbuilt.com
            </a>
            <a href="https://flinnbuilt.com" class="contact-link" target="_blank">
              <span class="link-icon">🌐</span>
              www.flinnbuilt.com
            </a>
          </div>
        </div>
        <form class="contact-form" onsubmit="event.preventDefault();">
          <input type="text" placeholder="Your Name" class="form-input" />
          <input type="email" placeholder="Your Email" class="form-input" />
          <textarea placeholder="Your Message" class="form-input form-textarea" rows="4"></textarea>
          <button type="submit" class="form-submit">TRANSMIT MESSAGE</button>
        </form>
      </div>
    </div>
  `,
};
