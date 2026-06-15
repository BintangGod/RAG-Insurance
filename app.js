const BACKEND_URL = "https://bintangisthebest-rag-insurance-backend.hf.space";

// DOM Elements
const loadingScreen = document.getElementById("loading-screen");
const appContainer = document.getElementById("app-container");
const progressBar = document.getElementById("progress-bar");
const statusText = document.getElementById("status-text");
const chatForm = document.getElementById("chat-form");
const queryInput = document.getElementById("query-input");
const chatMessages = document.getElementById("chat-messages");

// Start polling backend health
let progress = 0;
const progressInterval = setInterval(() => {
    if (progress < 90) {
        progress += Math.floor(Math.random() * 5) + 1;
        progressBar.style.width = `${progress}%`;
    }
}, 500);

async function checkBackendHealth() {
    try {
        statusText.innerText = "Status: Menghubungi server AI...";
        const response = await fetch(`${BACKEND_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            if (data.status === "ok") {
                clearInterval(progressInterval);
                progressBar.style.width = "100%";
                statusText.innerText = "Status: Server aktif! Memulai...";
                
                setTimeout(() => {
                    loadingScreen.style.opacity = "0";
                    setTimeout(() => {
                        loadingScreen.style.display = "none";
                        appContainer.classList.remove("hide");
                    }, 500);
                }, 1000);
                return;
            }
        }
    } catch (error) {
        console.log("Waiting for backend startup...", error);
    }
    
    // Retry check after 3 seconds
    setTimeout(checkBackendHealth, 3000);
}

// Start checking health on load
window.addEventListener("DOMContentLoaded", checkBackendHealth);

// Form submission handler
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = queryInput.value.trim();
    if (!query) return;

    queryInput.value = "";
    addMessage(query, "user");
    
    // Add typing loader
    const loaderId = addTypingLoader();
    
    try {
        const response = await fetch(`${BACKEND_URL}/ask`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ query: query })
        });
        
        removeTypingLoader(loaderId);
        
        if (response.ok) {
            const data = await response.json();
            addMessage(data.answer, "bot", data.source_chunks);
        } else {
            const errData = await response.json();
            addMessage(`Error: ${errData.detail || "Gagal menghubungi AI."}`, "bot");
        }
    } catch (error) {
        removeTypingLoader(loaderId);
        addMessage(`Gagal terhubung ke backend. Pastikan server FastAPI di ${BACKEND_URL} sedang berjalan.`, "bot");
        console.error(error);
    }
});

// Helper to add suggestion to input and submit
function sendSuggestion(suggestion) {
    queryInput.value = suggestion;
    chatForm.dispatchEvent(new Event("submit"));
}

// Function to append messages to history
function addMessage(text, sender, sources = []) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.innerText = sender === "user" ? "👤" : "🤖";
    
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    
    const textPara = document.createElement("p");
    textPara.innerText = text;
    contentDiv.appendChild(textPara);
    
    // If bot message has source citations, append them
    if (sender === "bot" && sources && sources.length > 0) {
        const citationsBox = document.createElement("div");
        citationsBox.className = "citations-box";
        
        const citationsTitle = document.createElement("div");
        citationsTitle.className = "citations-title";
        citationsTitle.innerText = "Kutipan Sumber:";
        citationsBox.appendChild(citationsTitle);
        
        const citationsList = document.createElement("div");
        citationsList.className = "citations-list";
        
        sources.forEach((source, idx) => {
            const meta = source.metadata;
            const item = document.createElement("div");
            item.className = "citation-item";
            item.innerHTML = `📚 <span>${meta.source} (Halaman ${meta.page_number})</span>`;
            
            // Text chunk details expanded view
            const details = document.createElement("div");
            details.className = "chunk-details";
            details.innerText = `Content:\n"${source.text.trim()}"`;
            
            item.addEventListener("click", () => {
                details.classList.toggle("show");
            });
            
            citationsList.appendChild(item);
            citationsList.appendChild(details);
        });
        
        citationsBox.appendChild(citationsList);
        contentDiv.appendChild(citationsBox);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to show typing loading dots
function addTypingLoader() {
    const loaderId = "loader-" + Date.now();
    
    const messageDiv = document.createElement("div");
    messageDiv.className = "message bot-message";
    messageDiv.id = loaderId;
    
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.innerText = "🤖";
    
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    
    const dotsDiv = document.createElement("div");
    dotsDiv.className = "typing-dots";
    dotsDiv.innerHTML = "<span></span><span></span><span></span>";
    
    contentDiv.appendChild(dotsDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return loaderId;
}

// Function to remove typing loader
function removeTypingLoader(id) {
    const loader = document.getElementById(id);
    if (loader) {
        loader.remove();
    }
}
