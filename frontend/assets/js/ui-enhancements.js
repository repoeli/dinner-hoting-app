/**
 * UI Enhancements for Dinner Hosting App
 * Handles interactive elements, animations, and UX improvements
 */

document.addEventListener('DOMContentLoaded', function() {
    // Enhanced filtering with animations
    const filterChips = document.querySelectorAll('.filter-chip');
    const dinnerCards = document.querySelectorAll('.dinner-card');
    
    // Highlight a random dinner as featured
    highlightFeaturedDinner();
    
    // Improve card interaction
    enhanceDinnerCards(dinnerCards);
    
    // Fix dinner section layout to ensure side-by-side on desktop
    improveDinnerSectionsLayout();
    
    // Enhance reservation modal experience
    enhanceReservationModal();
    
    // Enhance filter chips functionality
    enhanceFilterChips();
});

/**
 * Enhance dinner cards with interactive effects
 * - Adds hover effects with z-index adjustments for proper layering
 * - Implements click animations for better user feedback
 * - Creates a more dynamic and interactive card experience
 * 
 * @param {NodeList} dinnerCards - The dinner card elements to enhance
 */
function enhanceDinnerCards(dinnerCards) {
    dinnerCards.forEach(card => {
        // Add hover effect
        card.addEventListener('mouseenter', function() {
            this.style.zIndex = '5';
        });
        
        card.addEventListener('mouseleave', function() {
            setTimeout(() => {
                this.style.zIndex = '1';
            }, 300);
        });
        
        // Add click interaction
        card.addEventListener('click', function() {
            this.classList.add('active-card');
            // Simulate card selection
            setTimeout(() => {
                this.classList.remove('active-card');
            }, 200);
        });
    });
}

/**
 * Randomly highlight a dinner card as featured
 */
function highlightFeaturedDinner() {
    const dinnerCards = document.querySelectorAll('.dinner-card');
    if (dinnerCards.length > 0) {
        // Select 1-2 random cards to feature
        const numToFeature = Math.min(2, dinnerCards.length);
        const featuredIndices = [];
        
        while (featuredIndices.length < numToFeature) {
            const randomIndex = Math.floor(Math.random() * dinnerCards.length);
            if (!featuredIndices.includes(randomIndex)) {
                featuredIndices.push(randomIndex);
                dinnerCards[randomIndex].classList.add('featured');
            }
        }
    }
}

/**
 * Improve the layout of dinner sections to display side by side
 * - Sets appropriate CSS for desktop vs. mobile layouts
 * - Handles responsive design with window resize listener
 * - Ensures equal column widths on desktop
 * - Stacks sections vertically on mobile
 */
function improveDinnerSectionsLayout() {
    // Set layout based on screen size
    function adjustLayout() {
        const dinnersLayout = document.querySelector('.dinners-layout');
        const sectionColumns = document.querySelectorAll('.section-column');
        
        if (!dinnersLayout || sectionColumns.length < 2) return;
        
        if (window.innerWidth >= 992) {
            // Desktop layout
            dinnersLayout.style.display = 'flex';
            dinnersLayout.style.flexDirection = 'row';
            dinnersLayout.style.alignItems = 'stretch';
            dinnersLayout.style.gap = '1.5rem';
            
            // Ensure both sections have the same height
            sectionColumns.forEach(column => {
                column.style.flex = '1 1 0';
                column.style.width = '50%';
            });
        } else {
            // Mobile layout
            dinnersLayout.style.flexDirection = 'column';
            sectionColumns.forEach(column => {
                column.style.width = '100%';
            });
        }
    }
    
    // Initial layout adjustment
    adjustLayout();
    
    // Add resize listener to handle responsive layout changes
    window.addEventListener('resize', adjustLayout);
}

/**
 * Enhance the multi-step reservation modal
 * - Handles step navigation
 * - Manages guest counter functionality
 * - Updates summary information
 * - Provides visual feedback throughout the process
 */
