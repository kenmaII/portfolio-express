// Mobile menu toggle with enhanced animations
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.textContent = navLinks.classList.contains('active') ? '✕' : '☰';
    // Ensure desktop toggle visibility updates when mobile nav opens/closes
    if (typeof enforceToggleVisibility === 'function') enforceToggleVisibility();
        
        // Add bounce animation to hamburger
        hamburger.style.transform = 'scale(0.9)';
        setTimeout(() => {
            hamburger.style.transform = 'scale(1)';
        }, 150);
    });
}

/* PUBLIC ADMIN INTEGRATION: show admin controls in header and render projects dynamically */
(function(){
    const headerAdmin = document.getElementById('publicAdminControls');
    const portfolioContainer = document.querySelector('.portfolio-container');
    let PUBLIC_USER = null;

    function escapeHtml(s){ return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

    async function checkPublicAuth(){
        // If the visitor explicitly chose to browse as a guest, honor that locally
        const forcedRole = localStorage.getItem('siteRole');
        if (forcedRole === 'guest') {
            PUBLIC_USER = null;
            renderHeader();
            loadAndRenderProjects();
            return;
        }

        try{
            // include credentials so we correctly detect an existing server session
            const r = await fetch('/api/auth/me', { credentials: 'include' });
            const d = await r.json();
            PUBLIC_USER = d && d.user ? d.user : null;
            renderHeader();
            loadAndRenderProjects();
        }catch(e){ PUBLIC_USER = null; renderHeader(); loadAndRenderProjects(); }
    }

    function renderHeader(){
        if(!headerAdmin) return;
    // Hide admin controls on public site navigation to avoid showing login/logout
    headerAdmin.style.display = 'none';
    }

    async function loadAndRenderProjects(){
        if(!portfolioContainer) return;
        portfolioContainer.innerHTML = '<div class="loading">Loading projects...</div>';
        try{
            const res = await fetch('/api/projects');
            const data = await res.json();
            if(!data.success || !Array.isArray(data.projects) || data.projects.length === 0){
                portfolioContainer.innerHTML = '<div class="empty">No projects yet.</div>';
                return;
            }
            portfolioContainer.innerHTML = '';
            data.projects.forEach(p=>{
                const card = document.createElement('div'); card.className='portfolio-item';
                const imgSrc = p.imageUrl || '';
                const imgHtml = imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.title||'Project image')}"/>` : `<div class="placeholder">🎨</div>`;
                card.innerHTML = `
                    <div class="portfolio-image">${imgHtml}</div>
                    <div class="portfolio-info">
                        <h3>${escapeHtml(p.title)}</h3>
                        <p>${escapeHtml(p.description||'')}</p>
                        <div class="portfolio-tags">${(p.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
                    </div>`;
                // only show admin controls for authenticated admin users
                // also honor an explicit guest override in localStorage
                const forcedRole = localStorage.getItem('siteRole');
                if (forcedRole === 'guest') {
                    // do not render admin controls when the visitor chose guest mode
                } else if (PUBLIC_USER && PUBLIC_USER.role === 'admin'){
                    const ctrl = document.createElement('div'); ctrl.style.marginTop = '.5rem';
                    const editBtn = document.createElement('button'); editBtn.className='btn edit-inline'; editBtn.textContent='Edit'; editBtn.dataset.id = p._id;
                    const delBtn = document.createElement('button'); delBtn.className='btn delete-inline'; delBtn.textContent='Delete'; delBtn.style.background='#ff6b6b'; delBtn.dataset.id = p._id;
                    ctrl.appendChild(editBtn); ctrl.appendChild(delBtn);
                    card.querySelector('.portfolio-info').appendChild(ctrl);
                }
                portfolioContainer.appendChild(card);
            });

            // Inline delete handlers
        document.querySelectorAll('.delete-inline').forEach(b=>b.addEventListener('click', async (e)=>{
                if(!confirm('Delete this project?')) return;
                const id = e.currentTarget.getAttribute('data-id');
                try{
            const r = await fetch('/api/projects/'+id,{method:'DELETE', credentials: 'include'});
                    if(r.status===401){ siteAlert.show('Unauthorized','error'); return; }
                    const d = await r.json(); if(d.success) siteAlert.show('Deleted');
                }catch(err){ siteAlert.show('Delete failed','error'); }
                loadAndRenderProjects();
            }));
        }catch(err){
            portfolioContainer.innerHTML = '<div class="error">Failed to load projects</div>';
            console.warn('load projects err', err);
        }
    }

    // expose functions so role modal can control initial flow
    window.checkPublicAuth = checkPublicAuth;
    window.loadAndRenderProjects = loadAndRenderProjects;
})();

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (navLinks) {
            navLinks.classList.remove('active');
            if (hamburger) {
                hamburger.textContent = '☰';
            }
        }

        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

    // Animate progress bars on scroll
