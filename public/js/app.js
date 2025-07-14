document.addEventListener('DOMContentLoaded', () => {
    const config = {
        API_URL: 'http://localhost:3000/api'
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
        currentScreen: 'chat', // 'chat', 'list', 'form'
        currentTab: 'chat', // 'chat', 'appointments', 'prescriptions', etc.
        messages: [
            { role: 'bot', content: "Hello! I am your AI assistant. How can I help you today?" }
        ],
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
    const listTitle = document.getElementById('list-title');
    const listContainer = document.getElementById('list-container');
    const addNewBtn = document.getElementById('add-new-btn');
    const formTitle = document.getElementById('form-title');
    const formFieldsContainer = document.getElementById('form-fields-container');
    const dataForm = document.getElementById('data-form');
    const cancelFormBtn = document.getElementById('cancel-form-btn');

    // ===================================================================
    // NAVIGATION & SCREEN RENDERING
    // ===================================================================

    function showScreen(screenId) {
        appState.currentScreen = screenId;
        screens.forEach(screen => screen.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    }

    async function navigateTo(tabName) {
        appState.currentTab = tabName;
        navTabs.forEach(tab => {
            tab.classList.toggle('text-blue-500', tab.dataset.tab === tabName);
            tab.classList.toggle('text-gray-400', tab.dataset.tab !== tabName);
        });

        if (tabName === 'chat') {
            showScreen('chat-screen');
        } else {
            await renderListScreen();
            showScreen('list-screen');
        }
    }
    
    function renderChat() {
        chatWindow.innerHTML = '';
        appState.messages.forEach(msg => {
            const el = document.createElement('div');
            el.textContent = msg.content;
            if (msg.role === 'bot') {
                el.className = 'bg-gray-700 self-start rounded-b-xl rounded-tr-xl p-3 max-w-[80%]';
            } else {
                el.className = 'bg-blue-600 text-white self-end rounded-t-xl rounded-bl-xl p-3 max-w-[80%]';
            }
            chatWindow.appendChild(el);
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
    navTabs.forEach(tab => tab.addEventListener('click', () => navigateTo(tab.dataset.tab)));
    
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) return;
        appState.messages.push({ role: 'user', content: userInput });
        renderChat();
        chatInput.value = '';
        setTimeout(() => getMockBotResponse(userInput), 1000);
    });
    
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
    // MOCK AI LOGIC
    // ===================================================================
    function getMockBotResponse(input) {
        const lowerInput = input.toLowerCase();
        let botResponse = "I'm not sure how to help with that. Try asking me to see your 'appointments' or 'prescriptions'.";

        if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
            botResponse = "Hi there! What can I do for you?";
        } else if (lowerInput.includes('appointment')) {
            botResponse = "Sure, I can help with appointments. I'm taking you to that screen now.";
            navigateTo('appointments');
        } else if (lowerInput.includes('prescription')) {
             botResponse = "Okay, navigating to your prescriptions.";
            navigateTo('prescriptions');
        } else if (lowerInput.includes('fitness') || lowerInput.includes('workout')) {
            botResponse = "Showing your fitness plans now.";
            navigateTo('fitness_plans');
        } else if (lowerInput.includes('meal') || lowerInput.includes('food')) {
            botResponse = "Here are your meal plans.";
            navigateTo('meal_plans');
        }

        appState.messages.push({ role: 'bot', content: botResponse });
        renderChat();
    }

    // --- INITIALIZE APP ---
    navigateTo('chat'); // Start on the chat screen
    renderChat();
});