function enhanceMultiStepReservation() {
    const reservationModal = document.getElementById('reservationModal');
    if (!reservationModal) return;
    
    // Initialize steps functionality
    const progressLine = reservationModal.querySelector('.progress-line');
    const steps = reservationModal.querySelectorAll('.step');
    const stepContents = reservationModal.querySelectorAll('.reservation-step');
    
    // Next button handlers
    reservationModal.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', function() {
            const nextStep = this.getAttribute('data-next');
            if (!nextStep) return;
            
            // Validate current step before proceeding
            if (nextStep === '2') {
                const nameInput = reservationModal.querySelector('input[name="guestName"]');
                const emailInput = reservationModal.querySelector('input[name="email"]');
                
                if (!nameInput.value.trim()) {
                    showInputError(nameInput, 'Please enter your name');
                    return;
                }
                
                if (!emailInput.value.trim()) {
                    showInputError(emailInput, 'Please enter your email');
                    return;
                }
                
                if (!validateEmail(emailInput.value.trim())) {
                    showInputError(emailInput, 'Please enter a valid email address');
                    return;
                }
            }
            
            // Update steps
            steps.forEach(step => {
                const stepNum = step.getAttribute('data-step');
                
                if (parseInt(stepNum) < parseInt(nextStep)) {
                    step.classList.add('complete');
                    step.classList.remove('active');
                } else if (stepNum === nextStep) {
                    step.classList.add('active');
                    step.classList.remove('complete');
                } else {
                    step.classList.remove('active', 'complete');
                }
            });
            
            // Update progress line
            progressLine.className = 'progress-line';
            progressLine.classList.add(`step${nextStep}`);
            
            // Show appropriate step content
            stepContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `step${nextStep}`) {
                    content.classList.add('active');
                    
                    // If moving to step 3 (summary), update the summary information
                    if (nextStep === '3') {
                        updateReservationSummary();
                    }
                }
            });
        });
    });
    
    // Previous button handlers
    reservationModal.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', function() {
            const prevStep = this.getAttribute('data-prev');
            if (!prevStep) return;
            
            // Update steps
            steps.forEach(step => {
                const stepNum = step.getAttribute('data-step');
                
                if (parseInt(stepNum) < parseInt(prevStep)) {
                    step.classList.add('complete');
                    step.classList.remove('active');
                } else if (stepNum === prevStep) {
                    step.classList.add('active');
                    step.classList.remove('complete');
                } else {
                    step.classList.remove('active', 'complete');
                }
            });
            
            // Update progress line
            progressLine.className = 'progress-line';
            progressLine.classList.add(`step${prevStep}`);
            
            // Show appropriate step content
            stepContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `step${prevStep}`) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Guest counter functionality
    const decreaseBtn = reservationModal.querySelector('#decreaseGuests');
    const increaseBtn = reservationModal.querySelector('#increaseGuests');
    const guestInput = reservationModal.querySelector('input[name="seats"]');
    const guestIcons = reservationModal.querySelectorAll('.guest-icon:not(.host):not(.more)');
    const pluralSpan = reservationModal.querySelector('.guest-counter .plural');
    
    // Initialize guest count from input
    updateGuestIcons(parseInt(guestInput.value));
    updatePluralText(parseInt(guestInput.value));
    
    decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(guestInput.value);
        if (currentValue > 1) {
            guestInput.value = currentValue - 1;
            updateGuestIcons(currentValue - 1);
            updatePluralText(currentValue - 1);
            updatePriceTotal();
        }
    });
    
    increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(guestInput.value);
        const maxGuests = parseInt(guestInput.getAttribute('max') || 10);
        
        if (currentValue < maxGuests) {
            guestInput.value = currentValue + 1;
            updateGuestIcons(currentValue + 1);
            updatePluralText(currentValue + 1);
            updatePriceTotal();
        }
    });
    
    // Function to update guest icons
    function updateGuestIcons(count) {
        guestIcons.forEach((icon, index) => {
            if (index < count - 1) {
                icon.classList.add('active');
            } else {
                icon.classList.remove('active');
            }
        });
    }
    
    // Function to update plural text
    function updatePluralText(count) {
        if (count === 1) {
            pluralSpan.textContent = '';
        } else {
            pluralSpan.textContent = 's';
        }
    }
    
    // Helper function to show input validation errors
    function showInputError(input, message) {
        input.classList.add('is-invalid');
        
        // Remove any existing error message
        const existingError = input.nextElementSibling;
        if (existingError && existingError.classList.contains('invalid-feedback')) {
            existingError.remove();
        }
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
        
        // Add event listener to remove error on input
        input.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            const feedback = this.nextElementSibling;
            if (feedback && feedback.classList.contains('invalid-feedback')) {
                feedback.remove();
            }
        }, { once: true });
    }
    
    // Email validation helper function
    function validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
    
    // Update summary information based on form inputs
    function updateReservationSummary() {
        const nameInput = reservationModal.querySelector('input[name="guestName"]');
        const seatsInput = reservationModal.querySelector('input[name="seats"]');
        const preferencesInputs = reservationModal.querySelectorAll('input[name="preferences[]"]:checked');
        const notesInput = reservationModal.querySelector('textarea[name="notes"]');
        
        const summaryGuests = document.getElementById('summaryGuests');
        const summaryPreferences = document.getElementById('summaryPreferences');
        const summaryNotes = document.getElementById('summaryNotes');
        
        // Update guest count
        if (summaryGuests) {
            summaryGuests.textContent = seatsInput.value;
        }
        
        // Update dietary preferences
        if (summaryPreferences) {
            const preferences = Array.from(preferencesInputs).map(input => input.nextElementSibling.textContent.trim());
            summaryPreferences.textContent = preferences.length > 0 ? preferences.join(', ') : 'None specified';
        }
        
        // Update notes
        if (summaryNotes) {
            summaryNotes.textContent = notesInput.value.trim() ? notesInput.value.trim() : 'None';
        }
    }
    
    // Update price total when guest count changes
    function updatePriceTotal() {
        const seatsInput = reservationModal.querySelector('input[name="seats"]');
        const priceElement = document.getElementById('reservationPrice');
        const totalElement = document.getElementById('reservationTotal');
        
        if (priceElement && totalElement) {
            const priceText = priceElement.textContent;
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            const seats = parseInt(seatsInput.value);
            
            const total = (price * seats).toFixed(2);
            totalElement.textContent = `$${total}`;
        }
    }
}