const animateOnScroll = () => {
    const skillItems = document.querySelectorAll('.skill-item');
    
    skillItems.forEach(item => {
        const rect = item.getBoundingClientRect();
        if (rect.top <= window.innerHeight - 100) {
            const progressBar = item.querySelector('.progress-bar');
            if (progressBar) {
                // prefer data-value (number) if present
                const val = progressBar.dataset.value !== undefined ? Number(progressBar.dataset.value) : null;
                const pct = (val || Number((progressBar.textContent||'').replace('%','')) || 0);
                progressBar.style.width = pct + '%';
                progressBar.textContent = pct + '%';
            }
        }
    });
};

window.addEventListener('scroll', animateOnScroll);
window.addEventListener('load', animateOnScroll);

// Section fade-in animation
const sections = document.querySelectorAll('.section-fade');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        } else {
            entry.target.classList.remove('visible');
        }
    });
}, { threshold: 0.15 });

sections.forEach(section => {
    observer.observe(section);
});

// Play audio after first user interaction (for browser compatibility)
const bgMusic = document.getElementById('bg-music');
if (bgMusic) {
    const playMusic = () => {
        if (bgMusic.paused) {
            bgMusic.play().catch(e => console.log('Audio play failed:', e));
        }
        document.removeEventListener('click', playMusic);
    };
    document.addEventListener('click', playMusic);
}

// Small shared alert banner for public pages
const siteAlert = (() => {
    let el = document.getElementById('siteAlert');
    if (!el) {
        el = document.createElement('div');
        el.id = 'siteAlert';
        el.setAttribute('role','status');
        el.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:3000;display:none;padding:.6rem 1rem;border-radius:8px;border:2px solid #333;background:rgba(255,255,255,0.95)';
        document.body.appendChild(el);
    }
    return {
        show: (msg, type='ok') => {
            el.textContent = msg;
            el.style.display = 'block';
            el.style.borderColor = type === 'error' ? '#c33' : type === 'warn' ? '#d48' : '#3a3';
            el.style.background = type === 'error' ? 'rgba(255,220,220,0.95)' : type === 'warn' ? 'rgba(255,245,220,0.95)' : 'rgba(220,255,220,0.95)';
            setTimeout(()=> el.style.display = 'none', 3000);
        }
    };
})();

// Enhanced typing effect for hero text
const typingText = document.querySelector('.typing-text');
if (typingText) {
    const text = typingText.textContent;
    typingText.textContent = '';
    typingText.style.borderRight = '2px solid var(--accent-purple)';
    
    let i = 0;
    const typeWriter = () => {
        if (i < text.length) {
            typingText.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, 50);
        } else {
            // Blinking cursor effect
            setInterval(() => {
                typingText.style.borderRight = typingText.style.borderRight === 'none' ? '2px solid var(--accent-purple)' : 'none';
            }, 500);
        }
    };
    
    // Start typing after a delay
    setTimeout(typeWriter, 1000);
}

