// Mobile menu toggle with enhanced animations
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.textContent = navLinks.classList.contains('active') ? '✕' : '☰';
        
        // Add bounce animation to hamburger
        hamburger.style.transform = 'scale(0.9)';
        setTimeout(() => {
            hamburger.style.transform = 'scale(1)';
        }, 150);
    });
}

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
                progressBar.style.width = progressBar.textContent;
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

// Dark mode toggle functionality
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

if (darkModeToggle) {
    // Check for saved dark mode preference or default to light mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        body.classList.add('dark-mode');
        darkModeToggle.classList.add('active');
    }

    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        darkModeToggle.classList.toggle('active');
        
        // Save the preference
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
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

// Loading screen
const loading = document.getElementById('loading');
if (loading) {
    // Hide loading screen immediately when page loads
    window.addEventListener('load', () => {
        loading.classList.add('hidden');
        setTimeout(() => {
            loading.style.display = 'none';
        }, 500);
    });
    
    // Also hide loading screen after DOM is ready (backup)
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (loading && !loading.classList.contains('hidden')) {
                loading.classList.add('hidden');
                setTimeout(() => {
                    loading.style.display = 'none';
                }, 500);
            }
        }, 1000);
    });
    
    // Force hide loading screen after 3 seconds (emergency fallback)
    setTimeout(() => {
        if (loading && !loading.classList.contains('hidden')) {
            loading.classList.add('hidden');
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }
    }, 3000);
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add ripple effect to buttons
    addRippleEffect();
    
    // Add floating particles effect (desktop only)
    if (window.innerWidth > 768) {
        const createParticle = () => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: fixed;
                width: 4px;
                height: 4px;
                background: var(--accent-purple);
                border-radius: 50%;
                pointer-events: none;
                z-index: 1;
                opacity: 0.6;
            `;
            
            particle.style.left = Math.random() * window.innerWidth + 'px';
            particle.style.top = window.innerHeight + 'px';
            
            document.body.appendChild(particle);
            
            const animation = particle.animate([
                { transform: 'translateY(0px) rotate(0deg)', opacity: 0.6 },
                { transform: `translateY(-${window.innerHeight + 100}px) rotate(360deg)`, opacity: 0 }
            ], {
                duration: Math.random() * 3000 + 2000,
                easing: 'linear'
            });
            
            animation.onfinish = () => particle.remove();
        };

        // Create particles periodically
        setInterval(createParticle, 300);
    }

    // Add mouse follower effect (desktop only)
    if (window.innerWidth > 768) {
        const mouseFollower = document.createElement('div');
        mouseFollower.className = 'mouse-follower';
        mouseFollower.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, var(--primary-yellow) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            transition: transform 0.1s ease;
            opacity: 0.7;
        `;
        document.body.appendChild(mouseFollower);

        document.addEventListener('mousemove', (e) => {
            mouseFollower.style.left = e.clientX - 10 + 'px';
            mouseFollower.style.top = e.clientY - 10 + 'px';
        });

        // Add interactive cursor effects
        const interactiveElements = document.querySelectorAll('a, button, .portfolio-item, .skill-item');
        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                mouseFollower.style.transform = 'scale(1.5)';
                mouseFollower.style.background = 'radial-gradient(circle, var(--accent-purple) 0%, transparent 70%)';
            });
            
            element.addEventListener('mouseleave', () => {
                mouseFollower.style.transform = 'scale(1)';
                mouseFollower.style.background = 'radial-gradient(circle, var(--primary-yellow) 0%, transparent 70%)';
            });
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

    // Add parallax effect to hero section
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });

    // Mobile touch interactions
    let touchStartY = 0;
    let touchEndY = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
    });

    document.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    });

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
            name: e.target.name.value,
            email: e.target.email.value,
            subject: e.target.subject.value,
            message: e.target.message.value,
        };

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