/**
 * Enhance the reservation modal experience
 * - Adds smooth animations for modal open/close
 * - Improves form interactions
 * - Provides visual feedback during input
 */
function enhanceReservationModal() {
    const reservationModal = document.getElementById('reservationModal');
    if (!reservationModal) return;
    
    // Add animation when modal opens
    reservationModal.addEventListener('show.bs.modal', () => {
        setTimeout(() => {
            const modalDialog = reservationModal.querySelector('.modal-dialog');
            if (modalDialog) {
                modalDialog.style.transform = 'translateY(0)';
                modalDialog.style.opacity = '1';
            }
        }, 150);
    });
    
    // Add animation when modal closes
    reservationModal.addEventListener('hide.bs.modal', () => {
        const modalDialog = reservationModal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.style.transform = 'translateY(20px)';
            modalDialog.style.opacity = '0';
        }
    });
    
    // Initialize modal dialog position for animations
    const modalDialog = reservationModal.querySelector('.modal-dialog');
    if (modalDialog) {
        modalDialog.style.transform = 'translateY(20px)';
        modalDialog.style.opacity = '0';
        modalDialog.style.transition = 'all 0.3s ease-out';
    }
    
    // Add live validation to form fields
    const seatsInput = reservationModal.querySelector('input[name="seats"]');
    if (seatsInput) {
        seatsInput.addEventListener('input', () => {
            // Add visual feedback for seats input
            const currentValue = parseInt(seatsInput.value) || 0;
            const maxValue = parseInt(seatsInput.getAttribute('max')) || 10;
            
            if (currentValue > maxValue) {
                seatsInput.classList.add('is-invalid');
            } else if (currentValue <= 0) {
                seatsInput.classList.add('is-invalid');
            } else {
                seatsInput.classList.remove('is-invalid');
                seatsInput.classList.add('is-valid');
            }
        });
    }
    
    // Add animation to price total when it changes
    const observeTotal = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'characterData') {
                const element = mutation.target.parentNode;
                element.classList.add('price-updated');
                setTimeout(() => element.classList.remove('price-updated'), 500);
            }
        });
    });
    
    const totalElement = document.getElementById('reservationTotal');
    if (totalElement) {
        observeTotal.observe(totalElement, { 
            characterData: true, 
            subtree: true 
        });
    }

    // Highlight spots when running low
    const spotsLeftElement = document.getElementById('spotsLeft');
    if (spotsLeftElement) {
        // Add an observer to watch for changes to the spots left
        const spotsObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData') {
                    const spots = parseInt(mutation.target.nodeValue) || 0;
                    const badgeElement = spotsLeftElement.closest('.spots-badge');
                    
                    if (spots <= 3 && spots > 0) {
                        spotsLeftElement.classList.add('spots-low');
                        if (badgeElement) {
                            badgeElement.style.backgroundColor = '#FFC107'; // Warning color
                        }
                    } else if (spots <= 0) {
                        spotsLeftElement.classList.add('spots-low');
                        if (badgeElement) {
                            badgeElement.style.backgroundColor = '#DC3545'; // Danger color
                        }
                    } else {
                        spotsLeftElement.classList.remove('spots-low');
                        if (badgeElement) {
                            badgeElement.style.backgroundColor = '#28a745'; // Success color
                        }
                    }
                }
            });
        });
        
        spotsObserver.observe(spotsLeftElement.firstChild, { 
            characterData: true 
        });
    }
    
    // Initialize multi-step reservation functionality
    enhanceMultiStepReservation();
}

