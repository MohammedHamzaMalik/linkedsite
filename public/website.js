document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Initialize any interactive elements
    const initializeWebsite = () => {
        // Add fade-in animation for sections
        const sections = document.querySelectorAll('section');
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        sections.forEach(section => {
            section.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            observer.observe(section);
        });
    };

    initializeWebsite();
});