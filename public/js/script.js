// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close mobile menu when clicking on a link
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 70;
                const elementPosition = target.offsetTop;
                const offsetPosition = elementPosition - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Header background on scroll
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        if (header) {
            if (window.scrollY > 100) {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.backdropFilter = 'blur(10px)';
            } else {
                header.style.background = '#FFFFFF';
                header.style.backdropFilter = 'none';
            }
        }
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.sponsor-card, .event-card, .stat-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add loading animation for social links
    document.querySelectorAll('.social-links a, .footer-social a').forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });

        link.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
});

// Fixed Infinite Scroll Sponsor Carousel Functionality
document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.getElementById('sponsorCarousel');
    const slides = document.querySelectorAll('.sponsor-slide');
    const indicators = document.querySelectorAll('.indicator');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Check if carousel elements exist
    if (!carousel || slides.length === 0) {
        console.warn('Carousel elements not found');
        return;
    }

    let currentSlide = 0;
    let autoSlideInterval;
    let isTransitioning = false;
    let totalSlides = slides.length;

    // Clone slides for infinite effect
    function setupInfiniteCarousel() {
        // Clone first and last slides
        const firstSlideClone = slides[0].cloneNode(true);
        const lastSlideClone = slides[slides.length - 1].cloneNode(true);

        // Add clones to carousel
        carousel.appendChild(firstSlideClone);
        carousel.insertBefore(lastSlideClone, slides[0]);

        // Set initial position to show first real slide (accounting for cloned last slide)
        carousel.style.transition = 'none';
        carousel.style.transform = `translateX(-100%)`;

        // Show first slide immediately
        setTimeout(() => {
            carousel.style.transition = 'transform 0.5s ease-in-out';
            updateIndicators(0);
        }, 50);
    }

    // Function to update indicators
    function updateIndicators(index) {
        indicators.forEach(indicator => indicator.classList.remove('active'));
        if (indicators[index]) {
            indicators[index].classList.add('active');
        }
    }

    // Function to show specific slide with infinite scroll
    function showSlide(index, animate = true) {
        if (isTransitioning) return;

        isTransitioning = true;

        // Calculate position (index + 1 accounts for the cloned last slide at the beginning)
        const position = (index + 1) * -100;

        if (animate) {
            carousel.style.transition = 'transform 0.5s ease-in-out';
        } else {
            carousel.style.transition = 'none';
        }

        carousel.style.transform = `translateX(${position}%)`;

        // Update indicators for real slides only
        if (index >= 0 && index < totalSlides) {
            updateIndicators(index);
            currentSlide = index;
        }

        // Handle infinite loop transitions
        setTimeout(() => {
            if (index === totalSlides) {
                // Jump to first slide without animation
                carousel.style.transition = 'none';
                carousel.style.transform = `translateX(-100%)`;
                currentSlide = 0;
                updateIndicators(0);
            } else if (index === -1) {
                // Jump to last slide without animation
                carousel.style.transition = 'none';
                carousel.style.transform = `translateX(-${totalSlides * 100}%)`;
                currentSlide = totalSlides - 1;
                updateIndicators(totalSlides - 1);
            }

            isTransitioning = false;
        }, animate ? 500 : 0);
    }

    // Function to go to next slide
    function nextSlide() {
        if (isTransitioning) return;

        if (currentSlide === totalSlides - 1) {
            // Go to cloned first slide, then jump to real first slide
            showSlide(totalSlides);
        } else {
            showSlide(currentSlide + 1);
        }
    }

    // Function to go to previous slide
    function prevSlide() {
        if (isTransitioning) return;

        if (currentSlide === 0) {
            // Go to cloned last slide, then jump to real last slide
            showSlide(-1);
        } else {
            showSlide(currentSlide - 1);
        }
    }

    // Auto-slide functionality (every 3 seconds)
    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 3000);
    }

    // Stop auto-slide
    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }

    // Event listeners for navigation buttons
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            stopAutoSlide();
            nextSlide();
            startAutoSlide();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            stopAutoSlide();
            prevSlide();
            startAutoSlide();
        });
    }

    // Event listeners for indicators
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            stopAutoSlide();
            showSlide(index);
            startAutoSlide();
        });
    });

    // Pause auto-slide on hover
    const carouselContainer = document.querySelector('.carousel-container');
    if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', stopAutoSlide);
        carouselContainer.addEventListener('mouseleave', startAutoSlide);

        // Enhanced touch/swipe support for mobile
        let startX = 0;
        let endX = 0;
        let startTime = 0;

        carouselContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startTime = Date.now();
            stopAutoSlide();
        });

        carouselContainer.addEventListener('touchmove', (e) => {
            endX = e.touches[0].clientX;
            e.preventDefault();
        });

        carouselContainer.addEventListener('touchend', () => {
            const threshold = 50;
            const timeThreshold = 300;
            const diff = startX - endX;
            const timeDiff = Date.now() - startTime;

            if (Math.abs(diff) > threshold && timeDiff < timeThreshold) {
                if (diff > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            }

            startAutoSlide();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            stopAutoSlide();
            prevSlide();
            startAutoSlide();
        } else if (e.key === 'ArrowRight') {
            stopAutoSlide();
            nextSlide();
            startAutoSlide();
        }
    });

    // Initialize carousel
    setupInfiniteCarousel();

    // Start auto-slide after a brief delay to ensure everything is loaded
    setTimeout(() => {
        startAutoSlide();
    }, 100);

    // Pause auto-slide when page is not visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoSlide();
        } else {
            startAutoSlide();
        }
    });
});

// Add interactive button effects
document.addEventListener('DOMContentLoaded', function() {
    // Add click effect to buttons
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            let ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);

            let x = e.clientX - e.target.offsetLeft;
            let y = e.clientY - e.target.offsetTop;

            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// === Event Card Autofill ===
fetch('next-event.txt')
    .then(response => response.text())
    .then(text => {
        // Extract fields using regex
        const date = text.match(/# Date:\s*([\s\S]*?)# Title/)?.[1]?.trim() || '';
        const title = text.match(/# Title\s*([\s\S]*?)# Description/)?.[1]?.trim() || '';
        const desc = text.match(/# Description\s*([\s\S]*?)# Location/)?.[1]?.trim() || '';
        const loc = text.match(/# Location\s*([\s\S]*?)# Link/)?.[1]?.trim() || '';
        const link = text.match(/# Link\s*([\s\S]*)/)?.[1]?.trim() || '#';

        // Parse date (expects e.g. 'August 21, 2025')
        let month = '', day = '';
        if (date) {
            // Robust date parsing
            const dateObj = new Date(date);
            if (!isNaN(dateObj.getTime())) {
                // Use toLocaleString for abbreviation
                month = dateObj.toLocaleString('en-US', { month: 'short' });
                day = dateObj.getDate().toString();
            } else {
                // Fallback: manually split
                const match = date.match(/([A-Za-z]+)\s+(\d{1,2}),/);
                month = match ? match[1].slice(0,3) : '';
                day = match ? match[2] : '';
            }
        }

        // Fill card fields (assumes these IDs are present!)
        document.getElementById('eventMonth').textContent = month;
        document.getElementById('eventDay').textContent = day;
        document.getElementById('eventTitle').textContent = title;
        document.getElementById('eventLocation').textContent = loc;
        document.getElementById('eventDesc').textContent = desc;

        // Make entire card clickable
        const eventLink = document.getElementById('eventLink');
        if (eventLink) eventLink.href = link;
    })
    .catch(err => {
        console.error('Error loading event:', err);
    });
