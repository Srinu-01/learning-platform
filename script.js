class AptitudeApp {
    constructor() {
        this.currentSection = 'hero'; // Ensure hero is set as initial section
        // Update topic names to match the actual JSON files in your data folder
        this.topics = [
            'Age_topic',
            'Calendars_topic',
            'Mixture_Alligation',
            'Permutation_and_Combination',
            'Pipes_Cisterns',
            'Profit_and_Loss_topic',
            'Simple_Interest',
            'Speed_Time_Distance_topic'
        ];
        this.questions = {};
        this.currentTopic = null;
        this.currentQuestionIndex = 0;
        this.score = 0;

        this.userProgress = this.loadProgress();
        this.animations = {
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        };

        this.quizStartTime = null;
        this.quizEndTime = null;

        this.initializeApp();
        this.setupHeroAnimations();
        // Ensure only hero section is visible initially
        this.hideAllSectionsExceptHero();

        // Add error handling for quiz initialization
        this.initError = null;
        
        // Add exit quiz handler
        this.setupExitQuizHandler();

        this.currentMode = null; // 'preparation' or 'testing'
        this.currentModule = null; // For preparation mode
        this.activeQuestions = []; // Questions for the current quiz/module
    }

    hideAllSectionsExceptHero() {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            if (!section.classList.contains('hero-section')) {
                section.style.display = 'none';
                section.classList.remove('active');
            }
        });
    }

    async initializeApp() {
        // Only load other sections when needed
        this.setupEventListeners();
        this.setupThemeToggle();
        this.setupHeroAnimations();
        // Remove initial renderTopics call
    }

    async loadQuestions() {
        const loadingState = document.querySelector('.loading-state');
        if (loadingState) loadingState.style.display = 'flex';

        try {
            await Promise.all(this.topics.map(async (topic) => {
                try {
                    // Add better error handling for file loading
                    const response = await fetch(`data/${topic}.json`);
                    if (!response.ok) {
                        console.warn(`HTTP error loading ${topic}: ${response.status}`);
                        this.questions[topic] = [];
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        this.questions[topic] = data;
                    } else {
                        console.warn(`Data for ${topic} is not in array format`);
                        this.questions[topic] = [];
                        throw new Error(`Invalid data format for ${topic}`);
                    }
                } catch (error) {
                    console.error(`Failed to load ${topic}:`, error);
                    this.questions[topic] = [];
                    this.initError = `Failed to load ${topic}: ${error.message}`;
                }
            }));
        } catch (error) {
            console.error('Failed to load questions:', error);
            this.initError = 'Failed to load questions: ' + error.message;
        } finally {
            if (loadingState) loadingState.style.display = 'none';
            
            if (this.initError) {
                const topicsGrid = document.querySelector('.topics-grid');
                if (topicsGrid) {
                    topicsGrid.innerHTML = `
                        <div class="error-message">
                            <p>Error: ${this.initError}</p>
                            <p>Make sure your data files are in the correct location and have the correct names.</p>
                            <button onclick="location.reload()">Retry</button>
                        </div>
                    `;
                }
            }
        }
    }

    loadProgress() {
        return JSON.parse(localStorage.getItem('userProgress') || '{}');
    }

    saveProgress() {
        localStorage.setItem('userProgress', JSON.stringify(this.userProgress));
    }

    setupEventListeners() {
        // Replace the old CTA button listener with the new start button listener
        document.querySelector('.start-btn').addEventListener('click', () => {
            this.showSection('topics');
        });

        // Logo click should return to hero section
        document.querySelector('.logo').addEventListener('click', () => {
            this.showSection('hero');
        });

        document.querySelector('.topics-grid').addEventListener('click', (e) => {
            const topicCard = e.target.closest('.topic-card');
            if (topicCard) {
                this.startQuiz(topicCard.dataset.topic);
            }
        });

        document.querySelector('.next-btn').addEventListener('click', () => this.nextQuestion());
        document.querySelector('.prev-btn').addEventListener('click', () => this.previousQuestion());
        document.querySelector('.retry-btn').addEventListener('click', () => this.restartQuiz());
        document.querySelector('.home-btn').addEventListener('click', () => this.showSection('topics'));

        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.currentSection === 'quiz') {
                if (e.key === 'ArrowRight') this.nextQuestion();
                if (e.key === 'ArrowLeft') this.previousQuestion();
                if (e.key >= '1' && e.key <= '4') {
                    const options = document.querySelectorAll('.option');
                    if (options[e.key - 1]) options[e.key - 1].click();
                }
            }
        });

        // Mode selection listeners
        document.querySelector('.mode-selection-container').addEventListener('click', (e) => {
            const modeBtn = e.target.closest('.mode-btn');
            if (modeBtn) {
                if (modeBtn.classList.contains('preparation')) {
                    this.currentMode = 'preparation';
                    this.showModuleSelection();
                } else if (modeBtn.classList.contains('testing')) {
                    this.currentMode = 'testing';
                    this.startTestingMode();
                }
            }
        });
        
        // Module selection listeners
        document.querySelector('.modules-grid').addEventListener('click', (e) => {
            const moduleCard = e.target.closest('.module-card');
            if (moduleCard) {
                this.currentModule = parseInt(moduleCard.dataset.module);
                this.startPreparationMode();
            }
        });
        
        // Back button listeners
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.closest('section');
                if (section.id === 'mode-selection') {
                    this.showSection('topics');
                } else if (section.id === 'modules') {
                    this.showSection('mode-selection');
                }
            });
        });
    }

    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        themeToggle.addEventListener('click', () => {
            document.body.setAttribute('data-theme',
                document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
            );
        });
    }

    async showSection(sectionId) {
        // First, hide all sections with animation
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            if (section.id !== sectionId) {
                section.style.animation = 'fadeOut 0.3s ease-out forwards';
                section.classList.remove('active');
                setTimeout(() => {
                    section.style.display = 'none';
                }, 300);
            }
        });

        if (sectionId === 'topics') {
            const topicsGrid = document.querySelector('.topics-grid');
            
            let loadingState = document.querySelector('.loading-state');
            if (!loadingState) {
                loadingState = document.createElement('div');
                loadingState.className = 'loading-state';
                loadingState.innerHTML = `
                    <div class="loader"></div>
                    <p>Loading topics...</p>
                `;
                topicsGrid.appendChild(loadingState);
            }
            
            loadingState.style.display = 'flex';
            
            if (Object.keys(this.questions).length === 0) {
                await this.loadQuestions();
            }
            
            await this.renderTopics();
            loadingState.style.display = 'none';
        }

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            setTimeout(() => {
                targetSection.style.display = 'flex'; // Show the section first
                targetSection.classList.add('active');
                targetSection.style.animation = 'fadeIn 0.5s ease-out forwards';
            }, 300);
        }

        this.currentSection = sectionId;

        // Update header visibility
        const progressSummary = document.querySelector('.progress-summary');
        if (progressSummary) {
            progressSummary.style.display = sectionId === 'hero' ? 'none' : 'block';
        }
    }

    async renderTopics() {
        const topicsGrid = document.querySelector('.topics-grid');
        
        if (!topicsGrid) return;

        // Check if we have any questions loaded
        const hasQuestions = Object.values(this.questions).some(arr => arr.length > 0);
        
        if (!hasQuestions) {
            topicsGrid.innerHTML = `
                <div class="error-message">
                    <h3>No topics found</h3>
                    <p>Please make sure the data folder contains the proper JSON files:</p>
                    <ul>
                        ${this.topics.map(topic => `<li>${topic}.json</li>`).join('')}
                    </ul>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
            return;
        }

        const topics = this.topics.map(topic => {
            const progress = this.userProgress[topic] || { completed: 0, correct: 0 };
            const total = this.questions[topic]?.length || 0;
            const percentage = total ? Math.round((progress.completed / total) * 100) : 0;
            const displayName = topic.replace(/_/g, ' ');
            
            return `
                <div class="topic-card" data-topic="${topic}">
                    <h3>${displayName}</h3>
                    <div class="topic-progress">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                        <span>${progress.completed}/${total} Completed</span>
                    </div>
                    <div class="topic-stats">
                        <span>Total Questions: ${total}</span>
                        <span>Accuracy: ${progress.correct ? Math.round((progress.correct / progress.completed) * 100) : 0}%</span>
                    </div>
                </div>
            `;
        });

        // Add topics with fade-in animation
        topicsGrid.innerHTML = topics.join('');

        // Animate topic cards
        const cards = topicsGrid.querySelectorAll('.topic-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease-out';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    startQuiz(topic) {
        console.log(`Starting quiz selection for topic: ${topic}`);
        
        this.currentTopic = topic;
        
        // Verify that we have questions for this topic
        if (!this.questions[topic] || this.questions[topic].length === 0) {
            console.error(`No questions found for topic: ${topic}`);
            alert(`Sorry, no questions are available for ${topic}. Please try another topic.`);
            return;
        }
        
        console.log(`Found ${this.questions[topic].length} questions for ${topic}`);
        
        // Instead of starting quiz directly, show mode selection
        this.showSection('mode-selection');
        
        // Set the page title to reflect current topic
        const topicDisplayName = topic.replace(/_/g, ' ');
        document.title = `${topicDisplayName} | Aptitude Learning Platform`;
    }

    showModuleSelection() {
        this.showSection('modules');
        
        const modulesGrid = document.querySelector('.modules-grid');
        const moduleCount = Math.ceil(this.questions[this.currentTopic].length / 25);
        
        let moduleCards = '';
        
        for (let i = 1; i <= moduleCount; i++) {
            const startQ = (i - 1) * 25 + 1;
            const endQ = Math.min(i * 25, this.questions[this.currentTopic].length);
            
            // Get completion status from user progress
            let completionStatus = '';
            if (this.userProgress[this.currentTopic] && 
                this.userProgress[this.currentTopic].preparation &&
                this.userProgress[this.currentTopic].preparation[`module${i}`]) {
                const completed = this.userProgress[this.currentTopic].preparation[`module${i}`].completed;
                const total = endQ - startQ + 1;
                completionStatus = `<div class="module-progress">
                    <div class="progress-bar" style="width: ${(completed/total)*100}%"></div>
                    <span>${completed}/${total} Completed</span>
                </div>`;
            }
            
            moduleCards += `
                <div class="module-card" data-module="${i}">
                    <h3>Module ${i}</h3>
                    <p>Questions ${startQ}-${endQ}</p>
                    ${completionStatus}
                    <button class="start-module-btn">Start Module</button>
                </div>
            `;
        }
        
        modulesGrid.innerHTML = moduleCards;
    }

    startPreparationMode() {
        const startIdx = (this.currentModule - 1) * 25;
        const endIdx = Math.min(this.currentModule * 25, this.questions[this.currentTopic].length);
        
        this.activeQuestions = this.questions[this.currentTopic].slice(startIdx, endIdx);
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.quizStartTime = new Date();
        
        // Initialize module progress if not exists
        if (!this.userProgress[this.currentTopic]) {
            this.userProgress[this.currentTopic] = { completed: 0, correct: 0 };
        }
        if (!this.userProgress[this.currentTopic].preparation) {
            this.userProgress[this.currentTopic].preparation = {};
        }
        if (!this.userProgress[this.currentTopic].preparation[`module${this.currentModule}`]) {
            this.userProgress[this.currentTopic].preparation[`module${this.currentModule}`] = { 
                completed: 0, 
                lastQuestion: 0 
            };
        }
        
        // Resume from last question if available
        const lastQuestion = this.userProgress[this.currentTopic].preparation[`module${this.currentModule}`].lastQuestion;
        if (lastQuestion > 0 && lastQuestion < this.activeQuestions.length) {
            this.currentQuestionIndex = lastQuestion;
        }
        
        this.showSection('quiz');
        this.renderQuestion();
    }

    startTestingMode() {
        // Select 15 random questions from the topic
        const allQuestions = [...this.questions[this.currentTopic]];
        this.activeQuestions = [];
        
        // Initialize testing progress if needed
        if (!this.userProgress[this.currentTopic]) {
            this.userProgress[this.currentTopic] = { completed: 0, correct: 0 };
        }
        if (!this.userProgress[this.currentTopic].testing) {
            this.userProgress[this.currentTopic].testing = { attempts: 0, bestScore: 0 };
        }
        
        // Increment attempts counter
        this.userProgress[this.currentTopic].testing.attempts++;
        this.saveProgress();
        
        // Shuffle and select 15 questions
        for (let i = 0; i < 15 && allQuestions.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * allQuestions.length);
            this.activeQuestions.push(allQuestions.splice(randomIndex, 1)[0]);
        }
        
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.quizStartTime = new Date();
        
        this.showSection('quiz');
        this.renderQuestion();
    }

    renderQuestion() {
        try {
            if (!this.currentTopic || !this.activeQuestions || this.activeQuestions.length === 0) {
                console.error('No current topic selected or questions not found');
                return;
            }
            
            const question = this.activeQuestions[this.currentQuestionIndex];
            if (!question) {
                console.error(`Question data not found at index ${this.currentQuestionIndex}`);
                return;
            }
            
            const questionContainer = document.querySelector('.question-container');
            const optionsContainer = document.querySelector('.options-container');
            const explanationContainer = document.querySelector('.explanation-container');

            // Clear any previous explanation
            explanationContainer.innerHTML = '';

            // Get total questions for current mode
            const totalQuestions = this.activeQuestions.length;

            // Update question content with HTML escaping for security
            const safeQuestion = this.escapeHTML(question.question);
            const topicName = this.currentTopic.replace(/_/g, ' ');
            const modeLabel = this.currentMode === 'preparation' ? 
                `Module ${this.currentModule}` : 'Knowledge Test';
            
            questionContainer.innerHTML = `
                <span class="question-number">Question ${this.currentQuestionIndex + 1} of ${totalQuestions}</span>
                <h3 class="question-text">${safeQuestion}</h3>
                <div class="topic-badge">${topicName} (${modeLabel})</div>
            `;
            
            // Make sure options exist
            if (!Array.isArray(question.options) || question.options.length === 0) {
                optionsContainer.innerHTML = '<div class="error">No options available for this question</div>';
            } else {
                optionsContainer.innerHTML = question.options.map((option, index) => `
                    <div class="option" data-index="${index}">${this.escapeHTML(option)}</div>
                `).join('');
            }

            this.updateQuizProgress();
            this.setupOptionListeners();
            
            // Add letter markers to options (A, B, C, D)
            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            const optionElements = document.querySelectorAll('.option');
            optionElements.forEach((option, index) => {
                if (index < letters.length) {
                    option.setAttribute('data-letter', letters[index]);
                }
            });
        } catch (error) {
            console.error('Error rendering question:', error);
        }
    }

    setupOptionListeners() {
        document.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', (e) => this.handleAnswerSelection(e));
        });
    }

    handleAnswerSelection(e) {
        if (e.target.classList.contains('answered')) return;

        const selectedOption = e.target;
        const question = this.activeQuestions[this.currentQuestionIndex];
        
        if (!question) {
            console.error('Question not found');
            return;
        }

        try {
            // Trim whitespace from options and answer for more reliable comparison
            const selectedText = selectedOption.textContent.trim();
            const correctAnswer = question.answer.trim();
            
            // Check if the selected option matches the answer (two ways)
            const isCorrect = 
                selectedText === correctAnswer || 
                question.options[selectedOption.dataset.index].trim() === correctAnswer;

            selectedOption.style.transition = `background-color ${this.animations.duration}ms ${this.animations.easing}`;
            selectedOption.classList.add('answered', isCorrect ? 'correct' : 'wrong');

            // Update progress with error handling
            if (!this.userProgress[this.currentTopic]) {
                this.userProgress[this.currentTopic] = { completed: 0, correct: 0 };
            }
            
            // Ensure we don't count the same question twice
            if (!selectedOption.dataset.counted) {
                this.userProgress[this.currentTopic].completed++;
                
                // Update module-specific progress if in preparation mode
                if (this.currentMode === 'preparation') {
                    const moduleKey = `module${this.currentModule}`;
                    if (!this.userProgress[this.currentTopic].preparation) {
                        this.userProgress[this.currentTopic].preparation = {};
                    }
                    if (!this.userProgress[this.currentTopic].preparation[moduleKey]) {
                        this.userProgress[this.currentTopic].preparation[moduleKey] = { completed: 0, lastQuestion: 0 };
                    }
                    this.userProgress[this.currentTopic].preparation[moduleKey].completed++;
                }
                
                if (isCorrect) {
                    this.userProgress[this.currentTopic].correct++;
                    this.score++;
                }
                selectedOption.dataset.counted = 'true';
            }

            this.saveProgress();
            this.showExplanation(question, isCorrect);
        } catch (error) {
            console.error('Error handling answer selection:', error);
        }
    }

    showExplanation(question, isCorrect) {
        const explanationContainer = document.querySelector('.explanation-container');
        if (!explanationContainer) return;

        const icon = isCorrect ? '✅' : '❌';
        const result = isCorrect ? 'Correct!' : 'Incorrect';
        
        explanationContainer.innerHTML = `
            <div class="explanation ${isCorrect ? 'correct' : 'wrong'}">
                <h4>${icon} ${result}</h4>
                <p>${question.explanation || 'No explanation available.'}</p>
            </div>
        `;
        
        // Scroll to explanation
        setTimeout(() => {
            explanationContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    updateQuizProgress() {
        const total = this.activeQuestions.length;
        document.querySelector('.question-counter').textContent = 
            `Question ${this.currentQuestionIndex + 1} of ${total}`;
        
        // Update progress bar based on total questions
        const progress = ((this.currentQuestionIndex + 1) / total) * 100;
        document.querySelector('.progress-bar').style.width = `${progress}%`;
        
        // Enable/disable navigation buttons based on question index
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        
        prevBtn.disabled = this.currentQuestionIndex === 0;
        
        if (this.currentQuestionIndex === total - 1) {
            nextBtn.textContent = 'Finish';
            nextBtn.classList.add('finish-btn');
        } else {
            nextBtn.textContent = 'Next';
            nextBtn.classList.remove('finish-btn');
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.activeQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
            // Scroll to top of quiz content smoothly
            document.querySelector('.quiz-content').scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            // If in preparation mode, save current position
            if (this.currentMode === 'preparation') {
                const moduleKey = `module${this.currentModule}`;
                this.userProgress[this.currentTopic].preparation[moduleKey].lastQuestion = this.currentQuestionIndex;
                this.saveProgress();
            }
        } else {
            this.showResults();
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderQuestion();
            // Scroll to top of quiz content smoothly
            document.querySelector('.quiz-content').scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            // If in preparation mode, save current position
            if (this.currentMode === 'preparation') {
                const moduleKey = `module${this.currentModule}`;
                this.userProgress[this.currentTopic].preparation[moduleKey].lastQuestion = this.currentQuestionIndex;
                this.saveProgress();
            }
        }
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showResults() {
        this.quizEndTime = new Date(); // Stop the timer
        const timeTaken = this.quizEndTime - this.quizStartTime;
        const total = this.activeQuestions.length;
        const percentage = (this.score / total) * 100;
        
        // Update circular progress
        const circle = document.querySelector('.progress-ring-circle');
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        // Update score percentage
        document.querySelector('.score-percentage').textContent = `${percentage.toFixed(0)}%`;
        
        // Update performance stats
        document.querySelector('.correct-answers').textContent = `${this.score}/${total}`;
        document.querySelector('.accuracy').textContent = `${percentage.toFixed(1)}%`;
        document.querySelector('.time-taken').textContent = this.formatTime(timeTaken);
        
        // Add mode-specific results summary
        const resultsSummary = document.querySelector('.results-summary');
        if (resultsSummary) {
            const topicName = this.currentTopic.replace(/_/g, ' ').replace(/\_topic/g, '');
            
            if (this.currentMode === 'preparation') {
                resultsSummary.innerHTML = `
                    <h3>Module ${this.currentModule} Completed</h3>
                    <p>You've completed Module ${this.currentModule} of ${topicName}. Great job!</p>
                    <p>Continue to other modules to master this topic.</p>
                `;
            } else { // Testing mode
                // Update best score if current score is better
                if (!this.userProgress[this.currentTopic].testing) {
                    this.userProgress[this.currentTopic].testing = { attempts: 1, bestScore: percentage };
                } else if (percentage > this.userProgress[this.currentTopic].testing.bestScore) {
                    this.userProgress[this.currentTopic].testing.bestScore = percentage;
                }
                
                const attempts = this.userProgress[this.currentTopic].testing.attempts;
                const bestScore = this.userProgress[this.currentTopic].testing.bestScore.toFixed(1);
                
                resultsSummary.innerHTML = `
                    <h3>${topicName} Test Results</h3>
                    <p>You've completed test #${attempts} for this topic.</p>
                    <p>Your best score so far: <strong>${bestScore}%</strong></p>
                `;
            }
        }
        
        this.saveProgress();
        this.showSection('results');
    }

    saveScore() {
        // No need to modify this - it's handled in showResults
    }

    restartQuiz() {
        if (this.currentMode === 'preparation') {
            this.startPreparationMode();
        } else {
            this.startTestingMode();
        }
    }

    setupHeroAnimations() {
        const heroSection = document.querySelector('.hero-section');
        const features = document.querySelectorAll('.feature-card');
        const heroContent = document.querySelector('.hero-content');
        
        // Animate features on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = `fadeInUp 0.6s ease-out ${index * 0.2}s forwards`;
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        features.forEach(feature => observer.observe(feature));

        // Add smooth parallax effect on mouse move
        heroSection.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const { width, height } = heroSection.getBoundingClientRect();
            const x = (clientX / width - 0.5) * 20;
            const y = (clientY / height - 0.5) * 20;

            heroContent.style.transform = `translate(${x}px, ${y}px)`;
            heroContent.style.transition = 'transform 0.2s ease-out';
        });

        // Reset position when mouse leaves
        heroSection.addEventListener('mouseleave', () => {
            heroContent.style.transform = 'translate(0, 0)';
        });

        // Update the feature card text to show actual question count
        const totalQuestions = Object.values(this.questions).reduce((acc, topicQuestions) => 
            acc + topicQuestions.length, 0);
        
        const richContentCard = document.querySelector('.feature-card:nth-child(1) p');
        if (richContentCard) {
            richContentCard.textContent = `${totalQuestions || '100+'}+ carefully crafted questions`;
        }
    }

    setupExitQuizHandler() {
        document.querySelector('.exit-quiz').addEventListener('click', () => {
            if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
                this.saveProgress();
                if (this.currentMode === 'preparation') {
                    this.showModuleSelection();
                } else {
                    this.showSection('topics');
                }
            }
        });
    }

    // Add a helper method for HTML escaping
    escapeHTML(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AptitudeApp();
});
