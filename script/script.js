// Helper to load partial HTML into a target element
async function loadPartial(targetId, url) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const res = await fetch(url, { cache: "no-store" });
    el.innerHTML = await res.text();
}

// Update CSS variables for nav/footer heights and body padding
function updateChromeHeights() {
    const navEl = document.querySelector("#site-navbar .navbar");
    const footEl = document.querySelector("#site-footer .site-footer");
    const navH = navEl ? navEl.offsetHeight : 72;
    const footH = footEl ? footEl.offsetHeight : 72;

    const root = document.documentElement;
    root.style.setProperty("--nav-h", navH + "px");
    root.style.setProperty("--footer-h", footH + "px");

    // Ensure body padding matches (useful if CSS cached)
    document.body.style.paddingTop = navH + "px";
    document.body.style.paddingBottom = footH + "px";
}

// Load navbar + footer, then apply logic
(async () => {
    try {
        // Navbar
        await loadPartial("site-navbar", "navbar/navbar.html");

        // Highlight active link
        const currentPage = location.pathname.split("/").pop() || "index.html";
        document.querySelectorAll(".navbar .nav-link").forEach(link => {
            if (link.getAttribute("href") === currentPage) link.classList.add("active");
        });

        // Footer
        await loadPartial("site-footer", "footer/footer.html");

        // Set footer year
        const yearEl = document.getElementById("year");
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        // Now that both are in the DOM, compute heights
        updateChromeHeights();
        window.addEventListener("resize", updateChromeHeights);
    } catch (err) {
        console.error("Failed to load partials:", err);
    }
})();

// External Links (GitHub / Android / iOS buttons)
document.addEventListener("DOMContentLoaded", () => {
    const githubBtn = document.getElementById("githubBtn");
    const androidBtn = document.getElementById("androidBtn");
    const iosBtn = document.getElementById("iosBtn");

    if (githubBtn) githubBtn.addEventListener("click", () => {
        window.open("https://github.com/Save5Bucks", "_blank");
    });
    if (androidBtn) androidBtn.addEventListener("click", () => {
        window.open("https://play.google.com/store/apps/details?id=com.FlinnBuilt.www.a10thofaninch&pli=1", "_blank");
    });
    if (iosBtn) iosBtn.addEventListener("click", () => {
        window.open("https://apps.apple.com/us/app/one10th/id6740911168?platform=iphone", "_blank");
    });
});

// Contact Page Email Button
document.getElementById('emailBtn').addEventListener('click', function () {
    window.location.href = 'mailto:save5bucks@proton.me'; // Replace with your email
});

// App Page External Links
document.getElementById('githubBtn').addEventListener('click', function () {
    window.open('https://github.com/Save5Bucks', '_blank');
});

document.getElementById('androidBtn').addEventListener('click', function () {
    window.open('https://play.google.com/store/apps/details?id=com.FlinnBuilt.www.a10thofaninch&pli=1', '_blank');
});

document.getElementById('iosBtn').addEventListener('click', function () {
    window.open('https://apps.apple.com/us/app/one10th/id6740911168?platform=iphone', '_blank');
});