/**
 * Enhance the filter chips functionality
 * - Adds click interactions to filter dinner cards
 * - Updates the current filter indicator
 * - Provides visual feedback during filter selection
 */
function enhanceFilterChips() {
    const filterChips = document.querySelectorAll('.filter-chip');
    
    if (!filterChips.length) return;
    
    filterChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Use the enhanced filter animation function from app.js
            if (typeof applyFilterWithAnimation === 'function') {
                applyFilterWithAnimation(this);
            } else {
                // Fallback if applyFilterWithAnimation is not available
                filterChips.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                
                const filterType = this.getAttribute('data-filter');
                if (window.appState) {
                    window.appState.filter = filterType;
                }
                
                if (typeof filterDinners === 'function') {
                    filterDinners();
                }
            }
        });    });
}

/**
 * Initialize tooltip functionality for all elements with data-toggle="tooltip"
 */
function initTooltips() {
    const tooltipElements = document.querySelectorAll('[data-toggle="tooltip"]');
    tooltipElements.forEach(el => {
        new bootstrap.Tooltip(el);
    });
}

// Add styles for reservation modal animations
document.head.insertAdjacentHTML('beforeend', `
    <style>
    @keyframes priceUpdate {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); color: #FF8A50; }
        100% { transform: scale(1); }
    }
    
    .price-updated {
        animation: priceUpdate 0.5s ease;
    }
    
    /* Additional modal animations */
    @keyframes badgePulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .spots-badge {
        transition: all 0.3s ease;
    }
    
    .spots-badge:hover {
        transform: scale(1.05);
        animation: badgePulse 1.5s infinite;
    }
    </style>
`);