// Enhanced hover effects for portfolio items
const portfolioItems = document.querySelectorAll('.portfolio-item');
portfolioItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.style.transform = 'translate(-8px, -8px) scale(1.02)';
        item.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    });
    
    item.addEventListener('mouseleave', () => {
        item.style.transform = 'translate(0, 0) scale(1)';
    });
});

// Add ripple effect to buttons
const addRippleEffect = () => {
    const buttons = document.querySelectorAll('.btn, .submit-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
};

// Dark mode removed per request. No-op placeholder to keep references safe.
const body = document.body;

// Defensive: ensure desktop floating toggle is hidden on mobile widths (in case CSS is overridden)
const enforceToggleVisibility = () => {
    const desktopToggle = document.getElementById('darkModeToggle');
    if (!desktopToggle) return;
    if (window.innerWidth <= 768) {
        desktopToggle.style.display = 'none';
    } else {
        desktopToggle.style.display = '';
    }
};

window.addEventListener('resize', enforceToggleVisibility);
enforceToggleVisibility();

// Mobile dark mode alternative - double tap on logo to toggle dark mode
const logo = document.querySelector('.logo');
if (logo && window.innerWidth <= 768) {
    let tapCount = 0;
    let tapTimer = null;
    
    logo.addEventListener('click', () => {
        tapCount++;
        
        if (tapCount === 1) {
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, 300);
        } else if (tapCount === 2) {
            clearTimeout(tapTimer);
            tapCount = 0;
            
            // Toggle dark mode
            body.classList.toggle('dark-mode');
            const isDark = body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
                // Show short visual feedback by toggling an 'active' class briefly
                logo.classList.add('flash-theme');
                setTimeout(() => logo.classList.remove('flash-theme'), 800);
        }
    });
}

// Scroll indicator
const scrollIndicator = document.getElementById('scrollIndicator');
if (scrollIndicator) {
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = scrollTop / docHeight;
        scrollIndicator.style.transform = `scaleX(${scrollPercent})`;
    });
}

