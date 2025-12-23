class RegulationApp {
    constructor() {
        this.data = null;
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentView = 'dashboard';
        this.views = {};
        this.init();
    }

    async init() {
        // Initialize modules
        this.storage = this.Storage;
        this.animations = this.Animations;
        
        // Setup
        this.setupEventListeners();
        this.setupPWA();
        this.loadData();
        this.renderCurrentView();
        
        // Preload all views
        this.preloadViews();
    }

    // Storage Management
    Storage = {
        saveWorkingCopy: (data) => {
            try {
                localStorage.setItem('regulation_working_copy', JSON.stringify(data));
                return true;
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
                return false;
            }
        },

        loadWorkingCopy: () => {
            try {
                const saved = localStorage.getItem('regulation_working_copy');
                return saved ? JSON.parse(saved) : null;
            } catch (e) {
                console.warn('Failed to load from localStorage:', e);
                return null;
            }
        },

        clearWorkingCopy: () => {
            localStorage.removeItem('regulation_working_copy');
        }
    };

    // Animation System
    Animations = {
        slideIn: (element) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            
            requestAnimationFrame(() => {
                element.style.transition = 'opacity 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            });
        },

        bounce: (element) => {
            element.style.transform = 'scale(0.95)';
            requestAnimationFrame(() => {
                element.style.transition = 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                element.style.transform = 'scale(1)';
            });
        },

        pulse: (element) => {
            element.style.boxShadow = '0 0 0 0 rgba(99, 102, 241, 0.7)';
            element.animate([
                { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.7)' },
                { boxShadow: '0 0 0 10px rgba(99, 102, 241, 0)' }
            ], {
                duration: 1000,
                easing: 'ease-out'
            });
        }
    };

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
                this.Animations.bounce(e.currentTarget);
            });
        });

        // Import/Export
        document.getElementById('importBtn').addEventListener('click', () => {
            this.showDataModal();
            this.Animations.bounce(document.getElementById('importBtn'));
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
            this.Animations.bounce(document.getElementById('exportBtn'));
        });

        // File input
        document.getElementById('selectFileBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileImport(e.target.files[0]);
        });

        document.getElementById('downloadDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Modal
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.hideDataModal();
        });

        document.getElementById('dataModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideDataModal();
            }
        });

        // Date navigation (if needed)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideDataModal();
            }
        });
    }

    setupPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => console.log('Service Worker registered:', reg))
                .catch(err => console.log('Service Worker failed:', err));
        }

        // Prevent zoom on double-tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    loadData() {
        const saved = this.Storage.loadWorkingCopy();
        if (saved && this.validateData(saved)) {
            this.data = saved;
            this.updateDataStatus('Data loaded from working copy');
        } else {
            this.data = this.getDefaultData();
            this.updateDataStatus('Started with fresh data');
        }
    }

    validateData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.schemaVersion || !data.data) return false;
        return true;
    }

    getDefaultData() {
        return {
            schemaVersion: "1.0",
            data: {
                dailyLogs: {},
                relapses: [],
                workouts: [],
                moods: [],
                habits: {},
                settings: {
                    lastExport: null,
                    version: "1.0.0"
                }
            }
        };
    }

    switchView(view) {
        if (this.currentView === view) return;
        
        this.currentView = view;
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        this.renderCurrentView();
    }

    async preloadViews() {
        // Preload all view templates
        this.views = {
            dashboard: this.renderDashboard.bind(this),
            dopamine: this.renderDopamineTab.bind(this),
            workout: this.renderWorkoutTab.bind(this),
            moods: this.renderMoodsTab.bind(this),
            insights: this.renderInsightsTab.bind(this)
        };
    }

    renderCurrentView() {
        const container = document.getElementById('appContent');
        container.innerHTML = '<div class="loading"></div>';
        
        // Small delay for smooth transition
        setTimeout(() => {
            const viewFunction = this.views[this.currentView];
            if (viewFunction) {
                container.innerHTML = viewFunction();
                this.attachViewListeners();
                this.Animations.slideIn(container);
            } else {
                container.innerHTML = '<div class="text-center p-6">View not found</div>';
            }
        }, 50);
    }

    attachViewListeners() {
        // Attach listeners based on current view
        switch (this.currentView) {
            case 'dashboard':
                this.attachDashboardListeners();
                break;
            case 'dopamine':
                this.attachDopamineListeners();
                break;
            case 'workout':
                this.attachWorkoutListeners();
                break;
            case 'moods':
                this.attachMoodsListeners();
                break;
            case 'insights':
                this.attachInsightsListeners();
                break;
        }
    }

    // Dashboard View
    renderDashboard() {
        const todayData = this.getTodayData();
        const integrityScore = this.calculateIntegrityScore(todayData);
        const riskLevel = this.calculateRiskLevel(todayData);
        
        return `
            <div class="content-view">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Today's Regulation</h2>
                        <span class="status-badge status-${riskLevel.toLowerCase()}">${riskLevel}</span>
                    </div>
                    
                    <div class="card-subtitle">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                    
                    <div class="mb-6">
                        <div class="input-group">
                            <label class="input-label">Boredom Level</label>
                            <div class="range-container">
                                <div class="range-track">
                                    <div class="range-fill" style="width: ${(todayData.boredom || 0) * 10}%"></div>
                                    <div class="range-thumb" style="left: ${(todayData.boredom || 0) * 10}%"></div>
                                </div>
                                <input type="range" min="0" max="10" value="${todayData.boredom || 0}" 
                                       class="range-slider" id="boredomInput">
                                <div class="range-values">
                                    <span>Low</span>
                                    <span class="range-value">${todayData.boredom || 0}/10</span>
                                    <span>High</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label class="input-label">Stress Level</label>
                            <div class="range-container">
                                <div class="range-track">
                                    <div class="range-fill" style="width: ${(todayData.stress || 0) * 10}%"></div>
                                    <div class="range-thumb" style="left: ${(todayData.stress || 0) * 10}%"></div>
                                </div>
                                <input type="range" min="0" max="10" value="${todayData.stress || 0}" 
                                       class="range-slider" id="stressInput">
                                <div class="range-values">
                                    <span>Calm</span>
                                    <span class="range-value">${todayData.stress || 0}/10</span>
                                    <span>Stressed</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label class="input-label">Screen Time (hours)</label>
                            <input type="number" min="0" max="24" step="0.5" 
                                   value="${todayData.screenTime || 0}" 
                                   class="input-field" id="screenTimeInput">
                        </div>
                        
                        <div class="input-group">
                            <label class="input-label">PMO Status</label>
                            <select class="input-field" id="pmoStatusInput">
                                <option value="">-- Select --</option>
                                <option value="Passed" ${todayData.pmoStatus === 'Passed' ? 'selected' : ''}>Passed</option>
                                <option value="Relapsed" ${todayData.pmoStatus === 'Relapsed' ? 'selected' : ''}>Relapsed</option>
                            </select>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary w-full" id="saveDailyBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17 21 17 13 7 13 7 21"/>
                            <polyline points="7 3 7 8 15 8"/>
                        </svg>
                        Save Today's Data
                    </button>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${integrityScore}</div>
                        <div class="stat-label">Integrity Score</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${todayData.screenTime || 0}</div>
                        <div class="stat-label">Screen Hours</div>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Daily Habits</h3>
                    <div class="habits-grid">
                        ${this.renderHabitToggles()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Nutrition & Weight</h3>
                    <div class="input-group">
                        <label class="input-label">Calories</label>
                        <input type="number" class="input-field" id="caloriesInput" 
                               value="${todayData.calories || ''}" placeholder="Enter total calories">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Protein (grams)</label>
                        <input type="number" class="input-field" id="proteinInput" 
                               value="${todayData.protein || ''}" placeholder="Enter protein intake">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Morning Weight (kg)</label>
                        <input type="number" step="0.1" class="input-field" id="weightInput" 
                               value="${todayData.weight || ''}" placeholder="Optional">
                    </div>
                </div>
            </div>
        `;
    }

    attachDashboardListeners() {
        // Range sliders
        const sliders = ['boredomInput', 'stressInput'];
        sliders.forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const value = e.target.value;
                    const thumb = e.target.previousElementSibling?.querySelector('.range-thumb');
                    const fill = e.target.previousElementSibling?.querySelector('.range-fill');
                    const valueDisplay = e.target.nextElementSibling?.querySelector('.range-value');
                    
                    if (thumb) thumb.style.left = `${value * 10}%`;
                    if (fill) fill.style.width = `${value * 10}%`;
                    if (valueDisplay) valueDisplay.textContent = `${value}/10`;
                });
            }
        });

        // Save button
        const saveBtn = document.getElementById('saveDailyBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveDailyData());
        }

        // Habit toggles
        document.querySelectorAll('.habit-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const habit = e.currentTarget.dataset.habit;
                this.toggleHabit(habit);
                this.Animations.bounce(e.currentTarget);
            });
        });
    }

    // Dopamine Tab
    renderDopamineTab() {
        const monthData = this.getMonthData();
        const recentRelapses = this.getRecentRelapses();
        
        return `
            <div class="content-view">
                <div class="card">
                    <h2 class="card-title">PMO Calendar</h2>
                    <div class="calendar" id="pmoCalendar">
                        ${this.renderCalendar()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Log Relapse</h3>
                    <div class="input-group">
                        <label class="input-label">Cause</label>
                        <select class="input-field" id="relapseCause">
                            <option value="Boredom">Boredom</option>
                            <option value="Stress">Stress</option>
                            <option value="Habitual">Habitual</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label class="input-label">Time of Day</label>
                        <select class="input-field" id="relapseTime">
                            <option value="Morning">Morning (5AM-12PM)</option>
                            <option value="Afternoon">Afternoon (12PM-5PM)</option>
                            <option value="Evening">Evening (5PM-9PM)</option>
                            <option value="Night">Night (9PM-5AM)</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label class="input-label">Notes (Optional)</label>
                        <textarea class="input-field" id="relapseNotes" rows="2" placeholder="Any additional context..."></textarea>
                    </div>
                    <button class="btn btn-primary w-full mt-4" id="logRelapseBtn">
                        Log Relapse
                    </button>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Pattern Insights</h3>
                    ${this.renderPatternInsights()}
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Relapse Risk Meter</h3>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${this.calculateRiskPercentage()}%"></div>
                        </div>
                    </div>
                    <div class="text-center mt-3">
                        <div class="text-gradient font-bold">${this.getRiskDescription()}</div>
                        <div class="text-secondary text-sm mt-1">Based on recent patterns</div>
                    </div>
                </div>
            </div>
        `;
    }

    attachDopamineListeners() {
        const logBtn = document.getElementById('logRelapseBtn');
        if (logBtn) {
            logBtn.addEventListener('click', () => this.logRelapse());
        }

        // Calendar day clicks
        document.querySelectorAll('.day-cell:not(.empty)').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const date = e.currentTarget.dataset.date;
                if (date) {
                    this.viewDayDetails(date);
                }
            });
        });
    }

    // Workout Tab
    renderWorkoutTab() {
        const workouts = this.getRecentWorkouts(5);
        const lastWorkout = this.getLastWorkoutDate();
        
        return `
            <div class="content-view">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Workout Log</h2>
                        <div class="text-gradient font-bold">${lastWorkout}</div>
                    </div>
                    
                    <div class="input-group">
                        <label class="input-label">Workout Type</label>
                        <select class="input-field" id="workoutType">
                            <option value="Push">Push Day</option>
                            <option value="Pull">Pull Day</option>
                            <option value="Legs">Leg Day</option>
                            <option value="Upper">Upper Body</option>
                            <option value="Lower">Lower Body</option>
                            <option value="Full">Full Body</option>
                            <option value="Cardio">Cardio</option>
                            <option value="Yoga">Yoga/Stretching</option>
                        </select>
                    </div>
                    
                    <div class="mb-4" id="exerciseEntries">
                        ${this.renderExerciseEntries()}
                    </div>
                    
                    <div class="flex gap-4">
                        <button class="btn btn-secondary flex-1" id="addExerciseBtn">
                            + Add Exercise
                        </button>
                        <button class="btn btn-primary flex-1" id="logWorkoutBtn">
                            Log Workout
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Recent Workouts</h3>
                    ${this.renderWorkoutHistory(workouts)}
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${this.getWorkoutStreak()}</div>
                        <div class="stat-label">Day Streak</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.getMonthlyVolume()}</div>
                        <div class="stat-label">Monthly Volume</div>
                    </div>
                </div>
            </div>
        `;
    }

    attachWorkoutListeners() {
        const addBtn = document.getElementById('addExerciseBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addExerciseEntry());
        }

        const logBtn = document.getElementById('logWorkoutBtn');
        if (logBtn) {
            logBtn.addEventListener('click', () => this.logWorkout());
        }

        // Exercise entry removal
        document.querySelectorAll('.remove-exercise').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.exercise-entry').remove();
            });
        });
    }

    // Moods Tab
    renderMoodsTab() {
        const moodTimeline = this.getMoodTimeline();
        
        return `
            <div class="content-view">
                <div class="card">
                    <h2 class="card-title mb-4">Mood Timeline</h2>
                    <div class="timeline">
                        ${this.renderMoodTimeline(moodTimeline)}
                    </div>
                    <button class="btn btn-primary w-full mt-4" id="addMoodBtn">
                        + Add Mood Entry
                    </button>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Boredom & Stress Heatmap</h3>
                    <div class="calendar">
                        ${this.renderHeatmap()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Screen Time Correlation</h3>
                    ${this.renderScreenTimeCorrelation()}
                </div>
            </div>
        `;
    }

    attachMoodsListeners() {
        const addBtn = document.getElementById('addMoodBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddMoodModal());
        }
    }

    // Insights Tab
    renderInsightsTab() {
        return `
            <div class="content-view">
                <div class="card">
                    <h2 class="card-title mb-4">Weekly Summary</h2>
                    <div class="insight-box glass p-6 rounded-xl">
                        ${this.generateWeeklySummary()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">PMO Patterns</h3>
                    ${this.generatePMOInsights()}
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Workout Protection</h3>
                    ${this.generateWorkoutInsights()}
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Habits & Stability</h3>
                    ${this.generateHabitInsights()}
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-4">Screen Time Effects</h3>
                    ${this.generateScreenTimeInsights()}
                </div>
            </div>
        `;
    }

    attachInsightsListeners() {
        // No special listeners needed for insights
    }

    // Data Methods
    getTodayData() {
        return this.data?.data?.dailyLogs?.[this.currentDate] || {};
    }

    getMonthData() {
        const month = this.currentDate.substring(0, 7);
        const monthData = {};
        
        Object.keys(this.data?.data?.dailyLogs || {}).forEach(date => {
            if (date.startsWith(month)) {
                monthData[date] = this.data.data.dailyLogs[date];
            }
        });
        
        return monthData;
    }

    saveDailyData() {
        const todayData = {
            boredom: parseInt(document.getElementById('boredomInput')?.value) || 0,
            stress: parseInt(document.getElementById('stressInput')?.value) || 0,
            screenTime: parseFloat(document.getElementById('screenTimeInput')?.value) || 0,
            pmoStatus: document.getElementById('pmoStatusInput')?.value || '',
            calories: parseInt(document.getElementById('caloriesInput')?.value) || 0,
            protein: parseInt(document.getElementById('proteinInput')?.value) || 0,
            weight: parseFloat(document.getElementById('weightInput')?.value) || null,
            timestamp: new Date().toISOString()
        };

        // Save habits
        document.querySelectorAll('.habit-toggle').forEach(toggle => {
            const habit = toggle.dataset.habit;
            todayData[`habit_${habit}`] = toggle.classList.contains('active');
        });

        if (!this.data.data.dailyLogs) this.data.data.dailyLogs = {};
        this.data.data.dailyLogs[this.currentDate] = todayData;
        
        this.Storage.saveWorkingCopy(this.data);
        this.showToast('Daily data saved successfully');
        
        // Update UI
        setTimeout(() => this.renderCurrentView(), 500);
    }

    logRelapse() {
        const cause = document.getElementById('relapseCause')?.value;
        const time = document.getElementById('relapseTime')?.value;
        const notes = document.getElementById('relapseNotes')?.value;
        
        if (!cause) {
            this.showToast('Please select a cause', 'error');
            return;
        }
        
        const relapse = {
            date: this.currentDate,
            cause,
            time,
            notes: notes || '',
            timestamp: new Date().toISOString()
        };
        
        if (!this.data.data.relapses) this.data.data.relapses = [];
        this.data.data.relapses.push(relapse);
        
        // Update today's PMO status
        if (!this.data.data.dailyLogs[this.currentDate]) {
            this.data.data.dailyLogs[this.currentDate] = {};
        }
        this.data.data.dailyLogs[this.currentDate].pmoStatus = 'Relapsed';
        
        this.Storage.saveWorkingCopy(this.data);
        this.showToast('Relapse logged');
        
        // Clear form
        document.getElementById('relapseNotes').value = '';
        
        // Update view
        setTimeout(() => this.renderCurrentView(), 500);
    }

    toggleHabit(habit) {
        const toggle = document.querySelector(`[data-habit="${habit}"]`);
        if (!toggle) return;
        
        toggle.classList.toggle('active');
        
        // Save immediately
        const todayData = this.getTodayData();
        todayData[`habit_${habit}`] = toggle.classList.contains('active');
        
        if (!this.data.data.dailyLogs) this.data.data.dailyLogs = {};
        this.data.data.dailyLogs[this.currentDate] = todayData;
        
        this.Storage.saveWorkingCopy(this.data);
    }

    // Helper Methods
    renderHabitToggles() {
        const habits = [
            { id: 'hygiene', icon: '🚿', name: 'Hygiene' },
            { id: 'workout', icon: '💪', name: 'Workout' },
            { id: 'calories', icon: '🍎', name: 'Calories' },
            { id: 'journal', icon: '📓', name: 'Journal' }
        ];
        
        const todayData = this.getTodayData();
        
        return habits.map(habit => `
            <div class="habit-toggle ${todayData[`habit_${habit.id}`] ? 'active' : ''}" 
                 data-habit="${habit.id}">
                <div class="habit-icon">${habit.icon}</div>
                <div class="habit-name">${habit.name}</div>
            </div>
        `).join('');
    }

    renderCalendar() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        
        let html = '';
        
        // Day headers
        ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(day => {
            html += `<div class="day-cell neutral">${day}</div>`;
        });
        
        // Empty cells for offset
        for (let i = 0; i < startDay; i++) {
            html += '<div class="day-cell empty"></div>';
        }
        
        // Days of month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayData = this.data?.data?.dailyLogs?.[dateStr];
            
            let cellClass = 'neutral';
            if (dateStr === this.currentDate) cellClass += ' active';
            if (dayData?.pmoStatus === 'Passed') cellClass = 'green';
            if (dayData?.pmoStatus === 'Relapsed') cellClass = 'red';
            
            html += `<div class="day-cell ${cellClass}" data-date="${dateStr}">${day}</div>`;
        }
        
        return html;
    }

    calculateIntegrityScore(data) {
        let score = 100;
        
        // Deduct for high boredom/stress
        if (data.boredom > 7) score -= 20;
        if (data.stress > 7) score -= 20;
        
        // Deduct for screen time > 4 hours
        if (data.screenTime > 4) score -= (data.screenTime - 4) * 5;
        
        // Deduct for relapse
        if (data.pmoStatus === 'Relapsed') score -= 30;
        
        // Add for good habits
        const habits = ['hygiene', 'workout', 'calories', 'journal'];
        habits.forEach(habit => {
            if (data[`habit_${habit}`]) score += 5;
        });
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    calculateRiskLevel(data) {
        const score = this.calculateIntegrityScore(data);
        if (score >= 70) return 'Low';
        if (score >= 40) return 'Medium';
        return 'High';
    }

    calculateRiskPercentage() {
        const weekData = this.getWeekData();
        let risk = 30; // Base risk
        
        // Increase risk based on patterns
        if (weekData.relapseCount > 0) risk += 30;
        if (weekData.avgBoredom > 7) risk += 20;
        if (weekData.avgStress > 7) risk += 20;
        if (weekData.avgScreenTime > 6) risk += 10;
        
        return Math.min(100, risk);
    }

    getRiskDescription() {
        const risk = this.calculateRiskPercentage();
        if (risk < 40) return 'Low Risk';
        if (risk < 70) return 'Moderate Risk';
        return 'High Risk';
    }

    // Data Import/Export
    async handleFileImport(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const importedData = JSON.parse(text);
            
            if (this.validateData(importedData)) {
                this.data = importedData;
                this.Storage.saveWorkingCopy(this.data);
                this.updateDataStatus('Data imported successfully', 'success');
                this.renderCurrentView();
                this.showToast('Data imported successfully');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.updateDataStatus(`Import error: ${error.message}`, 'error');
            this.showToast('Import failed - invalid file format', 'error');
        }
    }

    exportData() {
        if (!this.data) {
            this.showToast('No data to export', 'error');
            return;
        }
        
        // Update export timestamp
        if (!this.data.data.settings) this.data.data.settings = {};
        this.data.data.settings.lastExport = new Date().toISOString();
        
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `regulation-data-${this.currentDate}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Data exported successfully');
    }

    // Modal Management
    showDataModal() {
        const modal = document.getElementById('dataModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideDataModal() {
        const modal = document.getElementById('dataModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    updateDataStatus(message, type = 'info') {
        const status = document.getElementById('importStatus');
        if (status) {
            status.textContent = message;
            status.className = `status-message ${type === 'success' ? 'success' : type === 'error' ? 'error' : ''}`;
        }
    }

    // Toast System
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        if (type === 'error') {
            toast.style.background = 'var(--gradient-danger)';
        } else if (type === 'warning') {
            toast.style.background = 'var(--gradient-warning)';
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Additional methods would be implemented here...
    // (Exercise entry rendering, workout logging, mood timeline, etc.)

    renderPatternInsights() {
        const patterns = this.analyzePatterns();
        return `
            <div class="insight-item">
                <div class="text-sm text-secondary mb-2">Most common cause:</div>
                <div class="text-lg font-bold mb-4">${patterns.topCause || 'No data'}</div>
                
                <div class="text-sm text-secondary mb-2">Peak time:</div>
                <div class="text-lg font-bold mb-4">${patterns.peakTime || 'No data'}</div>
                
                <div class="text-sm text-secondary mb-2">Avg boredom before:</div>
                <div class="text-lg font-bold">${patterns.avgBoredom || 'No data'}/10</div>
            </div>
        `;
    }

    analyzePatterns() {
        const relapses = this.data?.data?.relapses || [];
        if (relapses.length === 0) return {};
        
        // Analyze causes
        const causes = {};
        relapses.forEach(r => {
            causes[r.cause] = (causes[r.cause] || 0) + 1;
        });
        
        // Analyze times
        const times = {};
        relapses.forEach(r => {
            times[r.time] = (times[r.time] || 0) + 1;
        });
        
        // Find most common
        const topCause = Object.keys(causes).reduce((a, b) => causes[a] > causes[b] ? a : b, '');
        const peakTime = Object.keys(times).reduce((a, b) => times[a] > times[b] ? a : b, '');
        
        // Calculate average boredom before relapse
        const relapseDates = relapses.map(r => r.date);
        let totalBoredom = 0;
        let count = 0;
        
        relapseDates.forEach(date => {
            const dayData = this.data.data.dailyLogs[date];
            if (dayData && dayData.boredom !== undefined) {
                totalBoredom += dayData.boredom;
                count++;
            }
        });
        
        return {
            topCause,
            peakTime,
            avgBoredom: count > 0 ? (totalBoredom / count).toFixed(1) : 'No data'
        };
    }

    getRecentRelapses(limit = 5) {
        return (this.data?.data?.relapses || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
    }

    getRecentWorkouts(limit = 5) {
        return (this.data?.data?.workouts || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
    }

    getLastWorkoutDate() {
        const workouts = this.data?.data?.workouts || [];
        if (workouts.length === 0) return 'No workouts yet';
        
        const last = workouts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const daysAgo = Math.floor((new Date() - new Date(last.date)) / (1000 * 60 * 60 * 24));
        
        if (daysAgo === 0) return 'Today';
        if (daysAgo === 1) return 'Yesterday';
        return `${daysAgo} days ago`;
    }

    getWorkoutStreak() {
        const workouts = this.data?.data?.workouts || [];
        if (workouts.length === 0) return 0;
        
        const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();
        let streak = 0;
        let currentDate = new Date();
        
        // Check consecutive days
        for (let i = 0; i < dates.length; i++) {
            const workoutDate = new Date(dates[i]);
            const diffDays = Math.floor((currentDate - workoutDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === i) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    getMonthlyVolume() {
        const workouts = this.data?.data?.workouts || [];
        const month = this.currentDate.substring(0, 7);
        
        const monthlyWorkouts = workouts.filter(w => w.date.startsWith(month));
        const totalVolume = monthlyWorkouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
        
        return totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume;
    }

    renderExerciseEntries() {
        return `
            <div class="exercise-entry mb-4">
                <div class="flex justify-between items-center mb-2">
                    <div class="text-sm font-bold">Exercise #1</div>
                    <button class="remove-exercise text-secondary hover:text-primary">
                        ✕
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <input type="text" class="input-field text-sm" placeholder="Name" value="Bench Press">
                    </div>
                    <div>
                        <input type="number" class="input-field text-sm" placeholder="Sets" value="3">
                    </div>
                    <div>
                        <input type="number" class="input-field text-sm" placeholder="Reps" value="10">
                    </div>
                </div>
                <div class="mt-2">
                    <input type="number" class="input-field text-sm" placeholder="Weight (kg)" value="80">
                </div>
            </div>
        `;
    }

    addExerciseEntry() {
        const container = document.getElementById('exerciseEntries');
        if (!container) return;
        
        const count = container.querySelectorAll('.exercise-entry').length + 1;
        
        const entry = document.createElement('div');
        entry.className = 'exercise-entry mb-4';
        entry.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <div class="text-sm font-bold">Exercise #${count}</div>
                <button class="remove-exercise text-secondary hover:text-primary">
                    ✕
                </button>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <input type="text" class="input-field text-sm" placeholder="Name">
                </div>
                <div>
                    <input type="number" class="input-field text-sm" placeholder="Sets">
                </div>
                <div>
                    <input type="number" class="input-field text-sm" placeholder="Reps">
                </div>
            </div>
            <div class="mt-2">
                <input type="number" class="input-field text-sm" placeholder="Weight (kg)">
            </div>
        `;
        
        container.appendChild(entry);
        
        // Add event listener to remove button
        entry.querySelector('.remove-exercise').addEventListener('click', (e) => {
            entry.remove();
        });
    }

    logWorkout() {
        const type = document.getElementById('workoutType')?.value;
        const entries = Array.from(document.querySelectorAll('.exercise-entry'));
        
        const exercises = entries.map(entry => {
            const name = entry.querySelector('input[placeholder="Name"]')?.value;
            const sets = parseInt(entry.querySelector('input[placeholder="Sets"]')?.value) || 0;
            const reps = parseInt(entry.querySelector('input[placeholder="Reps"]')?.value) || 0;
            const weight = parseFloat(entry.querySelector('input[placeholder="Weight (kg)"]')?.value) || 0;
            
            return { name, sets, reps, weight };
        }).filter(ex => ex.name && ex.sets > 0);
        
        if (exercises.length === 0) {
            this.showToast('Add at least one exercise', 'error');
            return;
        }
        
        const totalVolume = exercises.reduce((sum, ex) => sum + (ex.sets * ex.reps * ex.weight), 0);
        
        const workout = {
            date: this.currentDate,
            type,
            exercises,
            totalVolume,
            timestamp: new Date().toISOString()
        };
        
        if (!this.data.data.workouts) this.data.data.workouts = [];
        this.data.data.workouts.push(workout);
        
        // Update today's workout habit
        const todayData = this.getTodayData();
        todayData.habit_workout = true;
        this.data.data.dailyLogs[this.currentDate] = todayData;
        
        this.Storage.saveWorkingCopy(this.data);
        this.showToast('Workout logged successfully');
        
        // Clear form
        document.getElementById('exerciseEntries').innerHTML = this.renderExerciseEntries();
        
        // Update view
        setTimeout(() => this.renderCurrentView(), 500);
    }

    renderWorkoutHistory(workouts) {
        if (workouts.length === 0) {
            return '<div class="text-center py-6 text-secondary">No workouts logged yet</div>';
        }
        
        return workouts.map(workout => `
            <div class="workout-item mb-4 p-4 bg-surface rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <div class="font-bold">${workout.type}</div>
                    <div class="text-sm text-secondary">${workout.date}</div>
                </div>
                <div class="text-sm text-secondary mb-2">${workout.exercises?.length || 0} exercises</div>
                <div class="text-sm">
                    <span class="text-gradient font-bold">${workout.totalVolume || 0}</span> kg total volume
                </div>
            </div>
        `).join('');
    }

    getMoodTimeline() {
        const todayData = this.getTodayData();
        const times = ['Morning', 'Afternoon', 'Evening', 'Night'];
        
        return times.map(time => ({
            time,
            mood: 'Neutral',
            energy: 5,
            note: ''
        }));
    }

    renderMoodTimeline(timeline) {
        return timeline.map(item => `
            <div class="timeline-item flex items-center gap-4 p-4 mb-3 bg-surface rounded-lg">
                <div class="w-20 text-sm font-bold">${item.time}</div>
                <div class="flex-1">
                    <div class="text-lg font-bold mb-1">${item.mood}</div>
                    <div class="text-sm text-secondary">Energy: ${item.energy}/10</div>
                </div>
                <button class="edit-mood btn-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    renderHeatmap() {
        // Simplified heatmap for 7 days
        let html = '';
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        
        days.forEach(day => {
            const intensity = Math.floor(Math.random() * 4); // 0-3
            const color = intensity === 0 ? 'bg-surface' : 
                         intensity === 1 ? 'bg-warning/20' :
                         intensity === 2 ? 'bg-warning/40' : 'bg-warning/60';
            
            html += `<div class="day-cell ${color}">${day}</div>`;
        });
        
        return html;
    }

    renderScreenTimeCorrelation() {
        const weekData = this.getWeekData();
        const correlation = weekData.screenTime > 0 ? (weekData.avgBoredom / weekData.screenTime).toFixed(2) : 0;
        
        return `
            <div class="text-center">
                <div class="text-4xl font-bold mb-2">${correlation}</div>
                <div class="text-sm text-secondary mb-4">Boredom per screen hour</div>
                <div class="text-xs text-secondary">
                    Higher values suggest screen time increases boredom
                </div>
            </div>
        `;
    }

    getWeekData() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const weekLogs = Object.entries(this.data?.data?.dailyLogs || {})
            .filter(([date]) => new Date(date) >= weekAgo)
            .map(([, data]) => data);
        
        const relapseCount = (this.data?.data?.relapses || [])
            .filter(r => new Date(r.date) >= weekAgo)
            .length;
        
        const avgBoredom = weekLogs.length > 0 ? 
            weekLogs.reduce((sum, d) => sum + (d.boredom || 0), 0) / weekLogs.length : 0;
        
        const avgStress = weekLogs.length > 0 ? 
            weekLogs.reduce((sum, d) => sum + (d.stress || 0), 0) / weekLogs.length : 0;
        
        const avgScreenTime = weekLogs.length > 0 ? 
            weekLogs.reduce((sum, d) => sum + (d.screenTime || 0), 0) / weekLogs.length : 0;
        
        return {
            relapseCount,
            avgBoredom: avgBoredom.toFixed(1),
            avgStress: avgStress.toFixed(1),
            avgScreenTime: avgScreenTime.toFixed(1)
        };
    }

    generateWeeklySummary() {
        const weekData = this.getWeekData();
        
        return `
            <div class="space-y-3">
                <div class="text-lg">
                    ${weekData.relapseCount > 0 ? 
                        `Relapsed ${weekData.relapseCount} time${weekData.relapseCount > 1 ? 's' : ''} this week` : 
                        'No relapses this week'}
                </div>
                <div class="text-lg">
                    Average boredom: ${weekData.avgBoredom}/10, stress: ${weekData.avgStress}/10
                </div>
                <div class="text-lg">
                    Screen time: ${weekData.avgScreenTime}h daily
                </div>
            </div>
        `;
    }

    generatePMOInsights() {
        const patterns = this.analyzePatterns();
        
        return `
            <div class="insight-item">
                <div class="mb-3">
                    <div class="text-sm text-secondary">Primary trigger:</div>
                    <div class="text-lg font-bold">${patterns.topCause || 'Insufficient data'}</div>
                </div>
                <div class="mb-3">
                    <div class="text-sm text-secondary">Most vulnerable time:</div>
                    <div class="text-lg font-bold">${patterns.peakTime || 'Insufficient data'}</div>
                </div>
                <div>
                    <div class="text-sm text-secondary">Success rate:</div>
                    <div class="text-lg font-bold">${this.calculateSuccessRate()}%</div>
                </div>
            </div>
        `;
    }

    calculateSuccessRate() {
        const logs = Object.values(this.data?.data?.dailyLogs || {});
        if (logs.length === 0) return 0;
        
        const passedDays = logs.filter(d => d.pmoStatus === 'Passed').length;
        return Math.round((passedDays / logs.length) * 100);
    }

    generateWorkoutInsights() {
        const workouts = this.data?.data?.workouts || [];
        const workoutDays = [...new Set(workouts.map(w => w.date))];
        
        const workoutProtection = this.calculateWorkoutProtection();
        
        return `
            <div class="insight-item">
                <div class="mb-3">
                    <div class="text-sm text-secondary">Total workouts:</div>
                    <div class="text-lg font-bold">${workouts.length}</div>
                </div>
                <div class="mb-3">
                    <div class="text-sm text-secondary">Workout days:</div>
                    <div class="text-lg font-bold">${workoutDays.length}</div>
                </div>
                <div>
                    <div class="text-sm text-secondary">Protection correlation:</div>
                    <div class="text-lg font-bold">${workoutProtection}%</div>
                </div>
            </div>
        `;
    }

    calculateWorkoutProtection() {
        const workoutDays = new Set((this.data?.data?.workouts || []).map(w => w.date));
        const relapseDays = new Set((this.data?.data?.relapses || []).map(r => r.date));
        
        let workoutAndRelapse = 0;
        let workoutNoRelapse = 0;
        
        workoutDays.forEach(day => {
            if (relapseDays.has(day)) {
                workoutAndRelapse++;
            } else {
                workoutNoRelapse++;
            }
        });
        
        const totalWorkoutDays = workoutDays.size;
        if (totalWorkoutDays === 0) return 0;
        
        return Math.round((workoutNoRelapse / totalWorkoutDays) * 100);
    }

    generateHabitInsights() {
        const logs = Object.values(this.data?.data?.dailyLogs || {});
        const habits = ['hygiene', 'workout', 'calories', 'journal'];
        
        const habitRates = habits.map(habit => {
            const completed = logs.filter(d => d[`habit_${habit}`]).length;
            const rate = logs.length > 0 ? Math.round((completed / logs.length) * 100) : 0;
            return { habit, rate };
        });
        
        return `
            <div class="insight-item">
                ${habitRates.map(({ habit, rate }) => `
                    <div class="mb-3">
                        <div class="flex justify-between items-center mb-1">
                            <div class="text-sm text-secondary capitalize">${habit}</div>
                            <div class="text-lg font-bold">${rate}%</div>
                        </div>
                        <div class="progress-bar h-1">
                            <div class="progress-fill" style="width: ${rate}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateScreenTimeInsights() {
        const logs = Object.values(this.data?.data?.dailyLogs || {}).filter(d => d.screenTime);
        if (logs.length === 0) {
            return '<div class="text-center py-4 text-secondary">No screen time data</div>';
        }
        
        const avgScreenTime = logs.reduce((sum, d) => sum + d.screenTime, 0) / logs.length;
        const highScreenDays = logs.filter(d => d.screenTime > 4).length;
        const highScreenPercent = Math.round((highScreenDays / logs.length) * 100);
        
        return `
            <div class="insight-item">
                <div class="mb-3">
                    <div class="text-sm text-secondary">Average daily:</div>
                    <div class="text-lg font-bold">${avgScreenTime.toFixed(1)}h</div>
                </div>
                <div class="mb-3">
                    <div class="text-sm text-secondary">Days >4h:</div>
                    <div class="text-lg font-bold">${highScreenPercent}%</div>
                </div>
                <div>
                    <div class="text-sm text-secondary">Correlation with boredom:</div>
                    <div class="text-lg font-bold">${this.calculateScreenBoredomCorrelation().toFixed(2)}</div>
                </div>
            </div>
        `;
    }

    calculateScreenBoredomCorrelation() {
        const logs = Object.values(this.data?.data?.dailyLogs || {}).filter(d => d.screenTime && d.boredom);
        if (logs.length < 2) return 0;
        
        const screenTimes = logs.map(d => d.screenTime);
        const boredomLevels = logs.map(d => d.boredom);
        
        const avgScreen = screenTimes.reduce((a, b) => a + b) / screenTimes.length;
        const avgBoredom = boredomLevels.reduce((a, b) => a + b) / boredomLevels.length;
        
        let numerator = 0;
        let denomScreen = 0;
        let denomBoredom = 0;
        
        for (let i = 0; i < logs.length; i++) {
            const screenDiff = screenTimes[i] - avgScreen;
            const boredomDiff = boredomLevels[i] - avgBoredom;
            
            numerator += screenDiff * boredomDiff;
            denomScreen += screenDiff * screenDiff;
            denomBoredom += boredomDiff * boredomDiff;
        }
        
        return numerator / Math.sqrt(denomScreen * denomBoredom);
    }

    showAddMoodModal() {
        // Implementation for mood modal
        this.showToast('Mood logging coming soon');
    }

    viewDayDetails(date) {
        const dayData = this.data?.data?.dailyLogs?.[date];
        if (!dayData) return;
        
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
        
        let details = `
            <div class="modal active" id="dayDetailsModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${formattedDate}</h3>
                        <button class="modal-close" onclick="app.hideDayDetails()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="space-y-4">
        `;
        
        if (dayData.pmoStatus) {
            details += `
                <div>
                    <div class="text-sm text-secondary">PMO Status</div>
                    <div class="text-lg font-bold ${dayData.pmoStatus === 'Passed' ? 'text-success' : 'text-danger'}">
                        ${dayData.pmoStatus}
                    </div>
                </div>
            `;
        }
        
        if (dayData.boredom !== undefined) {
            details += `
                <div>
                    <div class="text-sm text-secondary">Boredom</div>
                    <div class="text-lg font-bold">${dayData.boredom}/10</div>
                </div>
            `;
        }
        
        if (dayData.stress !== undefined) {
            details += `
                <div>
                    <div class="text-sm text-secondary">Stress</div>
                    <div class="text-lg font-bold">${dayData.stress}/10</div>
                </div>
            `;
        }
        
        if (dayData.screenTime !== undefined) {
            details += `
                <div>
                    <div class="text-sm text-secondary">Screen Time</div>
                    <div class="text-lg font-bold">${dayData.screenTime}h</div>
                </div>
            `;
        }
        
        details += `
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Create and show modal
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = details;
        document.body.appendChild(modalDiv);
        
        // Add event listener to close button
        modalDiv.querySelector('.modal-close').addEventListener('click', () => {
            modalDiv.remove();
        });
        
        // Close on background click
        modalDiv.querySelector('.modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modalDiv.remove();
            }
        });
    }

    hideDayDetails() {
        const modal = document.getElementById('dayDetailsModal');
        if (modal) modal.remove();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RegulationApp();
});

// Prevent zoom on iOS
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

// Add to home screen prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js');
    });
}
