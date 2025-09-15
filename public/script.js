 // Mobile menu toggle
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');

        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.textContent = navLinks.classList.contains('active') ? '✕' : '☰';
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                navLinks.classList.remove('active');
                hamburger.textContent = '☰';

                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });

        // Animate progress bars on scroll
        const animateOnScroll = () => {
            const skillItems = document.querySelectorAll('.skill-item');
            
            skillItems.forEach(item => {
                const rect = item.getBoundingClientRect();
                if (rect.top <= window.innerHeight - 100) {
                    const progressBar = item.querySelector('.progress-bar');
                    progressBar.style.width = progressBar.textContent;
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
        const playMusic = () => {
            if (bgMusic.paused) {
                bgMusic.play();
            }
            document.removeEventListener('click', playMusic);
        };
        document.addEventListener('click', playMusic);

        // Contact form AJAX submit (alert version)
        document.getElementById("contactForm").addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = {
                name: e.target.name.value,
                email: e.target.email.value,
                subject: e.target.subject.value,
                message: e.target.message.value,
            };

            const res = await fetch("/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            alert(data.msg);

            e.target.reset();
        });