// Role modal handling: Guest or Admin
const roleModal = document.getElementById('roleModal');
if (roleModal) {
    const roleGuest = document.getElementById('roleGuest');
    const roleAdmin = document.getElementById('roleAdmin');

    roleGuest.addEventListener('click', () => {
        roleModal.style.display = 'none';
    // Remember the visitor wants to browse as a guest even if an admin session exists
    try{ localStorage.setItem('siteRole','guest'); }catch(e){}
    // Guest: render projects immediately (public admin integration handles this)
    if (typeof checkPublicAuth === 'function') checkPublicAuth();
    });

    roleAdmin.addEventListener('click', () => {
        // Redirect to admin editor/login page
        window.location.href = '/admin.html';
    });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add ripple effect to buttons
    addRippleEffect();
    
    // Add floating bubbles effect (desktop only)
    if (window.innerWidth > 768) {
        const createBubble = () => {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            
            // Random size between 30px to 80px (bigger bubbles!)
            const size = Math.random() * 50 + 30;
            const colors = [
                'var(--accent-purple)', 
                'var(--accent-blue)', 
                'var(--primary-yellow)', 
                'var(--dark-yellow)',
                'rgba(170, 115, 224, 0.6)',
                'rgba(73, 198, 229, 0.6)',
                'rgba(255, 217, 0, 0.6)'
            ];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            bubble.style.cssText = `
                position: fixed;
                width: ${size}px;
                height: ${size}px;
                background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), ${randomColor});
                border-radius: 50%;
                pointer-events: none;
                z-index: 1;
                opacity: 0.7;
                box-shadow: 
                    inset -10px -10px 20px rgba(0,0,0,0.1),
                    0 0 20px rgba(255,255,255,0.3);
                border: 2px solid rgba(255,255,255,0.4);
            `;
            
            // Random starting position
            bubble.style.left = Math.random() * (window.innerWidth - size) + 'px';
            bubble.style.top = window.innerHeight + size + 'px';
            
            // Random floating motion - more natural bubble movement
            const floatX = (Math.random() - 0.5) * 150; // More horizontal drift
            const floatY = -(window.innerHeight + 300); // Float higher
            const rotation = Math.random() * 1080 - 540; // More rotation
            const wobble = Math.random() * 20 - 10; // Wobble effect
            
            document.body.appendChild(bubble);
            
            const animation = bubble.animate([
                { 
                    transform: `translateY(0px) translateX(0px) rotate(0deg) scale(1)`, 
                    opacity: 0.7 
                },
                { 
                    transform: `translateY(${floatY * 0.3}px) translateX(${floatX * 0.3}px) rotate(${rotation * 0.3}deg) scale(1.1)`, 
                    opacity: 0.9 
                },
                { 
                    transform: `translateY(${floatY}px) translateX(${floatX}px) rotate(${rotation}deg) scale(0.2)`, 
                    opacity: 0 
                }
            ], {
                duration: Math.random() * 5000 + 4000, // 4-9 seconds for bigger bubbles
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            animation.onfinish = () => bubble.remove();
        };

        // Create bubbles periodically
        setInterval(createBubble, 800); // Slower creation rate for bigger bubbles

        // Add bubble interaction with mouse
        document.addEventListener('mousemove', (e) => {
            const bubbles = document.querySelectorAll('.bubble');
            bubbles.forEach(bubble => {
                const rect = bubble.getBoundingClientRect();
                const bubbleX = rect.left + rect.width / 2;
                const bubbleY = rect.top + rect.height / 2;
                const distance = Math.sqrt(Math.pow(e.clientX - bubbleX, 2) + Math.pow(e.clientY - bubbleY, 2));
                
                if (distance < 100) {
                    const force = (100 - distance) / 100;
                    const angle = Math.atan2(e.clientY - bubbleY, e.clientX - bubbleX);
                    const pushX = Math.cos(angle) * force * 20;
                    const pushY = Math.sin(angle) * force * 20;
                    
                    bubble.style.transform += ` translate(${pushX}px, ${pushY}px)`;
                }
            });
        });
    }

    // Add enhanced mouse trail effect (desktop only)
    if (window.innerWidth > 768) {
        // Create trail particles
        const trailParticles = [];
        const maxTrailLength = 15;
        
        const createTrailParticle = (x, y, color, size = 8) => {
            const particle = document.createElement('div');
            particle.className = 'trail-particle';
            particle.style.cssText = `
                position: fixed;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 9998;
                left: ${x}px;
                top: ${y}px;
                opacity: 0.8;
                box-shadow: 0 0 10px ${color};
            `;
            document.body.appendChild(particle);
            
            // Animate particle
            const animation = particle.animate([
                { 
                    transform: 'scale(1) translate(0, 0)', 
                    opacity: 0.8 
                },
                { 
                    transform: 'scale(0.3) translate(0, -20px)', 
                    opacity: 0 
                }
            ], {
                duration: 800,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            animation.onfinish = () => particle.remove();
            return particle;
        };

        // Main cursor follower
        const mouseFollower = document.createElement('div');
        mouseFollower.className = 'mouse-follower';
        mouseFollower.style.cssText = `
            position: fixed;
            width: 24px;
            height: 24px;
            background: radial-gradient(circle, var(--primary-yellow) 0%, var(--accent-purple) 50%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            transition: transform 0.15s ease;
            opacity: 0.9;
            box-shadow: 0 0 20px var(--primary-yellow);
        `;
        document.body.appendChild(mouseFollower);

        let mouseX = 0, mouseY = 0;
        let lastTrailTime = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            // Update main cursor
            mouseFollower.style.left = mouseX - 12 + 'px';
            mouseFollower.style.top = mouseY - 12 + 'px';
            
            // Create trail particles
            const now = Date.now();
            if (now - lastTrailTime > 50) { // Limit trail frequency
                const colors = [
                    'var(--primary-yellow)',
                    'var(--accent-purple)',
                    'var(--accent-blue)',
                    'var(--dark-yellow)'
                ];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                const randomSize = Math.random() * 6 + 4;
                
                createTrailParticle(
                    mouseX + (Math.random() - 0.5) * 20, 
                    mouseY + (Math.random() - 0.5) * 20, 
                    randomColor, 
                    randomSize
                );
                
                lastTrailTime = now;
            }
        });

        // Add interactive cursor effects
        const interactiveElements = document.querySelectorAll('a, button, .portfolio-item, .skill-item');
        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                mouseFollower.style.transform = 'scale(1.8)';
                mouseFollower.style.background = 'radial-gradient(circle, var(--accent-purple) 0%, var(--accent-blue) 50%, transparent 70%)';
                mouseFollower.style.boxShadow = '0 0 30px var(--accent-purple)';
                
                // Create burst effect
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const x = mouseX + Math.cos(angle) * 30;
                    const y = mouseY + Math.sin(angle) * 30;
                    createTrailParticle(x, y, 'var(--accent-purple)', 6);
                }
            });
            
            element.addEventListener('mouseleave', () => {
                mouseFollower.style.transform = 'scale(1)';
                mouseFollower.style.background = 'radial-gradient(circle, var(--primary-yellow) 0%, var(--accent-purple) 50%, transparent 70%)';
                mouseFollower.style.boxShadow = '0 0 20px var(--primary-yellow)';
            });
        });

        // Hide cursor on interactive elements
        interactiveElements.forEach(element => {
            element.style.cursor = 'none';
        });
    }

    // Enhanced scroll animations
    const animateElements = () => {
        const elements = document.querySelectorAll('.skill-item, .portfolio-item');
        elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // Initialize elements with hidden state
    document.querySelectorAll('.skill-item, .portfolio-item').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    });

    window.addEventListener('scroll', animateElements);
    window.addEventListener('load', animateElements);

    // Add parallax effect to hero image only (avoid transforming the whole .hero section
    // because it conflicts with the .section-fade translateY used for fade animations).
    const heroImage = document.querySelector('.hero-image');
    if (heroImage) {
        let lastKnownScrollY = 0;
        let ticking = false;

        const updateParallax = () => {
            const scrolled = lastKnownScrollY;
            // small translate for parallax (image moves slower than page)
            const translate = Math.max(0, scrolled * 0.15);
            // Use transform on the inner image wrapper to avoid interfering with section transforms
            heroImage.style.transform = `translateY(${translate}px)`;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            lastKnownScrollY = window.pageYOffset;
            if (!ticking) {
                window.requestAnimationFrame(updateParallax);
                ticking = true;
            }
        });
    }

    // Mobile touch interactions
    // NOTE: disable auto-scroll swipe behavior on small screens (<=768px)
    // to keep scrolling manual and avoid interference with native scrolling.
    const SWIPE_MIN_WIDTH = 769; // only enable swipe auto-scroll on widths >= 769px
    let touchStartY = 0;
    let touchEndY = 0;

    if (window.innerWidth >= SWIPE_MIN_WIDTH) {
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        });

        document.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        });
    }

    const handleSwipe = () => {
        const swipeThreshold = 50;
        const diff = touchStartY - touchEndY;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe up - scroll down
                window.scrollBy(0, window.innerHeight * 0.8);
            } else {
                // Swipe down - scroll up
                window.scrollBy(0, -window.innerHeight * 0.8);
            }
        }
    };

    // Add haptic feedback for mobile
    const addHapticFeedback = () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    };

    // Add haptic feedback to buttons
    const buttons = document.querySelectorAll('.btn, .submit-btn');
    buttons.forEach(button => {
        button.addEventListener('click', addHapticFeedback);
    });

    // Add haptic feedback to portfolio items
    portfolioItems.forEach(item => {
        item.addEventListener('touchstart', addHapticFeedback);
    });
    
    // Dark mode removed; no mobile toggle created.
});

