class AptitudeApp {
    constructor() {
        this.currentSection = 'hero'; // Ensure hero is set as initial section
        this.topics = [
            'Age_Problems',
            'Calendars',
            'Mixture_Alligation',
            'Permutation_Combination',
            'Pipes_Cisterns',
            'Profit_Loss',
            'Simple_Interest',
            'Speed_Time_Distance'
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

        for (const topic of this.topics) {
            try {
                const response = await fetch(`data/${topic}.json`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                this.questions[topic] = data;
                // Removed console.log here
            } catch (error) {
                // Only log actual errors
                console.error(`Failed to load ${topic}`);
                this.questions[topic] = [];
            }
        }

        if (loadingState) loadingState.style.display = 'none';
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
        // First, hide all sections
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.style.animation = 'fadeOut 0.3s ease-out forwards';
            section.classList.remove('active');
            section.style.display = 'none'; // Add explicit display none
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

        const topics = this.topics.map(topic => {
            const progress = this.userProgress[topic] || { completed: 0, correct: 0 };
            const total = this.questions[topic]?.length || 0;
            const percentage = total ? Math.round((progress.completed / total) * 100) : 0;
            
            return `
                <div class="topic-card" data-topic="${topic}">
                    <h3>${topic.replace(/_/g, ' ')}</h3>
                    <div class="topic-progress">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                        <span>${progress.completed}/${total} Completed</span>
                    </div>
                    <div class="topic-stats">
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
        this.currentTopic = topic;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.quizStartTime = new Date(); // Start the timer
        this.showSection('quiz');
        this.renderQuestion();
    }

    renderQuestion() {
        const question = this.questions[this.currentTopic][this.currentQuestionIndex];
        const questionContainer = document.querySelector('.question-container');
        const optionsContainer = document.querySelector('.options-container');
        const explanationContainer = document.querySelector('.explanation-container');

        // Clear any previous explanation
        explanationContainer.innerHTML = '';

        // Update question content
        questionContainer.innerHTML = `<h3>${question.question}</h3>`;
        optionsContainer.innerHTML = question.options.map((option, index) => `
            <div class="option" data-index="${index}">${option}</div>
        `).join('');

        this.updateQuizProgress();
        this.setupOptionListeners();
    }

    setupOptionListeners() {
        document.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', (e) => this.handleAnswerSelection(e));
        });
    }

    handleAnswerSelection(e) {
        if (e.target.classList.contains('answered')) return;

        const selectedOption = e.target;
        const question = this.questions[this.currentTopic][this.currentQuestionIndex];
        const isCorrect = question.options[selectedOption.dataset.index] === question.answer;

        // Animate the selection
        selectedOption.style.transition = `background-color ${this.animations.duration}ms ${this.animations.easing}`;
        selectedOption.classList.add('answered', isCorrect ? 'correct' : 'wrong');

        // Update progress
        if (!this.userProgress[this.currentTopic]) {
            this.userProgress[this.currentTopic] = { completed: 0, correct: 0 };
        }
        this.userProgress[this.currentTopic].completed++;
        if (isCorrect) {
            this.userProgress[this.currentTopic].correct++;
            this.score++;
        }

        this.saveProgress();

        // Show explanation with animation
        const explanationContainer = document.querySelector('.explanation-container');
        explanationContainer.innerHTML = `
            <div class="explanation ${isCorrect ? 'correct' : 'wrong'}">
                <h4>${isCorrect ? '✨ Correct!' : '❌ Incorrect'}</h4>
                <p>${question.explanation}</p>
            </div>
        `;
    }

    updateQuizProgress() {
        const total = this.questions[this.currentTopic].length;
        document.querySelector('.question-counter').textContent = 
            `Question ${this.currentQuestionIndex + 1} of ${total}`;
        
        const progress = ((this.currentQuestionIndex + 1) / total) * 100;
        document.querySelector('.progress-bar').style.width = `${progress}%`;
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions[this.currentTopic].length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
            // Scroll to top of quiz content smoothly
            document.querySelector('.quiz-content').scrollTo({
                top: 0,
                behavior: 'smooth'
            });
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
        const total = this.questions[this.currentTopic].length;
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
        
        // Show the results section
        this.showSection('results');
        this.saveScore();
        
        // Animate stats
        const statValues = document.querySelectorAll('.stat-value');
        statValues.forEach(stat => {
            stat.style.animation = 'countUp 1s ease-out forwards';
        });
    }

    saveScore() {
        const scores = JSON.parse(localStorage.getItem('quizScores') || '{}');
        if (!scores[this.currentTopic]) scores[this.currentTopic] = [];
        
        scores[this.currentTopic].push({
            score: this.score,
            total: this.questions[this.currentTopic].length,
            date: new Date().toISOString()
        });
        
        localStorage.setItem('quizScores', JSON.stringify(scores));
    }

    restartQuiz() {
        this.startQuiz(this.currentTopic);
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
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AptitudeApp();
});
