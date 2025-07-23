document.addEventListener('DOMContentLoaded', () => {
    const config = {
        API_URL: '/api'
    };

    // ===================================================================
    // USER MANAGEMENT & LOCAL STORAGE
    // ===================================================================
    const userManager = {
        // Local storage keys
        STORAGE_KEYS: {
            USER_DETAILS: 'fitness_ai_user_details',
            ONBOARDING_RESPONSES: 'fitness_ai_onboarding_responses',
            FITNESS_PLAN: 'fitness_ai_fitness_plan'
        },

        // Get user details from localStorage
        getUserDetails() {
            const stored = localStorage.getItem(this.STORAGE_KEYS.USER_DETAILS);
            return stored ? JSON.parse(stored) : null;
        },

        // Save user details to localStorage
        saveUserDetails(userDetails) {
            localStorage.setItem(this.STORAGE_KEYS.USER_DETAILS, JSON.stringify(userDetails));
        },

        // Get onboarding responses from localStorage
        getOnboardingResponses() {
            const stored = localStorage.getItem(this.STORAGE_KEYS.ONBOARDING_RESPONSES);
            return stored ? JSON.parse(stored) : null;
        },

        // Save onboarding responses to localStorage
        saveOnboardingResponses(responses) {
            localStorage.setItem(this.STORAGE_KEYS.ONBOARDING_RESPONSES, JSON.stringify(responses));
        },

        // Get fitness plan from localStorage
        getFitnessPlan() {
            const stored = localStorage.getItem(this.STORAGE_KEYS.FITNESS_PLAN);
            return stored ? JSON.parse(stored) : null;
        },

        // Save fitness plan to localStorage
        saveFitnessPlan(plan) {
            localStorage.setItem(this.STORAGE_KEYS.FITNESS_PLAN, JSON.stringify(plan));
        },

        // Clear all user data (logout)
        clearUserData() {
            localStorage.removeItem(this.STORAGE_KEYS.USER_DETAILS);
            localStorage.removeItem(this.STORAGE_KEYS.ONBOARDING_RESPONSES);
            localStorage.removeItem(this.STORAGE_KEYS.FITNESS_PLAN);
        },

        // Check if user is logged in
        isLoggedIn() {
            return this.getUserDetails() !== null;
        },

        // Check if onboarding is completed
        isOnboardingCompleted() {
            return this.getOnboardingResponses() !== null;
        },

        // Get time-based greeting
        getTimeBasedGreeting() {
            const hour = new Date().getHours();
            if (hour < 12) return 'morning';
            if (hour < 17) return 'afternoon';
            return 'evening';
        }
    };

    // ===================================================================
    // API HELPER
    // ===================================================================
    const api = {
        async get(endpoint) {
            const response = await fetch(`${config.API_URL}/${endpoint}`);
            if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
            return response.json();
        },
        async post(endpoint, data) {
            const response = await fetch(`${config.API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`Failed to create item at ${endpoint}`);
            return response.json();
        },
        async delete(endpoint, id) {
            const response = await fetch(`${config.API_URL}/${endpoint}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`Failed to delete item at ${endpoint}/${id}`);
        }
    };

    // ===================================================================
    // APP STATE & DATABASE
    // ===================================================================
    const appState = {
        currentScreen: 'login', // 'login', 'onboarding', 'chat', 'list', 'form'
        currentTab: 'chat', // 'chat', 'appointments', 'prescriptions', etc.
        onboardingStep: 1,
        totalOnboardingSteps: 6,
        messages: [],
        ragStatus: { status: 'unknown' },
        // Schemas define the structure for each data type
        schemas: {
            appointments: {
                title: "My Appointments",
                fields: [
                    { name: 'date', label: 'Date', type: 'date', required: true },
                    { name: 'time', label: 'Time', type: 'time', required: true },
                    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'e.g., Follow-up with Dr. Smith' }
                ]
            },
            prescriptions: {
                title: "My Prescriptions",
                fields: [
                    { name: 'medication', label: 'Medication', type: 'text', required: true, placeholder: 'e.g., Vitamin D' },
                    { name: 'dosage', label: 'Dosage', type: 'text', placeholder: 'e.g., 500mg' },
                    { name: 'status', label: 'Status', type: 'select', options: ['Requested', 'Filled', 'Cancelled'] }
                ]
            },
            fitness_plans: {
                title: "My Fitness Plans",
                fields: [
                    { name: 'plan_name', label: 'Plan Name', type: 'text', required: true, placeholder: 'e.g., 3-Day Beginner Strength' },
                    { name: 'goal', label: 'Goal', type: 'text', placeholder: 'e.g., Build Muscle' },
                    { name: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Completed'] }
                ]
            },
            meal_plans: {
                title: "My Meal Plans",
                fields: [
                    { name: 'plan_name', label: 'Plan Name', type: 'text', required: true, placeholder: 'e.g., Weekly High-Protein' },
                    { name: 'diet_type', label: 'Diet Type', type: 'text', placeholder: 'e.g., Vegetarian' },
                    { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Archived'] }
                ]
            }
        },
        // Data is now fetched from the backend
        data: {
            appointments: [],
            prescriptions: [],
            fitness_plans: [],
            meal_plans: []
        }
    };

    // ===================================================================
    // DOM ELEMENT REFERENCES
    // ===================================================================
    const screens = document.querySelectorAll('.screen');
    const navTabs = document.querySelectorAll('.nav-tab');
    const chatWindow = document.getElementById('chat-window');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const ragStatus = document.getElementById('rag-status');
    const listTitle = document.getElementById('list-title');
    const listContainer = document.getElementById('list-container');
    const addNewBtn = document.getElementById('add-new-btn');
    const formTitle = document.getElementById('form-title');
    const formFieldsContainer = document.getElementById('form-fields-container');
    const dataForm = document.getElementById('data-form');
    const cancelFormBtn = document.getElementById('cancel-form-btn');
    
    // Login elements
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Onboarding elements
    const onboardingForm = document.getElementById('onboarding-form');
    const onboardingProgress = document.getElementById('onboarding-progress');
    const progressFill = document.getElementById('progress-fill');
    const prevStepBtn = document.getElementById('prev-step-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const otherConditionInput = document.getElementById('other-condition-input');

    // ===================================================================
    // UTILITY FUNCTIONS
    // ===================================================================
    
    // Auto-resize textarea
    function autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    // Format message content with proper line breaks and tables
    function formatMessageContent(content) {
        // First, handle table formatting
        content = formatTables(content);
        
        // Then handle other markdown formatting
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    // Format markdown tables to HTML tables with proper styling
    function formatTables(content) {
        // Split content into lines
        const lines = content.split('\n');
        const formattedLines = [];
        let inTable = false;
        let tableLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if this line is part of a table (contains |)
            if (line.includes('|') && line.trim().length > 0) {
                if (!inTable) {
                    inTable = true;
                    tableLines = [];
                }
                tableLines.push(line);
            } else {
                // If we were in a table and now we're not, process the table
                if (inTable) {
                    formattedLines.push(processTable(tableLines));
                    inTable = false;
                    tableLines = [];
                }
                formattedLines.push(line);
            }
        }
        
        // Handle case where table is at the end
        if (inTable && tableLines.length > 0) {
            formattedLines.push(processTable(tableLines));
        }
        
        return formattedLines.join('\n');
    }

    // Process table lines and convert to HTML
    function processTable(tableLines) {
        if (tableLines.length < 2) return tableLines.join('\n');
        
        let html = '<div class="table-container my-4 overflow-x-auto">';
        html += '<table class="min-w-full border-collapse border border-gray-600 bg-gray-700 rounded-lg overflow-hidden">';
        
        for (let i = 0; i < tableLines.length; i++) {
            const line = tableLines[i];
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
            
            // Skip separator lines (lines with only dashes and pipes)
            if (line.match(/^[\s\-\|]+$/)) continue;
            
            if (i === 0) {
                // Header row
                html += '<thead class="bg-gray-600">';
                html += '<tr>';
                cells.forEach(cell => {
                    html += `<th class="border border-gray-500 px-4 py-3 text-left text-sm font-semibold text-white">${cell}</th>`;
                });
                html += '</tr>';
                html += '</thead>';
                html += '<tbody>';
            } else {
                // Data row
                html += '<tr class="hover:bg-gray-600 transition-colors">';
                cells.forEach(cell => {
                    html += `<td class="border border-gray-500 px-4 py-3 text-sm text-gray-200">${cell}</td>`;
                });
                html += '</tr>';
            }
        }
        
        html += '</tbody>';
        html += '</table>';
        html += '</div>';
        
        return html;
    }

    // Create typing indicator
    function createTypingIndicator() {
        const typingEl = document.createElement('div');
        typingEl.className = 'bg-gray-700 self-start rounded-b-xl rounded-tr-xl p-3 max-w-[80%]';
        typingEl.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        return typingEl;
    }

    // Create message element
    function createMessageElement(msg) {
        const el = document.createElement('div');
        
        if (msg.role === 'bot') {
            el.className = 'bg-gray-700 self-start rounded-b-xl rounded-tr-xl p-3 max-w-[80%]';
            
            let content = '';
            
            // Add RAG indicator
            if (msg.ragUsed) {
                content += '<div class="rag-indicator bg-blue-600 text-white">📚 Knowledge Base Used</div>';
            }
            
            // Add tool indicators
            if (msg.toolsExecuted && msg.toolsExecuted.length > 0) {
                msg.toolsExecuted.forEach(tool => {
                    content += `<div class="tool-indicator">🔧 ${tool.tool} executed</div>`;
                });
            }
            
            // Add main message content
            content += `<div class="message-content">${formatMessageContent(msg.content)}</div>`;
            
            // Add citations if available
            if (msg.citations && msg.citations.length > 0) {
                content += '<div class="citations-list">';
                content += '<div class="text-gray-400 text-xs mb-1">Sources:</div>';
                msg.citations.forEach(citation => {
                    content += `<span class="citation-badge bg-blue-800 text-blue-200">${citation.filename} (${citation.chunks} chunks)</span>`;
                });
                content += '</div>';
            }
            
            el.innerHTML = content;
        } else {
            el.className = 'bg-blue-600 text-white self-end rounded-t-xl rounded-bl-xl p-3 max-w-[80%]';
            el.innerHTML = `<div class="message-content">${formatMessageContent(msg.content)}</div>`;
        }
        
        return el;
    }

    // Update RAG status display
    async function updateRagStatus() {
        try {
            const status = await api.get('chat/rag-status');
            appState.ragStatus = status;
            
            if (status.status === 'active') {
                ragStatus.textContent = `📚 Knowledge Base: ${status.vectorCount || 0} documents`;
                ragStatus.className = 'text-xs text-center text-green-400 mt-1';
            } else if (status.status === 'disabled') {
                ragStatus.textContent = '📚 Knowledge Base: Disabled';
                ragStatus.className = 'text-xs text-center text-yellow-400 mt-1';
            } else {
                ragStatus.textContent = '📚 Knowledge Base: Error';
                ragStatus.className = 'text-xs text-center text-red-400 mt-1';
            }
        } catch (error) {
            ragStatus.textContent = '📚 Knowledge Base: Offline';
            ragStatus.className = 'text-xs text-center text-gray-400 mt-1';
        }
    }

    // ===================================================================
    // SCREEN MANAGEMENT
    // ===================================================================

    function showScreen(screenId) {
        appState.currentScreen = screenId;
        screens.forEach(screen => screen.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    }

    // Initialize app based on user state
    function initializeApp() {
        const userDetails = userManager.getUserDetails();
        
        if (!userDetails) {
            // User not logged in - show login screen
            showScreen('login-screen');
            return;
        }
        
        // User is logged in - update header
        updateUserHeader(userDetails);
        
        if (!userManager.isOnboardingCompleted()) {
            // User needs to complete onboarding
            showScreen('onboarding-screen');
            initializeOnboarding();
        } else {
            // User is fully set up - show chat
            showScreen('chat-screen');
            initializeChat();
        }
    }

    // Update user header with name
    function updateUserHeader(userDetails) {
        userInfo.textContent = `Welcome back, ${userDetails.name}!`;
    }

    // ===================================================================
    // LOGIN FLOW
    // ===================================================================

    function handleLogin(userDetails) {
        userManager.saveUserDetails(userDetails);
        updateUserHeader(userDetails);
        
        if (!userManager.isOnboardingCompleted()) {
            showScreen('onboarding-screen');
            initializeOnboarding();
        } else {
            showScreen('chat-screen');
            initializeChat();
        }
    }

    function handleLogout() {
        userManager.clearUserData();
        showScreen('login-screen');
        appState.messages = [];
    }

    // ===================================================================
    // ONBOARDING FLOW
    // ===================================================================

    function initializeOnboarding() {
        appState.onboardingStep = 1;
        updateOnboardingProgress();
        showOnboardingStep(1);
    }

    function updateOnboardingProgress() {
        const progress = (appState.onboardingStep / appState.totalOnboardingSteps) * 100;
        onboardingProgress.textContent = `${appState.onboardingStep}/${appState.totalOnboardingSteps}`;
        progressFill.style.width = `${progress}%`;
    }

    function showOnboardingStep(step) {
        // Hide all steps
        for (let i = 1; i <= appState.totalOnboardingSteps; i++) {
            const stepEl = document.getElementById(`step-${i}`);
            if (stepEl) stepEl.classList.remove('active');
        }
        
        // Show current step
        const currentStepEl = document.getElementById(`step-${step}`);
        if (currentStepEl) currentStepEl.classList.add('active');
        
        // Update button states
        prevStepBtn.style.display = step === 1 ? 'none' : 'block';
        nextStepBtn.textContent = step === appState.totalOnboardingSteps ? 'Complete' : 'Next';
        
        updateOnboardingProgress();
    }

    function nextOnboardingStep() {
        if (appState.onboardingStep < appState.totalOnboardingSteps) {
            appState.onboardingStep++;
            showOnboardingStep(appState.onboardingStep);
        } else {
            completeOnboarding();
        }
    }

    function prevOnboardingStep() {
        if (appState.onboardingStep > 1) {
            appState.onboardingStep--;
            showOnboardingStep(appState.onboardingStep);
        }
    }

    function collectOnboardingResponses() {
        const formData = new FormData(onboardingForm);
        const responses = {};
        
        // Collect radio button responses
        const radioFields = ['fitness_goal', 'plan_duration', 'health_conditions', 'experience_level'];
        radioFields.forEach(field => {
            const value = formData.get(field);
            if (value) responses[field] = value;
        });
        
        // Collect checkbox responses
        const checkboxFields = ['preferred_activities', 'avoided_activities'];
        checkboxFields.forEach(field => {
            const values = formData.getAll(field);
            if (values.length > 0) responses[field] = values;
        });
        
        // Handle other condition
        if (responses.health_conditions === 'other') {
            responses.other_condition = formData.get('other_condition');
        }
        
        return responses;
    }

    async function completeOnboarding() {
        const responses = collectOnboardingResponses();
        
        // Validate required fields
        const requiredFields = ['fitness_goal', 'plan_duration', 'experience_level'];
        const missingFields = requiredFields.filter(field => !responses[field]);
        
        if (missingFields.length > 0) {
            alert('Please complete all required fields before proceeding.');
            return;
        }
        
        // Save onboarding responses
        userManager.saveOnboardingResponses(responses);
        
        // Generate fitness plan
        try {
            const userDetails = userManager.getUserDetails();
            const fitnessPlan = await api.post('fitness_plans/generate', {
                userDetails,
                onboardingResponses: responses
            });
            
            userManager.saveFitnessPlan(fitnessPlan);
            
            // Show chat screen
            showScreen('chat-screen');
            initializeChat();
            
        } catch (error) {
            console.error('Error generating fitness plan:', error);
            // Still proceed to chat even if plan generation fails
            showScreen('chat-screen');
            initializeChat();
        }
    }

    // ===================================================================
    // CHAT INITIALIZATION
    // ===================================================================

    function initializeChat() {
        const userDetails = userManager.getUserDetails();
        const onboardingResponses = userManager.getOnboardingResponses();
        const fitnessPlan = userManager.getFitnessPlan();
        const timeOfDay = userManager.getTimeBasedGreeting();
        
        // Generate contextual welcome message
        let welcomeMessage = generateWelcomeMessage(userDetails, timeOfDay, onboardingResponses, fitnessPlan);
        
        appState.messages = [
            { 
                role: 'bot', 
                content: welcomeMessage,
                ragUsed: false,
                citations: [],
                toolsExecuted: []
            }
        ];
        
        renderChat();
        updateRagStatus();
    }

    function generateWelcomeMessage(userDetails, timeOfDay, onboardingResponses, fitnessPlan) {
        const greetings = {
            morning: 'Good morning',
            afternoon: 'Good afternoon', 
            evening: 'Good evening'
        };
        
        let message = `${greetings[timeOfDay]}, ${userDetails.name}! `;
        
        if (timeOfDay === 'morning') {
            message += "Are you ready for your workout today? How are you feeling?";
        } else if (timeOfDay === 'afternoon') {
            message += "How's your day going? Ready for some fitness guidance?";
        } else {
            message += "How was your day? Let's plan your fitness routine!";
        }
        
        if (fitnessPlan) {
            message += `\n\nI have your personalized fitness plan ready based on your ${onboardingResponses.fitness_goal} goal. Would you like me to show you today's workout?`;
        }
        
        return message;
    }

    // ===================================================================
    // NAVIGATION & SCREEN RENDERING
    // ===================================================================

    async function navigateTo(tabName) {
        appState.currentTab = tabName;
        navTabs.forEach(tab => {
            tab.classList.toggle('text-blue-500', tab.dataset.tab === tabName);
            tab.classList.toggle('text-gray-400', tab.dataset.tab !== tabName);
        });

        if (tabName === 'chat') {
            showScreen('chat-screen');
            await updateRagStatus();
        } else {
            await renderListScreen();
            showScreen('list-screen');
        }
    }
    
    function renderChat() {
        chatWindow.innerHTML = '';
        appState.messages.forEach(msg => {
            const messageEl = createMessageElement(msg);
            chatWindow.appendChild(messageEl);
        });
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    
    async function renderListScreen() {
        const schema = appState.schemas[appState.currentTab];
        listTitle.textContent = schema.title;
        listContainer.innerHTML = '<p class="text-gray-500 text-center mt-8">Loading...</p>';
        
        try {
            const data = await api.get(appState.currentTab);
            appState.data[appState.currentTab] = data;
            listContainer.innerHTML = '';

            if (data.length === 0) {
                listContainer.innerHTML = `<p class="text-gray-500 text-center mt-8">No items found.</p>`;
                return;
            }

            data.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'bg-gray-700 p-4 rounded-lg shadow';
                let content = Object.keys(item).filter(key => key !== 'id').map(key => {
                    const fieldLabel = schema.fields.find(f => f.name === key)?.label || key;
                    return `<p class="text-sm"><strong class="font-medium text-gray-400">${fieldLabel}:</strong> ${item[key]}</p>`;
                }).join('');
                itemEl.innerHTML = content + `<div class="mt-3"><button class="text-red-500 text-xs font-bold delete-btn" data-id="${item.id}">DELETE</button></div>`;
                listContainer.appendChild(itemEl);
            });
        } catch (error) {
            console.error('Error rendering list:', error);
            listContainer.innerHTML = `<p class="text-red-500 text-center mt-8">Error loading data. Is the server running?</p>`;
        }
    }

    function renderFormScreen() {
        const schema = appState.schemas[appState.currentTab];
        formTitle.textContent = `New ${schema.title.replace('My ', '')}`;
        formFieldsContainer.innerHTML = '';

        schema.fields.forEach(field => {
            const group = document.createElement('div');
            let fieldHtml = `<label for="${field.name}" class="text-sm font-bold text-gray-400">${field.label}</label>`;
            const commonClasses = 'w-full bg-gray-700 text-white rounded-lg p-2 mt-1 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500';
            
            if (field.type === 'textarea') {
                fieldHtml += `<textarea id="${field.name}" name="${field.name}" class="${commonClasses}" rows="3" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`;
            } else if (field.type === 'select') {
                const optionsHtml = field.options.map(o => `<option value="${o}">${o}</option>`).join('');
                fieldHtml += `<select id="${field.name}" name="${field.name}" class="${commonClasses}">${optionsHtml}</select>`;
            } else {
                fieldHtml += `<input type="${field.type}" id="${field.name}" name="${field.name}" class="${commonClasses}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
            }
            group.innerHTML = fieldHtml;
            formFieldsContainer.appendChild(group);
        });
        showScreen('form-screen');
    }

    // ===================================================================
    // EVENT LISTENERS
    // ===================================================================
    
    // Login form
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const userDetails = {
            name: formData.get('name'),
            email: formData.get('email')
        };
        handleLogin(userDetails);
    });

    // Logout button
    logoutBtn.addEventListener('click', handleLogout);

    // Onboarding navigation
    nextStepBtn.addEventListener('click', nextOnboardingStep);
    prevStepBtn.addEventListener('click', prevOnboardingStep);

    // Handle health conditions radio change
    document.querySelectorAll('input[name="health_conditions"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'other') {
                otherConditionInput.classList.remove('hidden');
            } else {
                otherConditionInput.classList.add('hidden');
            }
        });
    });
    
    // Navigation
    navTabs.forEach(tab => tab.addEventListener('click', () => navigateTo(tab.dataset.tab)));
    
    // Auto-resize chat input
    chatInput.addEventListener('input', () => autoResizeTextarea(chatInput));
    
    // Handle Shift+Enter for new lines and Enter for submit
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift+Enter: Allow new line (default behavior)
                return;
            } else {
                // Enter: Submit form
                e.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });
    
    // Chat form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        // Add user message
        appState.messages.push({ 
            role: 'user', 
            content: userInput,
            ragUsed: false,
            citations: [],
            toolsExecuted: []
        });
        renderChat();
        
        // Clear input and reset height
        chatInput.value = '';
        autoResizeTextarea(chatInput);

        // Add typing indicator
        const typingEl = createTypingIndicator();
        chatWindow.appendChild(typingEl);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
            // Get user context for enhanced chat
            const userDetails = userManager.getUserDetails();
            const onboardingResponses = userManager.getOnboardingResponses();
            const fitnessPlan = userManager.getFitnessPlan();
            
            const data = await api.post('chat', { 
                message: userInput,
                userContext: {
                    userDetails,
                    onboardingResponses,
                    fitnessPlan,
                    timeOfDay: userManager.getTimeBasedGreeting()
                }
            });
            
            // Remove typing indicator
            typingEl.remove();
            
            // Add bot response with enhanced data
            const botMessage = {
                role: 'bot',
                content: data.response,
                ragUsed: data.ragUsed || false,
                citations: data.citations || [],
                toolsExecuted: data.toolsExecuted || []
            };
            
            appState.messages.push(botMessage);
            renderChat();
            
        } catch (error) {
            // Remove typing indicator
            typingEl.remove();
            console.error('Error getting AI response:', error);
            
            const errorMessage = {
                role: 'bot',
                content: 'Sorry, I had trouble connecting. Please try again.',
                ragUsed: false,
                citations: [],
                toolsExecuted: []
            };
            
            appState.messages.push(errorMessage);
            renderChat();
        }
    });
    
    // Form handling
    addNewBtn.addEventListener('click', renderFormScreen);
    cancelFormBtn.addEventListener('click', () => navigateTo(appState.currentTab));
    
    dataForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newEntry = {};
        for (let [key, value] of formData.entries()) {
            newEntry[key] = value;
        }
        
        try {
            await api.post(appState.currentTab, newEntry);
            navigateTo(appState.currentTab);
        } catch (error) {
            console.error('Error saving data:', error);
            alert('Failed to save item. Please try again.');
        }
    });

    // Delete functionality
    listContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const idToDelete = parseInt(e.target.dataset.id, 10);
            const confirmation = confirm('Are you sure you want to delete this item?');
            if (confirmation) {
                try {
                    await api.delete(appState.currentTab, idToDelete);
                    renderListScreen(); // Re-render the list
                } catch (error) {
                    console.error('Error deleting item:', error);
                    alert('Failed to delete item. Please try again.');
                }
            }
        }
    });

    // ===================================================================
    // INITIALIZATION
    // ===================================================================
    
    // Initialize app
    initializeApp();
});