// Contact form AJAX submit (with external API and error handling)
const contactForm = document.getElementById("contactForm");
if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = e.target.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        
        // Add loading state
        submitBtn.textContent = 'Sending...';
        submitBtn.style.opacity = '0.7';
        submitBtn.disabled = true;

        const formData = {
            name: e.target.name.value.trim(),
            email: e.target.email.value.trim(),
            subject: e.target.subject.value.trim(),
            message: e.target.message.value.trim(),
        };

        // Basic validation
        if(!formData.name || !formData.email || !formData.message) {
            siteAlert.show('Name, email and message are required', 'warn');
            submitBtn.textContent = originalText;
            submitBtn.style.opacity = '1';
            submitBtn.disabled = false;
            return;
        }

        try {
            const res = await fetch("/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                // Success animation
                submitBtn.textContent = '✓ Sent!';
                submitBtn.style.background = 'var(--accent-blue)';
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.style.background = '';
                    submitBtn.style.opacity = '1';
                    submitBtn.disabled = false;
                }, 2000);
            } else {
                throw new Error(data.msg || 'Something went wrong');
            }
        } catch (error) {
            submitBtn.textContent = '✗ Error';
            submitBtn.style.background = '#ff6b6b';
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.style.background = '';
                submitBtn.style.opacity = '1';
                submitBtn.disabled = false;
            }, 2000);
        } finally {
            e.target.reset();
        }
    });
}

