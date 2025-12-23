class RegulationApp {
    constructor() {
        this.data = null;
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentView = 'dashboard';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupPWA();
        this.loadFromStorage();
        this.renderCurrentView();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Import/Export buttons
        document.getElementById('importBtn').addEventListener('click', () => {
            this.showDataModal();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('selectFileBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileImport(e.target.files[0]);
        });

        document.getElementById('downloadDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Modal close
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.hideDataModal();
        });

        document.getElementById('dataModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideDataModal();
            }
        });

        // Date change handler (for daily logging)
        document.addEventListener('dateChange', (e) => {
            this.currentDate = e.detail.date;
            this.renderCurrentView();
        });
    }

    setupPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(() => console.log('Service Worker registered'))
                .catch(err => console.log('Service Worker registration failed:', err));
        }

        // Prevent default browser behaviors
        window.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('touchmove', e => {
            if (e.scale !== 1) e.preventDefault();
        }, { passive: false });
    }

    switchView(view) {
        this.currentView = view;
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        this.renderCurrentView();
    }

    renderCurrentView() {
        const container = document.getElementById('appContent');
        
        switch (this.currentView) {
            case 'dashboard':
                container.innerHTML = this.renderDashboard();
                break;
            case 'dopamine':
                container.innerHTML = this.renderDopamineTab();
                break;
            case 'workout':
                container.innerHTML = this.renderWorkoutTab();
                break;
            case 'moods':
                container.innerHTML = this.renderMoodsTab();
                break;
            case 'insights':
                container.innerHTML = this.renderInsightsTab();
                break;
        }

        this.attachViewListeners();
    }

    attachViewListeners() {
        // Dashboard inputs
        const saveBtn = document.getElementById('saveDailyBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveDailyInputs());
        }

        // Dopamine logging
        const logRelapseBtn = document.getElementById('logRelapseBtn');
        if (logRelapseBtn) {
            logRelapseBtn.addEventListener('click', () => this.logRelapse());
        }

        // Workout logging
        const logWorkoutBtn = document.getElementById('logWorkoutBtn');
        if (logWorkoutBtn) {
            logWorkoutBtn.addEventListener('click', () => this.logWorkout());
        }

        // Mood timeline
        const addMoodBtn = document.getElementById('addMoodBtn');
        if (addMoodBtn) {
            addMoodBtn.addEventListener('click', () => this.addMoodEntry());
        }

        // Habit toggles
        document.querySelectorAll('.habit-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const habit = e.currentTarget.dataset.habit;
                this.toggleHabit(habit);
            });
        });
    }

    // Data Management
    async handleFileImport(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const importedData = JSON.parse(text);
            
            if (this.validateData(importedData)) {
                this.data = importedData;
                this.saveToStorage();
                this.updateDataStatus('Data imported successfully');
                this.renderCurrentView();
            }
        } catch (error) {
            this.updateDataStatus(`Import error: ${error.message}`, 'error');
        }
    }

    exportData() {
        if (!this.data) {
            this.updateDataStatus('No data to export', 'error');
            return;
        }

        const dataStr = JSON.stringify(this.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `regulation-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.updateDataStatus('Data exported successfully');
    }

    validateData(data) {
        // Basic validation
        if (!data.schemaVersion) throw new Error('Missing schemaVersion');
        if (!data.data) throw new Error('Missing data object');
        
        // Add more specific validation as needed
        return true;
    }

    // Storage Management
    saveToStorage() {
        if (this.data) {
            localStorage.setItem('regulation_working_copy', JSON.stringify(this.data));
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('regulation_working_copy');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (this.validateData(parsed)) {
                    this.data = parsed;
                }
            }
        } catch (error) {
            console.warn('Failed to load from storage:', error);
        }

        if (!this.data) {
            this.data = this.getDefaultData();
        }
    }

    // View Renderers
    renderDashboard() {
        const todayData = this.getTodayData();
        const integrityScore = this.calculateIntegrityScore(todayData);
        const riskLevel = this.calculateRiskLevel(todayData);
        
        return `
            <div class="dashboard">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Today's Regulation</h2>
                        <span class="status-badge status-${riskLevel.toLowerCase()}">${riskLevel}</span>
                    </div>
                    
                    <div class="mb-4">
                        <div class="input-group">
                            <label class="input-label">Boredom (0-10)</label>
                            <input type="range" min="0" max="10" value="${todayData.boredom || 5}" 
                                   class="range-slider" id="boredomInput">
                            <div class="range-values">
                                <span>0</span><span>5</span><span>10</span>
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label class="input-label">Stress (0-10)</label>
                            <input type="range" min="0" max="10" value="${todayData.stress || 5}" 
                                   class="range-slider" id="stressInput">
                            <div class="range-values">
                                <span>0</span><span>5</span><span>10</span>
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label class="input-label">Screen Time (hours)</label>
                            <input type="number" min="0" max="24" step="0.5" value="${todayData.screenTime || 0}" 
                                   class="input-field" id="screenTimeInput">
                        </div>
                        
                        <div class="input-group">
                            <label class="input-label">PMO Status</label>
                            <select class="input-field" id="pmoStatusInput">
                                <option value="" ${!todayData.pmoStatus ? 'selected' : ''}>-- Select --</option>
                                <option value="Passed" ${todayData.pmoStatus === 'Passed' ? 'selected' : ''}>Passed</option>
                                <option value="Relapsed" ${todayData.pmoStatus === 'Relapsed' ? 'selected' : ''}>Relapsed</option>
                            </select>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary w-100" id="saveDailyBtn">
                        Save Today's Data
                    </button>
                </div>
                
                <div class="grid-2 mb-4">
                    <div class="stat-card">
                        <div class="stat-value">${integrityScore}</div>
                        <div class="stat-label">Integrity Score</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${todayData.screenTime || 0}h</div>
                        <div class="stat-label">Screen Time</div>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-3">Daily Habits</h3>
                    <div class="grid-2">
                        ${this.renderHabitToggles()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-3">Nutrition & Weight</h3>
                    <div class="input-group">
                        <label class="input-label">Calories</label>
                        <input type="number" class="input-field" id="caloriesInput" 
                               value="${todayData.calories || ''}" placeholder="Enter calories">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Protein (g)</label>
                        <input type="number" class="input-field" id="proteinInput" 
                               value="${todayData.protein || ''}" placeholder="Enter protein">
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

    renderDopamineTab() {
        const monthData = this.getMonthData();
        
        return `
            <div class="dopamine-tab">
                <div class="card">
                    <h2 class="card-title">PMO Calendar</h2>
                    <div class="calendar" id="pmoCalendar">
                        ${this.renderCalendar()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-3">Log Relapse</h3>
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
                            <option value="Morning">Morning</option>
                            <option value="Afternoon">Afternoon</option>
                            <option value="Evening">Evening</option>
                            <option value="Night">Night</option>
                        </select>
                    </div>
                    <button class="btn btn-primary w-100" id="logRelapseBtn">Log Relapse</button>
                </div>
                
                <div class="card">
                    <h3 class="card-title">Pattern Insights</h3>
                    ${this.renderPatternInsights()}
                </div>
                
                <div class="card">
                    <h3 class="card-title">Relapse Risk Meter</h3>
                    <div class="progress-bar mb-2">
                        <div class="progress-fill" style="width: ${this.calculateRiskPercentage()}%"></div>
                    </div>
                    <div class="text-center text-muted">
                        Based on recent patterns
                    </div>
                </div>
            </div>
        `;
    }

    renderWorkoutTab() {
        const workouts = this.data?.data?.workouts || [];
        const lastWorkout = this.getLastWorkoutDate();
        
        return `
            <div class="workout-tab">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Workout Log</h2>
                        <span class="text-muted">${lastWorkout}</span>
                    </div>
                    
                    <div class="input-group">
                        <label class="input-label">Workout Type</label>
                        <select class="input-field" id="workoutType">
                            <option value="Push">Push</option>
                            <option value="Pull">Pull</option>
                            <option value="Legs">Legs</option>
                            <option value="Cardio">Cardio</option>
                            <option value="Full Body">Full Body</option>
                        </select>
                    </div>
                    
                    <div id="exerciseEntries">
                        <div class="exercise-entry mb-3">
                            <div class="input-group">
                                <label class="input-label">Exercise</label>
                                <input type="text" class="input-field" placeholder="e.g., Bench Press">
                            </div>
                            <div class="grid-3 gap-2">
                                <div class="input-group">
                                    <label class="input-label">Sets</label>
                                    <input type="number" class="input-field" placeholder="3">
                                </div>
                                <div class="input-group">
                                    <label class="input-label">Reps</label>
                                    <input type="number" class="input-field" placeholder="10">
                                </div>
                                <div class="input-group">
                                    <label class="input-label">Weight</label>
                                    <input type="number" class="input-field" placeholder="kg">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn btn-secondary mb-3" onclick="app.addExerciseEntry()">+ Add Exercise</button>
                    <button class="btn btn-primary w-100" id="logWorkoutBtn">Save Workout</button>
                </div>
                
                <div class="card">
                    <h3 class="card-title">Recent Workouts</h3>
                    ${this.renderRecentWorkouts()}
                </div>
                
                <div class="card">
                    <h3 class="card-title">Volume Progress</h3>
                    <div class="text-center py-4">
                        <div class="stat-value">${this.calculateTotalVolume()}</div>
                        <div class="stat-label">Total kg lifted (30 days)</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMoodsTab() {
        return `
            <div class="moods-tab">
                <div class="card">
                    <h2 class="card-title">Mood Timeline</h2>
                    <div class="timeline">
                        ${this.renderMoodTimeline()}
                    </div>
                    <button class="btn btn-primary w-100 mt-3" id="addMoodBtn">Add Mood Entry</button>
                </div>
                
                <div class="card">
                    <h3 class="card-title">Boredom & Stress Heatmap</h3>
                    <div class="calendar">
                        ${this.renderHeatmap()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title">Screen Time Correlation</h3>
                    <div class="text-center py-4">
                        <div class="stat-value">${this.calculateScreenCorrelation()}</div>
                        <div class="stat-label">Avg mood per screen hour</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderInsightsTab() {
        return `
            <div class="insights-tab">
                <div class="card">
                    <h2 class="card-title">Weekly Summary</h2>
                    <div class="insight-box">
                        ${this.generateWeeklySummary()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title">PMO Patterns</h3>
                    <div class="insight-item">
                        ${this.generatePMOInsights()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title">Workout Protection</h3>
                    <div class="insight-item">
                        ${this.generateWorkoutInsights()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title">Habits & Stability</h3>
                    <div class="insight-item">
                        ${this.generateHabitInsights()}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title">Screen Time Effects</h3>
                    <div class="insight-item">
                        ${this.generateScreenTimeInsights()}
                    </div>
                </div>
            </div>
        `;
    }

    // Helper Methods
    getDefaultData() {
        return {
            schemaVersion: "1.0",
            data: {
                dailyLogs: {},
                workouts: [],
                moods: [],
                habits: {}
            }
        };
    }

    getTodayData() {
        return this.data?.data?.dailyLogs?.[this.currentDate] || {};
    }

    saveDailyInputs() {
        if (!this.data.data.dailyLogs) this.data.data.dailyLogs = {};
        
        this.data.data.dailyLogs[this.currentDate] = {
            boredom: parseInt(document.getElementById('boredomInput')?.value) || 0,
            stress: parseInt(document.getElementById('stressInput')?.value) || 0,
            screenTime: parseFloat(document.getElementById('screenTimeInput')?.value) || 0,
            pmoStatus: document.getElementById('pmoStatusInput')?.value || '',
            calories: parseInt(document.getElementById('caloriesInput')?.value) || 0,
            protein: parseInt(document.getElementById('proteinInput')?.value) || 0,
            weight: parseFloat(document.getElementById('weightInput')?.value) || null,
            timestamp: new Date().toISOString()
        };
        
        this.saveToStorage();
        this.showToast('Daily data saved');
    }

    logRelapse() {
        const cause = document.getElementById('relapseCause')?.value;
        const time = document.getElementById('relapseTime')?.value;
        
        if (!cause) return;
        
        const relapse = {
            date: this.currentDate,
            cause,
            time,
            timestamp: new Date().toISOString()
        };
        
        if (!this.data.data.relapses) this.data.data.relapses = [];
        this.data.data.relapses.push(relapse);
        
        // Update today's PMO status
        if (!this.data.data.dailyLogs[this.currentDate]) {
            this.data.data.dailyLogs[this.currentDate] = {};
        }
        this.data.data.dailyLogs[this.currentDate].pmoStatus = 'Relapsed';
        
        this.saveToStorage();
        this.showToast('Relapse logged');
        this.renderCurrentView();
    }

    // Data Analysis Methods
    calculateIntegrityScore(data) {
        let score = 100;
        
        // Deduct for high boredom/stress
        if (data.boredom > 7) score -= 20;
        if (data.stress > 7) score -= 20;
        
        // Deduct for screen time > 4 hours
        if (data.screenTime > 4) score -= (data.screenTime - 4) * 5;
        
        // Deduct for relapse
        if (data.pmoStatus === 'Relapsed') score -= 30;
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    calculateRiskLevel(data) {
        const score = this.calculateIntegrityScore(data);
        
        if (score >= 70) return 'Low';
        if (score >= 40) return 'Medium';
        return 'High';
    }

    // UI Helpers
    showDataModal() {
        document.getElementById('dataModal').classList.add('active');
    }

    hideDataModal() {
        document.getElementById('dataModal').classList.remove('active');
    }

    updateDataStatus(message, type = 'success') {
        const status = document.getElementById('importStatus');
        status.textContent = message;
        status.className = `status-message ${type}`;
        
        setTimeout(() => {
            status.textContent = '';
            status.className = 'status-message';
        }, 3000);
    }

    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--accent-primary);
            color: white;
            padding: 12px 24px;
            border-radius: var(--radius-md);
            z-index: 1000;
            animation: fadeInOut 3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Additional render methods would continue here...
    renderHabitToggles() {
        const habits = ['Hygiene', 'Workout', 'Calories', 'Journal'];
        const todayData = this.getTodayData();
        
        return habits.map(habit => `
            <div class="habit-item">
                <button class="habit-toggle ${todayData[`habit_${habit}`] ? 'active' : ''}" 
                        data-habit="${habit}">
                    ${habit}
                </button>
            </div>
        `).join('');
    }

    renderCalendar() {
        // Simplified calendar rendering
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        let html = '';
        
        // Day headers
        ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(day => {
            html += `<div class="day-cell neutral">${day}</div>`;
        });
        
        // Empty cells for first day offset
        const startDay = firstDay.getDay();
        for (let i = 0; i < startDay; i++) {
            html += '<div class="day-cell empty"></div>';
        }
        
        // Days of month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayData = this.data?.data?.dailyLogs?.[dateStr];
            
            let cellClass = 'neutral';
            if (dayData?.pmoStatus === 'Passed') cellClass = 'green';
            if (dayData?.pmoStatus === 'Relapsed') cellClass = 'red';
            
            html += `<div class="day-cell ${cellClass}">${day}</div>`;
        }
        
        return html;
    }
}

// Initialize app
const app = new RegulationApp();
window.app = app; // Make accessible for debugging
