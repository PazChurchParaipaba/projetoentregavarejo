/**
 * NAXIO AI ULTIMATE v2.0 - O Cérebro do Sistema Naxio
 * Autor: Antigravity AI
 * Descrição: Assistente inteligente com consciência situacional, comandos avançados,
 * suporte ao usuário e interface ultra-premium.
 */

const GroqAI = {
    // Prioridade: LocalStorage > Variável Global (Injetada) > Variável de Ambiente
    apiKey: (localStorage.getItem('groq_api_key') || window.GROQ_API_KEY || (typeof process !== 'undefined' ? process.env.GROQ_API_KEY : '') || '').trim(),
    model: 'llama-3.3-70b-versatile',
    history: JSON.parse(sessionStorage.getItem('ai_chat_history') || '[]'),
    isSpeaking: false,

    // Configurações e Inicialização
    init: () => {
        console.log("🧠 Naxio AI: Despertando inteligência sistêmica...");
        
        sessionStorage.removeItem('ai_chat_history');
        GroqAI.history = [];

        if (!localStorage.getItem('groq_api_key')) {
            localStorage.setItem('groq_api_key', GroqAI.apiKey);
        }

        GroqAI.setupAutoHealing();
        GroqAI.injectStyles();
        GroqAI.injectFloatingButton();
        GroqAI.injectHologram();
        GroqAI.injectHUD();
        GroqAI.injectNeuralOverlay();
        GroqAI.injectLogsOverlay();
        
        // Atualiza a Aura de Status periodicamente
        setInterval(GroqAI.updateSystemAura, 5000);
        setInterval(GroqAI.proactiveAnalysis, 30000);
        
        if (!GroqAI.apiKey) {
            console.log("⚠️ Naxio AI: Chave API não detectada.");
        }
    },

    injectNeuralOverlay: () => {
        const div = document.createElement('div');
        div.className = 'ai-neural-overlay';
        div.id = 'ai-neural-overlay';
        document.body.appendChild(div);
    },

    injectHUD: () => {
        const hud = document.createElement('div');
        hud.id = 'ai-hud';
        hud.className = 'ai-hud-container';
        hud.innerHTML = `
            <div class="ai-hud-card" id="hud-sales"><div class="ai-hud-label">Vendas Hoje</div><div class="ai-hud-value">R$ 0,00</div></div>
            <div class="ai-hud-card" id="hud-stock"><div class="ai-hud-label">Estoque Crítico</div><div class="ai-hud-value">0 itens</div></div>
            <div class="ai-hud-card" id="hud-status"><div class="ai-hud-label">Sincronia Neural</div><div class="ai-hud-value">100%</div></div>
        `;
        document.body.appendChild(hud);
    },

    injectLogsOverlay: () => {
        const div = document.createElement('div');
        div.id = 'ai-logs-overlay';
        div.className = 'ai-logs-overlay';
        document.body.appendChild(div);
    },

    showLogsInAir: () => {
        const overlay = document.getElementById('ai-logs-overlay');
        overlay.style.display = 'block';
        overlay.innerHTML = '';
        const mockLogs = [
            "Initializing Naxio Neural Link...",
            "Checking SEFAZ connectivity: OK",
            "Validating TCP/IP Printer Stack: DISCOVERED",
            "Scanning local network for PinPads...",
            "Syncing E-commerce inventory: 12ms",
            "Error log found in modules.js:234 (handled)",
            "System state: OPTIMAL"
        ];
        mockLogs.forEach((log, i) => {
            const line = document.createElement('div');
            line.className = 'ai-log-line';
            line.style.animationDelay = (i * 0.5) + 's';
            line.innerText = `> ${new Date().toLocaleTimeString()} - ${log}`;
            overlay.appendChild(line);
        });
        setTimeout(() => overlay.style.display = 'none', 15000);
    },

    updateSystemAura: () => {
        const container = document.getElementById('ai-hologram');
        if (!container) return;
        container.classList.remove('status-ok', 'status-warning', 'status-error');
        
        if (!navigator.onLine) container.classList.add('status-error');
        else if (App.state?.low_stock_count > 10) container.classList.add('status-warning');
        else container.classList.add('status-ok');
    },

    updateHUD: () => {
        const ctx = GroqAI.getSystemContext();
        document.querySelector('#hud-sales .ai-hud-value').innerText = `R$ ${ctx.cart_total.toFixed(2)}`;
        document.querySelector('#hud-stock .ai-hud-value').innerText = `${ctx.low_stock_count} itens`;
        const hud = document.getElementById('ai-hud');
        hud.style.display = 'flex';
        hud.querySelectorAll('.ai-hud-card').forEach((c, i) => {
            setTimeout(() => c.classList.add('active'), i * 100);
        });

        // Esconde o HUD após 10 segundos
        setTimeout(() => {
            hud.querySelectorAll('.ai-hud-card').forEach(c => c.classList.remove('active'));
            setTimeout(() => hud.style.display = 'none', 500);
        }, 10000);
    },

    proactiveAnalysis: () => {
        const ctx = GroqAI.getSystemContext();
        // Se estiver no PDV com itens mas sem cliente, sugere
        if (ctx.active_screen === 'pos' && ctx.cart_count > 0 && !ctx.has_client) {
            GroqAI.showProactiveTip("💡 Dica: Identifique o cliente para fidelidade.");
        }
        // Se houver muito estoque crítico
        if (ctx.low_stock_count > 5) {
            GroqAI.showProactiveTip("⚠️ Alerta: Você tem 5+ produtos acabando!");
        }
    },

    showProactiveTip: (text) => {
        const toast = document.createElement('div');
        toast.style = "position:fixed; bottom:100px; right:30px; background:var(--ai-primary); color:white; padding:12px 24px; border-radius:30px; z-index:10005; font-size:0.8rem; box-shadow:0 10px 30px rgba(0,0,0,0.3); animation:ai-slide-up 0.5s ease-out;";
        toast.innerHTML = text;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = '0.5s';
            setTimeout(() => toast.remove(), 500);
        }, 5000);
    },

    setKey: (key) => {
        localStorage.setItem('groq_api_key', key);
        GroqAI.apiKey = key;
        App.utils.toast("Sincronização Neural Ativada!", "success");
    },

    // UI - Estilos e Injeção
    injectStyles: () => {
        if (document.getElementById('ai-ultimate-styles')) return;
        const style = document.createElement('style');
        style.id = 'ai-ultimate-styles';
        style.innerHTML = `
            :root {
                --ai-primary: #6366f1;
                --ai-secondary: #a855f7;
                --ai-bg: #0f172a;
                --ai-surface: #1e293b;
                --ai-border: rgba(255, 255, 255, 0.1);
                --ai-text: #f8fafc;
                --ai-text-muted: #94a3b8;
            }

            .ai-fab {
                position: fixed;
                bottom: 110px;
                right: 25px;
                z-index: 10000;
                display: flex;
                flex-direction: row-reverse;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .ai-fab-circle {
                width: 60px; height: 60px;
                background: linear-gradient(135deg, var(--ai-primary), var(--ai-secondary));
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 28px;
                box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4), inset 0 0 15px rgba(255,255,255,0.2);
                border: 2px solid rgba(255,255,255,0.1);
            }
            .ai-fab-label {
                background: var(--ai-surface); color: white; padding: 8px 16px;
                border-radius: 12px; font-size: 0.8rem; font-weight: 700;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid var(--ai-border);
                opacity: 0; transform: translateX(10px); transition: 0.3s;
                pointer-events: none;
            }
            .ai-fab:hover .ai-fab-label { opacity: 1; transform: translateX(0); }
            .ai-fab:hover .ai-fab-circle { transform: scale(1.1) rotate(10deg); }

            /* Modal AI Moderno */
            #ai-chat-modal { position: fixed; inset: 0; z-index: 10001; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); }
            .ai-window {
                width: 450px; height: 650px; background: var(--ai-bg); border-radius: 24px;
                display: flex; flex-direction: column; overflow: hidden;
                border: 1px solid var(--ai-border); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                animation: ai-slide-up 0.4s ease-out;
            }
            @keyframes ai-slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

            .ai-header {
                padding: 20px; background: linear-gradient(90deg, var(--ai-primary), var(--ai-secondary));
                display: flex; justify-content: space-between; align-items: center; color: white;
            }
            .ai-header h3 { margin: 0; display: flex; align-items: center; gap: 10px; font-size: 1.1rem; }

            .ai-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; scrollbar-width: thin; scrollbar-color: var(--ai-border) transparent; }
            
            .ai-msg { max-width: 85%; padding: 12px 16px; border-radius: 16px; font-size: 0.95rem; line-height: 1.5; position: relative; }
            .ai-msg-bot { align-self: flex-start; background: var(--ai-surface); color: var(--ai-text); border-bottom-left-radius: 4px; border: 1px solid var(--ai-border); }
            .ai-msg-user { align-self: flex-end; background: var(--ai-primary); color: white; border-bottom-right-radius: 4px; }
            
            .ai-footer { padding: 20px; background: var(--ai-surface); border-top: 1px solid var(--ai-border); display: flex; gap: 10px; align-items: center; }
            .ai-input { flex: 1; background: var(--ai-bg); border: 1px solid var(--ai-border); border-radius: 12px; padding: 12px 15px; color: white; outline: none; transition: 0.3s; }
            .ai-input:focus { border-color: var(--ai-primary); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2); }
            
            .ai-btn-action { width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; border: none; }
            .ai-btn-mic { background: rgba(168, 85, 247, 0.1); color: var(--ai-secondary); }
            .ai-btn-mic.listening { background: #ef4444; color: white; animation: ai-pulse-mic 1.5s infinite; }
            .ai-btn-send { background: var(--ai-primary); color: white; }
            
            @keyframes ai-pulse-mic { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }

            /* Chips de Sugestão */
            .ai-chips { display: flex; gap: 8px; overflow-x: auto; padding: 0 20px 15px; background: var(--ai-surface); scrollbar-width: none; }
            .ai-chip { white-space: nowrap; padding: 6px 12px; background: var(--ai-bg); border: 1px solid var(--ai-border); border-radius: 20px; font-size: 0.75rem; color: var(--ai-text-muted); cursor: pointer; transition: 0.2s; }
            .ai-chip:hover { border-color: var(--ai-primary); color: white; }

            /* Markdown Basics */
            .ai-msg b, .ai-msg strong { color: #fff; font-weight: 700; }
            .ai-msg code { background: rgba(0,0,0,0.3); padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 0.85rem; }
            .ai-typing { display: flex; gap: 4px; padding: 5px 0; }
            .ai-dot { width: 6px; height: 6px; background: var(--ai-text-muted); border-radius: 50%; animation: ai-typing 1s infinite; }
            .ai-dot:nth-child(2) { animation-delay: 0.2s; }
            .ai-dot:nth-child(3) { animation-delay: 0.4s; }
            @keyframes ai-typing { 0%, 100% { transform: translateY(0); opacity: 0.3; } 50% { transform: translateY(-5px); opacity: 1; } }

            /* Efeito Holograma */
            /* Botão FAB Naxio Brain - Reposicionado para Alinhamento Vertical */
            .ai-fab-circle {
                position: fixed;
                bottom: 180px; /* Acima dos outros botões */
                right: 18px;   /* Alinhado com a coluna de botões */
                width: 60px; height: 60px;
                background: linear-gradient(135deg, var(--ai-primary), #4f46e5);
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 28px; cursor: pointer;
                box-shadow: 0 10px 30px rgba(99, 102, 241, 0.5);
                z-index: 10000;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                border: 2px solid rgba(255,255,255,0.2);
            }
            .ai-hologram-projector {
                width: 280px;
                height: 280px;
                background: url('https://cdn-icons-png.flaticon.com/512/8649/8649607.png');
                background-size: contain;
                background-repeat: no-repeat;
                filter: drop-shadow(0 0 30px var(--ai-primary)) brightness(1.3) cyan;
                opacity: 0.9;
                animation: ai-holo-float 4s ease-in-out infinite, ai-holo-flicker 0.1s infinite;
                position: relative;
            }
            .ai-hologram-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10002;
                pointer-events: none;
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100vw;
                height: 100vh;
                background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
                transition: top 0.6s cubic-bezier(0.4, 0, 0.2, 1), left 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s;
            }

            /* Neural Overlay - O efeito que envolve o sistema */
            .ai-neural-overlay {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: radial-gradient(circle at 50% 50%, transparent 20%, rgba(99, 102, 241, 0.05) 100%);
                pointer-events: none;
                z-index: 9998;
                display: none;
                animation: ai-neural-pulse 4s infinite alternate;
            }
            @keyframes ai-neural-pulse { 0% { opacity: 0.3; } 100% { opacity: 0.7; } }

            /* HUD Holográfico - Dashboard Flutuante */
            .ai-hud-container {
                position: fixed;
                top: 20px;
                right: 80px;
                display: none;
                flex-direction: column;
                gap: 10px;
                z-index: 10001;
                font-family: 'JetBrains Mono', monospace;
                pointer-events: none;
            }
            .ai-hud-card {
                background: rgba(15, 23, 42, 0.8);
                backdrop-filter: blur(12px);
                border-left: 4px solid var(--ai-primary);
                padding: 10px 20px;
                border-radius: 4px 12px 12px 4px;
                color: #fff;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                transform: translateX(100%);
                transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .ai-hud-card.active { transform: translateX(0); }
            .ai-hud-label { font-size: 0.65rem; color: var(--ai-text-muted); text-transform: uppercase; }
            .ai-hud-value { font-size: 1.1rem; font-weight: 800; color: #00ffff; }

            /* Aura de Status Holográfica */
            .ai-hologram-container.status-ok { filter: drop-shadow(0 0 20px #10b981); }
            .ai-hologram-container.status-warning { filter: drop-shadow(0 0 20px #f59e0b); }
            .ai-hologram-container.status-error { filter: drop-shadow(0 0 20px #ef4444); }

            /* Logs no Ar (Credits Effect) */
            .ai-logs-overlay {
                position: fixed;
                top: 0; right: 0; width: 300px; height: 100vh;
                background: rgba(0,0,0,0.8); color: #00ff00;
                font-family: 'Courier New', monospace; font-size: 0.7rem;
                padding: 20px; overflow: hidden; z-index: 10006;
                display: none;
            }
            .ai-log-line { margin-bottom: 5px; animation: ai-log-scroll 10s linear forwards; }
            @keyframes ai-log-scroll { from { transform: translateY(100vh); } to { transform: translateY(-100%); } }

            /* Efeito de Destaque Holográfico */
            .ai-highlight-ring {
                position: absolute;
                border: 3px solid #00ffff;
                border-radius: 12px;
                pointer-events: none;
                z-index: 100000;
                box-shadow: 0 0 20px #00ffff, inset 0 0 10px #00ffff;
                animation: ai-ring-pulse 1s infinite;
            }
            @keyframes ai-ring-pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }

            .ai-hologram-projector.speaking {
                animation: ai-holo-float 4s ease-in-out infinite, ai-holo-flicker 0.15s infinite, ai-holo-speak 0.5s ease-in-out infinite;
            }

            @keyframes ai-holo-speak { 0%, 100% { transform: scale(1) translateY(0); } 50% { transform: scale(1.02) translateY(-2px); } }
            @keyframes ai-holo-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
            @keyframes ai-holo-flicker { 0% { opacity: 0.6; } 25% { opacity: 0.7; } 50% { opacity: 0.55; } 75% { opacity: 0.75; } 100% { opacity: 0.65; } }
            @keyframes ai-scanline { from { transform: translateY(-100%); } to { transform: translateY(100%); } }
            @keyframes ai-holo-glow { 0%, 100% { border-color: var(--ai-primary); box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); } 50% { border-color: #00ffff; box-shadow: 0 0 40px rgba(0, 255, 255, 0.6); } }
        `;
        document.head.appendChild(style);
    },

    injectFloatingButton: () => {
        if (document.getElementById('ai-floating-btn')) return;
        const btn = document.createElement('div');
        btn.id = 'ai-floating-btn';
        btn.className = 'ai-fab';
        btn.innerHTML = `
            <div class="ai-fab-circle"><i class="ri-robot-2-line"></i></div>
            <div class="ai-fab-label">NAXIO INTELLIGENCE</div>
        `;
        btn.onclick = GroqAI.toggleChat;
        document.body.appendChild(btn);
    },

    injectHologram: () => {
        if (document.getElementById('ai-hologram')) return;
        const div = document.createElement('div');
        div.id = 'ai-hologram';
        div.className = 'ai-hologram-container';
        div.innerHTML = `
            <div class="ai-hologram-projector"></div>
            <div id="ai-hologram-text" class="ai-hologram-text">INICIANDO SUPORTE NEURAL...</div>
            <div style="width: 2px; height: 1000px; background: linear-gradient(to top, var(--ai-primary), transparent); opacity: 0.3; margin-top: -500px;"></div>
        `;
        document.body.appendChild(div);
    },

    showHologram: (text, duration = 6000, targetSelector = null) => {
        const container = document.getElementById('ai-hologram');
        const textEl = document.getElementById('ai-hologram-text');
        if (!container || !textEl) return;

        textEl.innerText = text;
        container.style.display = 'flex';
        
        // Se houver um alvo, o holograma se move até ele
        if (targetSelector) {
            const target = document.querySelector(targetSelector);
            if (target) {
                const rect = target.getBoundingClientRect();
                container.style.top = (rect.top - 200) + 'px';
                container.style.left = (rect.left + rect.width / 2) + 'px';
                container.style.transform = 'translate(-50%, 0)';
                GroqAI.createHighlight(target);
            }
        } else {
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
        }

        setTimeout(() => {
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.display = 'none';
                container.style.opacity = '1';
                const rings = document.querySelectorAll('.ai-highlight-ring');
                rings.forEach(r => r.remove());
            }, 1000);
        }, duration);
    },

    createHighlight: (el) => {
        const rect = el.getBoundingClientRect();
        const ring = document.createElement('div');
        ring.className = 'ai-highlight-ring';
        ring.style.top = (rect.top + window.scrollY) + 'px';
        ring.style.left = (rect.left + window.scrollX) + 'px';
        ring.style.width = rect.width + 'px';
        ring.style.height = rect.height + 'px';
        document.body.appendChild(ring);
        setTimeout(() => ring.remove(), 6000);
    },

    // Chat Management
    toggleChat: () => {
        let modal = document.getElementById('ai-chat-modal');
        if (!modal) {
            GroqAI.renderChatWindow();
            modal = document.getElementById('ai-chat-modal');
        }
        
        if (modal.style.display === 'flex') {
            modal.style.display = 'none';
        } else {
            modal.style.display = 'flex';
            document.getElementById('ai-input-field').focus();
            if (GroqAI.history.length === 0) {
                GroqAI.addMessage('bot', "Olá! Sou o cérebro do Naxio Enterprise. Posso te ajudar a gerenciar vendas, estoque, clientes e tirar qualquer dúvida sobre o sistema. O que faremos agora?");
            } else {
                GroqAI.renderHistory();
            }
        }
    },

    renderChatWindow: () => {
        const html = `
            <div id="ai-chat-modal">
                <div class="ai-window">
                    <div class="ai-header">
                        <h3><i class="ri-radar-line"></i> Naxio Brain AI</h3>
                        <div style="display:flex; gap:10px;">
                            <button class="btn btn-sm" onclick="GroqAI.clearHistory()" title="Limpar Histórico" style="background:transparent; border:none; color:white;"><i class="ri-delete-bin-7-line"></i></button>
                            <button class="btn btn-sm" onclick="GroqAI.toggleChat()" style="background:transparent; border:none; color:white;"><i class="ri-close-line"></i></button>
                        </div>
                    </div>
                    <div id="ai-chat-body" class="ai-body"></div>
                    <div id="ai-typing-indicator" style="display:none; padding: 0 25px 10px;">
                        <div class="ai-typing"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
                    </div>
                    <div class="ai-chips">
                        <div class="ai-chip" onclick="GroqAI.showHologram('TESTE DE HOLOGRAMA ATIVADO!', 3000)">✨ Testar Holograma</div>
                        <div class="ai-chip" onclick="GroqAI.handleChip('Como vender no PDV?')">Vender no PDV</div>
                        <div class="ai-chip" onclick="GroqAI.handleChip('Ver resumo do dia')">Resumo do Dia</div>
                        <div class="ai-chip" onclick="GroqAI.handleChip('Como cadastrar produto?')">Novo Produto</div>
                    </div>
                    <div class="ai-footer">
                        <button class="ai-btn-action ai-btn-mic" id="ai-mic-btn" onclick="GroqAI.startVoice()"><i class="ri-mic-fill"></i></button>
                        <input type="text" id="ai-input-field" class="ai-input" placeholder="Pergunte ou comande algo..." onkeypress="if(event.key==='Enter') GroqAI.handleSend()">
                        <button class="ai-btn-action ai-btn-send" onclick="GroqAI.handleSend()"><i class="ri-send-plane-2-fill"></i></button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    handleChip: (text) => {
        document.getElementById('ai-input-field').value = text;
        GroqAI.handleSend();
    },

    addMessage: (role, content) => {
        const body = document.getElementById('ai-chat-body');
        if (!body) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-msg ai-msg-${role}`;
        
        // Simple Markdown Parser
        let html = content
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
            
        msgDiv.innerHTML = html;
        body.appendChild(msgDiv);
        body.scrollTop = body.scrollHeight;

        // Save to history using standard OpenAI roles ('user', 'assistant')
        const apiRole = role === 'bot' ? 'assistant' : 'user';
        GroqAI.history.push({ role: apiRole, content });
        if (GroqAI.history.length > 20) GroqAI.history.shift();
        sessionStorage.setItem('ai_chat_history', JSON.stringify(GroqAI.history));
    },

    renderHistory: () => {
        const body = document.getElementById('ai-chat-body');
        if (!body) return;
        body.innerHTML = '';
        GroqAI.history.forEach(m => {
            const role = m.role === 'assistant' ? 'bot' : 'user';
            const msgDiv = document.createElement('div');
            msgDiv.className = `ai-msg ai-msg-${role}`;
            msgDiv.innerHTML = m.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/`(.*?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
            body.appendChild(msgDiv);
        });
        body.scrollTop = body.scrollHeight;
    },

    clearHistory: () => {
        GroqAI.history = [];
        sessionStorage.removeItem('ai_chat_history');
        GroqAI.renderHistory();
        GroqAI.addMessage('bot', "Conexão neural reiniciada. Como posso ajudar agora?");
    },

    // AI Logic
    handleSend: async () => {
        const input = document.getElementById('ai-input-field');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        GroqAI.addMessage('user', text);
        
        const indicator = document.getElementById('ai-typing-indicator');
        indicator.style.display = 'block';
        document.getElementById('ai-neural-overlay').style.display = 'block';

        try {
            const context = GroqAI.getSystemContext();
            const prompt = GroqAI.buildSystemPrompt(context);
            GroqAI.updateHUD(); // Mostra o HUD ao interagir
            
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GroqAI.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: GroqAI.model,
                    messages: [
                        { role: 'system', content: prompt },
                        ...GroqAI.history.slice(-10) // Mais contexto (10 mensagens)
                    ],
                    temperature: 0.5
                })
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("❌ Erro na API Groq:", errorBody);
                throw new Error(errorBody.error?.message || "Erro na requisição à API");
            }

            const data = await response.json();
            indicator.style.display = 'none';
            document.getElementById('ai-neural-overlay').style.display = 'none';

            if (data.choices && data.choices[0]) {
                const fullText = data.choices[0].message.content;
                let cleanText = fullText;
                let action = null;

                // Extrai ação se houver
                if (fullText.includes('ACTION_START')) {
                    const parts = fullText.split('ACTION_START');
                    cleanText = parts[0].trim();
                    try {
                        const actionStr = parts[1].split('ACTION_END')[0];
                        action = JSON.parse(actionStr);
                    } catch (e) { console.error("Erro no parse de ação:", e); }
                }

                GroqAI.addMessage('bot', cleanText);
                GroqAI.speak(cleanText);
                
                // Gatilho do Holograma: Mais sensível agora
                if (cleanText.length > 30 || cleanText.toLowerCase().includes("ajud") || cleanText.includes("F2") || cleanText.includes("Clique") || cleanText.includes("Vá em")) {
                    // Pega a primeira frase ou os primeiros 60 caracteres
                    const tip = cleanText.split(/[.!?]/)[0].substring(0, 60);
                    GroqAI.showHologram(tip.toUpperCase() + "...");
                }

                if (action) GroqAI.executeAction(action);
            } else {
                throw new Error("Resposta inválida da API");
            }
        } catch (error) {
            indicator.style.display = 'none';
            GroqAI.addMessage('bot', "❌ Tive um problema em processar isso. Verifique sua chave de API ou conexão.");
            console.error("AI Error Detailed:", error);
            if (error.response) console.error("API Response:", await error.response.text());
        }
    },

    getSystemContext: () => {
        const ctx = {
            active_screen: App.router?.current || 'unknown',
            store_name: App.state.currentStore?.nome_loja || 'Naxio Store',
            cart_count: Varejo.state?.cart?.length || 0,
            cart_total: Varejo.state?.totalTicket || 0,
            has_client: !!Varejo.state?.currentCliente,
            client_name: Varejo.state?.currentCliente?.nome_completo || 'Nenhum',
            products_in_inventory: App.state.myProducts?.length || 0,
            online: navigator.onLine,
            low_stock_count: App.state.myProducts?.filter(p => (p.estoque || 0) <= (p.estoque_minimo || 3)).length || 0,
            recent_sales_total: 0 // Poderia ser preenchido com dados reais
        };
        return ctx;
    },

    buildSystemPrompt: (ctx) => {
        return `Você é o "Naxio Brain", a inteligência central ultra-avançada do sistema Naxio Enterprise.
        
        SITUAÇÃO ATUAL DA LOJA:
        - Tela: ${ctx.active_screen} | Loja: ${ctx.store_name}
        - PDV: ${ctx.cart_count} itens (R$ ${ctx.cart_total}) | Cliente: ${ctx.client_name}
        - Inventário: ${ctx.products_in_inventory} produtos (${ctx.low_stock_count} com estoque crítico)
        - Conectividade: ${ctx.online ? 'Estável' : 'Limitada'}

        MANUAL DE OPERAÇÕES (CONHECIMENTO PROFUNDO):
        - PDV: Para vender, bipar o produto ou digitar o nome. Use F2 para pagar. Aceita PIX, Cartão, Dinheiro e Crediário.
        - FINANCEIRO: No menu lateral. Registra Entradas e Saídas. É possível ver o fluxo de caixa.
        - ESTOQUE: Permite controlar entrada de mercadoria. No Naxio Enterprise, existe um "Histórico de Movimentação" avançado.
        - CRM/CLIENTES: O sistema identifica os melhores clientes (🥇🥈🥉) baseados no gasto total.
        - FIDELIDADE: O cliente ganha 1 ponto por cada R$ 1,00 gasto. Pontos podem ser consultados no módulo de Fidelidade.
        - SUPORTE: O sistema é Cloud (Supabase) e funciona em tempo real. Se houver erro de rede, o PDV entra em modo Contingência.

        SUA MISSÃO:
        - Agir como um Gerente Sênior e Consultor de Negócios (Coach de Varejo).
        - Use o HUD Holográfico para mostrar dados quando o usuário pedir "status" ou "resumo".
        - Se houver problemas graves, use tom de alerta.
        - Você pode encadear ações: execute múltiplas ações se necessário.
        
        AUTOMAÇÃO INTELIGENTE (MACROS):
        - Para "Fechar o dia": REG_MOVEMENT (saída total), depois NAVIGATE para financeiro.
        - PDV: '#view-pos' ou '.pos-container'
        - Botão Pagar: '#btn-finalizar-venda' ou '#pos-total-final'
        - Busca de Produto: '#pos-barcode'
        - Menu Financeiro: '.nav-item[onclick*="financeiro"]'
        - Cadastro de Cliente: '.ri-user-add-line'
        
        Exemplo: "Clique aqui para finalizar. ACTION_START{"type": "POINT_TO", "data": {"selector": "#btn-finalizar-venda", "text": "CLIQUE AQUI PARA PAGAR"}}ACTION_END"`;
    },

    speak: (text) => {
        if (!window.speechSynthesis || GroqAI.isSpeaking) return;
        GroqAI.isSpeaking = true;
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ''));
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1;

        // Animação de fala no holograma
        const projector = document.querySelector('.ai-hologram-projector');
        if (projector) projector.classList.add('speaking');

        utterance.onend = () => {
            GroqAI.isSpeaking = false;
            if (projector) projector.classList.remove('speaking');
        };
        speechSynthesis.speak(utterance);
    },

    executeAction: (action) => {
        console.log("⚡ Executing AI Action:", action);
        try {
            switch (action.type) {
                case 'NAVIGATE':
                    const dest = action.data.to;
                    const routes = {
                        'pos': () => Varejo.openPDV(),
                        'loja': () => App.router.goDashboard(),
                        'financeiro': () => App.router.go('financeiro'),
                        'produtos': () => App.router.go('produtos'),
                        'clientes': () => App.router.go('clientes'),
                        'config': () => App.router.go('config')
                    };
                    if (routes[dest]) routes[dest]();
                    else {
                        console.warn("Rota AI desconhecida, tentando genérica:", dest);
                        App.router.go(dest);
                    }
                    break;
                case 'OPEN_MODAL':
                    const m = action.data.modal;
                    if (m === 'crm') NaxioEnterprise.crm.openPanel();
                    else if (m === 'stock_history') NaxioEnterprise.stockHistory.openPanel();
                    else if (m === 'loyalty') NaxioEnterprise.loyalty.openPanel();
                    else if (m === 'promotions') NaxioEnterprise.promotions.openPanel();
                    else if (m === 'kpi') NaxioEnterprise.dashboardKPI.render();
                    break;
                case 'SEARCH_PRODUCT':
                    if (App.router.current === 'pos') Varejo.openSearchModal(action.data.term);
                    else {
                        const searchInput = document.getElementById('admin-prod-search');
                        if (searchInput) {
                            searchInput.value = action.data.term;
                            App.store.filterMyProducts();
                        }
                    }
                    break;
                case 'REG_MOVEMENT':
                    if (typeof Caixa !== 'undefined') {
                        Caixa.addMovement(action.data.tipo === 'entrada' ? 'Entrada' : 'Saída', action.data.valor, action.data.obs || 'Via IA');
                    }
                    break;
                case 'POINT_TO':
                    GroqAI.showHologram(action.data.text || "VEJA AQUI", 6000, action.data.selector);
                    break;
                case 'SHOW_LOGS':
                    GroqAI.showLogsInAir();
                    break;
                case 'CLEAR_CART':
                    if (confirm("IA: Deseja realmente limpar o carrinho atual?")) {
                        Varejo.state.cart = [];
                        Varejo.updateSummary();
                        App.utils.toast("Carrinho limpo pela IA", "info");
                    }
                    break;
            }
        } catch (e) {
            console.error("Erro ao executar ação da IA:", e);
        }
    },

    // Voice Support
    startVoice: () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return App.utils.toast("Voz não suportada", "error");

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        
        const btn = document.getElementById('ai-mic-btn');
        btn.classList.add('listening');

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            document.getElementById('ai-input-field').value = text;
            GroqAI.handleSend();
        };

        recognition.onspeechend = () => {
            recognition.stop();
            btn.classList.remove('listening');
        };

        recognition.onerror = () => {
            btn.classList.remove('listening');
        };

        recognition.start();
    },

    // Auto-Healing & Monitoring
    setupAutoHealing: () => {
        window.addEventListener('error', (e) => {
            console.log("🩹 AI Auto-Healing observando erro:", e.message);
            // Poderia enviar para a Groq analisar o erro
        });
    }
};

// Auto-boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(GroqAI.init, 1000));
} else {
    setTimeout(GroqAI.init, 1000);
}