// When guest selects role, if no projects are present show hint
window.loadAndRenderProjects = window.loadAndRenderProjects || function(){
    // original function is defined in IIFE; if missing, just show nothing
};

// SSE subscription for live updates (falls back to polling)
function setupSseUpdates(){
    if (typeof EventSource === 'undefined') return; // not supported
    try{
        const es = new EventSource('/events');
        es.onmessage = function(e){
            try{
                const payload = JSON.parse(e.data);
                if(payload.event === 'settings.updated'){
                    // reload settings and re-render
                    if(typeof loadAndRenderProjects === 'function') loadAndRenderProjects();
                    // reload settings specifically
                    fetch('/api/settings').then(r=>r.json()).then(d=>{ if(d.success && typeof window.loadAndApplySettings === 'function') window.loadAndApplySettings(); });
                }
                if(payload.event === 'projects.updated'){
                    if(typeof loadAndRenderProjects === 'function') loadAndRenderProjects();
                }
            }catch(e){ console.warn('Invalid SSE payload', e); }
        };
        es.onerror = function(){ es.close(); };
    }catch(e){ console.warn('SSE not available', e); }
}

// expose a loader hook used by admin script
window.loadAndApplySettings = window.loadAndApplySettings || async function(){
    try{
        // force a fresh fetch and avoid caches
        const r = await fetch('/api/settings', { cache: 'no-store' });
        const d = await r.json();
        if(d.success){
            const s = d.settings || {};
            console.log('public: loaded settings', s && s.skills);
            if(s.profileImage){
                const heroImg = document.querySelector('.hero-image img');
                const aboutImg = document.querySelector('.about-image img');
                if(heroImg) heroImg.src = s.profileImage;
                if(aboutImg) aboutImg.src = s.profileImage;
            }
        // Do not overwrite the skills container because skills are managed manually in index.html.
        // Apply only profile image and other settings that do not touch manually edited sections.
        // If you later want to manage skills via admin UI, re-enable replacing the skills-container here.
        }
    }catch(e){ console.warn('load settings failed', e); }
};

// start SSE when DOM ready
document.addEventListener('DOMContentLoaded', ()=> setupSseUpdates());

// On DOM ready: check auth first, then load settings/projects so admin-only controls are added only for authenticated users
document.addEventListener('DOMContentLoaded', async ()=>{
    // run auth check first if available
    if(typeof checkPublicAuth === 'function'){
        try{ await checkPublicAuth(); }catch(e){}
    }
    if(typeof window.loadAndApplySettings === 'function') await window.loadAndApplySettings();
    if(typeof loadAndRenderProjects === 'function') await loadAndRenderProjects();
});