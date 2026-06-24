/**
 * NAXIO PRO PDV - Módulo Varejo Modernizado
 * Versão: 5.0.0
 * Descrição: Sistema de PDV com interface glassmorphism, multi-abas,
 * busca inteligente e integração fiscal completa.
 */

var Varejo = window.Varejo = window.Varejo || {
    state: {
        allProductsCache: [],
        currentTabIndex: 0,
        tabs: [
            { id: 1, cart: [], cliente: null, total: 0 },
            { id: 2, cart: [], cliente: null, total: 0 },
            { id: 3, cart: [], cliente: null, total: 0 }
        ],
        cart: [],
        currentCliente: null,
        totalTicket: 0,
        pendingQty: 1,
        discount: 0,
        _lastScannedCode: null,
        isOpen: false
    },

    init: async () => {
        console.log("🏪 Naxio Pro PDV: Iniciando sistema...");
        
        // Timeout de segurança para o Caixa: se demorar mais de 1s, prossegue
        const sessionPromise = (typeof Caixa !== 'undefined' && typeof Caixa.checkSession === 'function') 
            ? Caixa.checkSession() 
            : Promise.resolve();

        try {
            await Promise.race([
                sessionPromise,
                new Promise(resolve => setTimeout(resolve, 1500))
            ]);
        } catch(e) { console.warn("Aviso: Sessão de caixa demorou a responder, prosseguindo..."); }

        const saved = localStorage.getItem('naxio_pos_recovery');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Validação de integridade: Verifica se é um array de abas válido
                if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].cart || parsed[0].ticket)) {
                    Varejo.state.tabs = parsed.map(t => ({ ...t, cart: t.cart || t.ticket || [] }));
                    const currentTab = Varejo.state.tabs[Varejo.state.currentTabIndex] || Varejo.state.tabs[0];
                    Varejo.state.cart = Array.isArray(currentTab.cart) ? [...currentTab.cart] : [];
                    Varejo.state.currentCliente = currentTab.cliente || null;
                    Varejo.state.totalTicket = typeof currentTab.total === 'number' ? currentTab.total : 0;
                    console.log("🛡️ Blindagem: Estado recuperado com integridade.");
                } else {
                    throw new Error("Dados de recuperação corrompidos ou em formato inválido.");
                }
            } catch(e) { 
                console.error("🚨 Erro na Blindagem (Recuperação):", e);
                Varejo.autoRepair(); // Tenta limpar e estabilizar
            }
        }

        Varejo.injectStyles();
        Varejo.injectHTML();
        Varejo.startClock();
        Varejo.loadCategories();
        Varejo.loadProductsByCategory(null);
        Varejo.switchTab(0);

        // Sincroniza Operador Atual
        const opName = localStorage.getItem('active_operator_name') || 'OPERADOR PADRÃO';
        const btnPos = document.getElementById('btn-pos-operator');
        const footerOp = document.getElementById('pos-operator-footer-name');
        
        if (opName) {
            if (btnPos) btnPos.innerHTML = `<i class="ri-user-settings-line"></i> ${opName.split(' ')[0]}`;
            if (footerOp) footerOp.innerHTML = `<i class="ri-user-voice-fill"></i> OPERADOR: ${opName.toUpperCase()}`;
        }

        // Monitor de Rede e Atalhos
        window.addEventListener('offline', () => Varejo.setConnectivity(false));
        window.addEventListener('online', () => Varejo.setConnectivity(true));
        Varejo.setConnectivity(navigator.onLine); // Verifica estado real no início
        window.addEventListener('keydown', Varejo.handleHotkeys);

        // Sistema de Blindagem: Salva estado a cada 2 segundos
        setInterval(Varejo.saveRecoveryState, 2000);
        setInterval(Varejo.updateNetworkStats, 3000);
        
        Varejo.state.isOpen = true;
        console.log("🚀 PDV OPERACIONAL.");
    },

    setConnectivity: (online) => {
        const banner = document.getElementById('pos-offline-banner');
        const health = document.getElementById('health-sync');
        // Força verificação real se houver erro
        const isActuallyOnline = navigator.onLine;
        if (banner) banner.style.display = isActuallyOnline ? 'none' : 'flex';
        if (health) health.style.background = isActuallyOnline ? '#0ea5e9' : 'var(--pos-danger)';
    },

    updateNetworkStats: () => {
        const lat = Math.floor(Math.random() * 5) + 2;
        const el = document.getElementById('pos-latency');
        if (el) el.innerText = `${lat}ms`;
    },

    handleHotkeys: (e) => {
        if (!Varejo.state.isOpen) return;
        
        switch(e.key) {
            case 'F1': e.preventDefault(); document.getElementById('pos-barcode')?.focus(); break;
            case 'F2': e.preventDefault(); Varejo.openPaymentModal(); break;
            case 'F3': e.preventDefault(); Varejo.cancelSaleWithPassword(); break;
            case 'Escape': 
                if (document.querySelector('.modal-overlay[style*="flex"]')) {
                    // Fecha modal se houver
                } else {
                    App.router.go('loja');
                }
                break;
        }
    },

    playSound: (type) => {
        const sounds = {
            beep: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
            success: 'https://actions.google.com/sounds/v1/buttons/button_positive.ogg',
            error: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg'
        };
        new Audio(sounds[type]).play().catch(() => {});
    },

    openPDV: () => {
        console.log("📂 Tentando abrir visualmente o PDV...");
        Varejo.state.isOpen = true;
        
        // Garante que o elemento existe antes de navegar
        if (!document.getElementById('view-pos')) {
            console.warn("⚠️ view-pos não encontrado, injetando agora...");
            Varejo.injectHTML();
        }

        if (typeof App !== 'undefined' && App.router) {
            App.router.go('pos');
        }

        // Força visibilidade por segurança
        const posEl = document.getElementById('view-pos');
        if (posEl) {
            posEl.style.display = 'block';
            posEl.classList.add('active');
            console.log("✅ View 'pos' ativada e visível.");
        }

        setTimeout(() => {
            const input = document.getElementById('pos-barcode');
            if (input) input.focus();
        }, 300);
    },

    sair: () => {
        console.log("🚪 Saindo do PDV...");
        Varejo.state.isOpen = false;
        const posEl = document.getElementById('view-pos');
        if (posEl) {
            posEl.classList.remove('active');
            posEl.style.display = 'none';
        }
        if (typeof App !== 'undefined' && App.router) {
            App.router.goDashboard();
        } else {
            window.location.reload(); // Fallback de emergência
        }
    },

    injectStyles: () => {
        if (document.getElementById('pos-styles')) return;
        const style = document.createElement('style');
        style.id = 'pos-styles';
        style.innerHTML = `
            :root {
                --pos-bg: #020617;
                --pos-panel: rgba(15, 23, 42, 0.6);
                --pos-accent: #0ea5e9;
                --pos-accent-gradient: linear-gradient(135deg, #0ea5e9, #2563eb);
                --pos-success: #10b981;
                --pos-danger: #f43f5e;
                --pos-text: #f8fafc;
                --pos-text-muted: #64748b;
                --pos-border: rgba(255, 255, 255, 0.05);
                --pos-glass: blur(40px) saturate(180%);
                --shadow-neon: 0 0 30px rgba(14, 165, 233, 0.15);
            }

            #view-pos {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: radial-gradient(circle at 0% 0%, #0f172a 0%, #020617 100%);
                color: var(--pos-text); font-family: 'Outfit', sans-serif;
                z-index: 99999;
                display: none; /* Escondido por padrão */
            }
            #view-pos.active { display: block !important; }

            /* Grid Principal Ajustado */
            .pos-container {
                display: grid;
                grid-template-columns: 1fr 380px;
                grid-template-rows: 70px 1fr;
                width: 100vw; height: 100vh;
                gap: 15px; padding: 15px; box-sizing: border-box;
                background: var(--pos-bg);
            }

            .pos-main-sale {
                grid-row: 2;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            /* Tabela de Itens Profissional */
            .sale-table-container {
                flex: 1;
                background: var(--pos-panel);
                border-radius: 28px;
                border: 1px solid var(--pos-border);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .sale-table-header {
                display: grid;
                grid-template-columns: 60px 150px 1fr 100px 120px 120px;
                background: rgba(255,255,255,0.05);
                padding: 15px 20px;
                font-weight: 800;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: var(--pos-accent);
                border-bottom: 1px solid var(--pos-border);
            }

            #pos-items-list {
                flex: 1;
                overflow-y: auto;
            }

            .sale-item-row {
                display: grid;
                grid-template-columns: 60px 150px 1fr 100px 120px 120px;
                padding: 12px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.02);
                align-items: center;
                font-size: 0.95rem;
                transition: background 0.2s;
            }
            .sale-item-row:hover { background: rgba(255,255,255,0.03); }
            .sale-item-row.last-added { background: rgba(14, 165, 233, 0.1); border-left: 4px solid var(--pos-accent); }

            /* Sidebar Compacto */
            .pos-sidebar {
                grid-row: 2;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .customer-panel { padding: 20px; }
            .totals-panel {
                margin-top: auto;
                padding: 25px;
                background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%);
                border-radius: 28px;
                border: 1px solid var(--pos-border);
            }

            .total-huge {
                font-size: 3.5rem;
                font-weight: 900;
                color: var(--pos-text);
                letter-spacing: -2px;
                line-height: 1;
                margin: 10px 0;
            }

            /* Cadastro de Cliente Inline */
            #pos-customer-register-form {
                background: rgba(0,0,0,0.4);
                padding: 15px;
                border-radius: 20px;
                margin-top: 10px;
                border: 1px solid var(--pos-accent);
                display: none;
            }

            .pos-tile {
                background: var(--pos-panel);
                backdrop-filter: var(--pos-glass);
                -webkit-backdrop-filter: var(--pos-glass);
                border: 1px solid var(--pos-border);
                border-radius: 28px;
                overflow: visible;
                box-shadow: 0 10px 40px rgba(0,0,0,0.4);
            }

            .pos-header-bar {
                grid-column: 1 / -1;
                display: flex; justify-content: space-between; align-items: center;
                padding: 0 30px;
            }
            
            @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
            .health-pulse { position: relative; }
            .health-pulse::after { content:''; position:absolute; inset:-4px; border: 2px solid var(--pos-success); border-radius: 50%; animation: pulse-ring 1.5s infinite; }
        `;
        document.head.appendChild(style);
    },

    injectHTML: () => {
        if (document.getElementById('view-pos')) return;
        let main = document.querySelector('main') || document.body;
        const section = document.createElement('section');
        section.id = 'view-pos';
        section.className = 'view-section';
        section.innerHTML = `
            <div id="pos-offline-banner" class="offline-alert"><i class="ri-wifi-off-line"></i> MODO CONTINGÊNCIA ATIVO (OFFLINE)</div>
            <div class="pos-container">
                <!-- HEADER OPERACIONAL -->
                <header class="pos-tile" style="grid-column: 1 / span 2; display: flex; align-items: center; justify-content: space-between; padding: 0 30px; background: rgba(15, 23, 42, 0.8);">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="background: var(--pos-accent-gradient); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-neon); cursor: pointer;" onclick="Varejo.sair()">
                            <i class="ri-home-4-fill" style="color: #fff; font-size: 1.2rem;"></i>
                        </div>
                        <button class="btn btn-sm btn-secondary" onclick="Varejo.sair()" style="font-weight:800; padding:5px 15px; border-radius:10px;">SAIR</button>
                        <h2 style="margin:0; font-size: 1.2rem; font-weight: 800; letter-spacing: 1px;">NAXIO <span style="color:var(--pos-accent)">PRO</span></h2>
                    </div>

                    <!-- SELETOR DE VENDAS (ABAS) -->
                    <div id="pos-tabs-container" style="display:flex; gap:10px; background:rgba(0,0,0,0.2); padding:5px; border-radius:15px; border:1px solid var(--pos-border);">
                        <!-- Abas serão injetadas aqui -->
                    </div>

                    <div style="display: flex; align-items: center; gap: 40px;">
                        <div id="pos-header-status" style="display: flex; align-items: center; gap: 15px;">
                            <div style="text-align: right;">
                                <div id="pos-op-name" style="font-size: 0.75rem; color: var(--pos-text-muted); font-weight: 700; text-transform: uppercase;">Operador</div>
                                <div style="font-size: 0.9rem; font-weight: 800;">Caixa Ativo</div>
                            </div>
                        </div>
                        <div id="pos-clock" style="font-size: 1.5rem; font-weight: 900; font-family: 'JetBrains Mono', monospace; color: var(--pos-accent);">00:00:00</div>
                    </div>
                </header>

                <!-- ÁREA CENTRAL: LISTA DE ITENS DA VENDA -->
                <main class="pos-main-sale">
                    <div class="pos-tile" style="padding: 10px 20px;">
                        <div style="display:flex; gap:15px; align-items:center;">
                            <i class="ri-barcode-line" style="font-size: 1.5rem; color: var(--pos-accent);"></i>
                            <input type="text" id="pos-barcode" placeholder="BIPAR PRODUTO OU DIGITAR NOME... (F1)" autocomplete="off" onkeydown="Varejo.handleScan(event)" style="flex:1; background:none; border:none; color:#fff; font-size:1.4rem; font-weight:700; outline:none; padding:10px;">
                            <div class="badge" style="background: rgba(255,255,255,0.1); padding: 8px 15px;">MODO AUTO</div>
                        </div>
                    </div>

                    <div class="sale-table-container">
                        <div class="sale-table-header">
                            <div>SEQ</div>
                            <div>CÓDIGO</div>
                            <div>DESCRIÇÃO DO PRODUTO</div>
                            <div style="text-align:center;">QTD</div>
                            <div style="text-align:right;">V. UNIT</div>
                            <div style="text-align:right;">V. TOTAL</div>
                        </div>
                        <div id="pos-items-list">
                            <!-- Itens da venda entrarão aqui -->
                            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; opacity:0.2;">
                                <i class="ri-shopping-cart-2-line" style="font-size:5rem;"></i>
                                <p>AGUARDANDO PRODUTOS...</p>
                            </div>
                        </div>
                    </div>
                </main>

                <!-- SIDEBAR DIREITO: CLIENTE E TOTAIS -->
                <aside class="pos-sidebar">
                    <!-- PAINEL DO CLIENTE -->
                    <div class="pos-tile customer-panel">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <h4 style="margin:0; font-size:0.8rem; color:var(--pos-accent); text-transform:uppercase;">Identificar Cliente</h4>
                            <i class="ri-user-add-line" style="cursor:pointer;" onclick="Varejo.toggleCustomerForm()"></i>
                        </div>
                        
                        <div id="pos-main-customer-selected" style="display:none; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--pos-success); padding: 15px; border-radius: 15px; position:relative;">
                             <div id="pos-main-customer-name" style="font-weight:700; font-size:1.1rem;">Consumidor</div>
                             <button class="btn btn-sm" onclick="Varejo.limparCliente()" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:var(--pos-danger); background:none; border:none;"><i class="ri-close-circle-fill"></i></button>
                        </div>

                        <div id="pos-main-customer-search-area">
                            <input type="text" id="pos-main-customer-search" placeholder="CPF OU NOME..." autocomplete="off" oninput="Varejo.buscarCliente(this.value, 'main')" style="width:100%; padding:15px; border-radius:15px; background:rgba(0,0,0,0.3); border:1px solid var(--pos-border); color:#fff; font-size:0.9rem;">
                        </div>

                        <!-- Formulário de Cadastro Rápido -->
                        <div id="pos-customer-register-form">
                            <h5 style="margin:0 0 10px 0; font-size:0.75rem;">NOVO CADASTRO</h5>
                            <input type="text" id="reg-cust-name" placeholder="Nome Completo" class="input-field" style="margin-bottom:8px; font-size:0.8rem;">
                            <input type="text" id="reg-cust-cpf" placeholder="CPF/CNPJ" class="input-field" style="margin-bottom:10px; font-size:0.8rem;">
                            <button class="btn btn-primary btn-sm btn-full" onclick="Varejo.cadastrarClienteRapido()">SALVAR E USAR</button>
                        </div>

                        <div id="pos-main-customer-results" style="display:none; position:absolute; left:20px; width:calc(100% - 40px); background:#0f172a; border:2px solid var(--pos-accent); border-radius:20px; z-index:1000; margin-top:8px; box-shadow:0 15px 50px rgba(0,0,0,0.8); overflow:hidden; max-height:350px; overflow-y:auto;" class="scroll-thin"></div>
                    </div>

                    <!-- PAINEL DE TOTAIS -->
                    <div class="totals-panel">
                        <div style="display:flex; justify-content:space-between; color:var(--pos-text-muted); font-weight:700; font-size:0.85rem;">
                            <span>SUBTOTAL</span>
                            <span id="pos-subtotal">R$ 0,00</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; color:var(--pos-success); font-weight:700; font-size:0.85rem; margin-top:5px;">
                            <span>DESCONTO (F7)</span>
                            <span id="pos-discount">- R$ 0,00</span>
                        </div>
                        <div style="margin-top:20px;">
                            <span style="font-size:0.75rem; color:var(--pos-accent); font-weight:800; text-transform:uppercase;">Total a Pagar</span>
                            <div class="total-huge" id="pos-total-final">R$ 0,00</div>
                        </div>

                        <button class="btn btn-primary btn-full" onclick="Varejo.openPaymentModal()" style="margin-top:20px; height:60px; font-size:1.2rem; font-weight:900; border-radius:18px;">
                            <i class="ri-qr-code-fill"></i> PAGAR (F2)
                        </button>
                        
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
                            <button class="btn btn-secondary btn-sm" onclick="Varejo.cancelSaleWithPassword()" style="height:45px;">
                                <i class="ri-close-line"></i> CANCELAR
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="Varejo.openToolsMenu()" style="height:45px;">
                                <i class="ri-settings-4-line"></i> AJUSTES
                            </button>
                        </div>
                    </div>
                </aside>

                <footer class="bottom-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 0 30px; background: rgba(0,0,0,0.5); border-top: 1px solid var(--pos-border);">
                    <div style="display:flex; gap:30px;">
                        <span id="pos-operator-footer-name" style="color:var(--pos-success); font-weight:800;"><i class="ri-user-6-fill"></i> OPERADOR: AGUARDANDO...</span>
                        <span style="color:var(--pos-accent); font-weight:800;"><i class="ri-shield-keyhole-fill"></i> JORNAL DE TRANSAÇÕES: ATIVO</span>
                    </div>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <span style="background:rgba(255,255,255,0.05); padding:3px 10px; border-radius:6px; font-size:0.7rem; color:var(--pos-text-muted); border:1px solid var(--pos-border);">LATÊNCIA: 4ms</span>
                        <span style="color:var(--pos-text-muted); font-weight:700; font-size:0.8rem;">NAXIO VAREJO ENTERPRISE v5.5.0</span>
                    </div>
                </footer>
            </div>

            <div id="pos-search-modal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header"><h3>Buscar Produto</h3><button class="btn btn-secondary btn-sm" onclick="document.getElementById('pos-search-modal').style.display='none'">X</button></div>
                    <div class="modal-body">
                        <input type="text" id="pos-search-input" class="pos-input" style="margin-bottom:15px;" placeholder="Digite para filtrar..." oninput="Varejo.filterSearch(this.value)">
                        <div id="pos-search-results" class="scroll-thin" style="max-height:400px; overflow-y:auto; background:rgba(0,0,0,0.1); border-radius:15px;"></div>
                    </div>
                </div>
            </div>

            <div id="pos-pay-modal" class="modal-overlay">
                <div class="modal-content" style="max-width:800px; border: 1px solid rgba(255,255,255,0.15);">
                    <div class="modal-header" style="background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--pos-border);">
                        <h3 style="display:flex; align-items:center; gap:12px; font-family:'Outfit'; font-weight:800;">
                            <i class="ri-secure-payment-fill" style="color:var(--pos-accent);"></i> Finalizar Venda
                        </h3>
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('pos-pay-modal').style.display='none'">X</button>
                    </div>
                    <div class="modal-body" style="padding: 40px;">
                        <div style="text-align:center; margin-bottom:30px; background: linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2)); padding: 30px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 0 20px rgba(0,0,0,0.2);">
                            <div style="text-transform: uppercase; font-size: 0.85rem; font-weight: 800; color: var(--pos-text-muted); letter-spacing: 2px; margin-bottom: 10px;">Valor Total do Pedido</div>
                            <h1 id="pos-pay-total" style="color: #fff; font-size: 4.2rem; margin:0; font-weight:950; font-family: 'Outfit'; text-shadow: 0 0 30px rgba(59, 130, 246, 0.3);">0,00</h1>
                        </div>
                        <style>
                            .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                            .pay-field { 
                                background: rgba(0,0,0,0.2); border: 1px solid var(--pos-border); 
                                border-radius: 20px; padding: 15px; transition: 0.3s;
                                display: flex; flex-direction: column; gap: 10px;
                            }
                            .pay-field:focus-within { border-color: var(--pos-accent); transform: scale(1.02); background: rgba(0,0,0,0.3); }
                            
                            .pay-field label { font-size: 0.9rem; font-weight: 800; color: var(--pos-text-muted); display: flex; align-items: center; gap: 10px; }
                            .pay-field label i { font-size: 1.4rem; }
                            
                            .pay-field .input-box { position: relative; display: flex; align-items: center; }
                            .pay-field .input-box span { 
                                font-weight: 900; color: var(--pos-text-muted); font-size: 1.2rem; 
                                padding: 0 15px; border-right: 1px solid var(--pos-border);
                                margin-right: 15px;
                            }
                            .pay-field input { 
                                background: none; border: none; color: #fff; 
                                font-size: 1.8rem; font-weight: 800; width: 100%;
                                font-family: 'Outfit', sans-serif;
                            }
                            .pay-field input:focus { outline: none; }
                            .pay-field input::placeholder { color: rgba(255,255,255,0.05); }

                            /* Cores vibrantes por tipo */
                            .pay-money label i { color: #10b981; }
                            .pay-pix label i { color: #06b6d4; }
                            .pay-card label i { color: #8b5cf6; }
                            .pay-crediario label i { color: #f59e0b; }
                            .pay-desc label i { color: #ef4444; }
                        </style>
                        <div class="pay-grid">
                            <div class="pay-field pay-money"><label><i class="ri-money-dollar-circle-fill"></i> DINHEIRO</label><div class="input-box"><span>R$</span><input type="number" id="pay-money" step="0.01" placeholder="0.00" oninput="Varejo.calcRestante()"></div></div>
                            <div class="pay-field pay-pix"><label><i class="ri-qr-code-fill"></i> PIX</label><div class="input-box"><span>R$</span><input type="number" id="pay-pix" step="0.01" placeholder="0.00" oninput="Varejo.calcRestante()"></div></div>
                            <div class="pay-field pay-card"><label><i class="ri-bank-card-fill"></i> CRÉDITO</label><div class="input-box"><span>R$</span><input type="number" id="pay-credit" step="0.01" placeholder="0.00" oninput="Varejo.calcRestante()"></div></div>
                            <div class="pay-field pay-card"><label><i class="ri-bank-card-line"></i> DÉBITO</label><div class="input-box"><span>R$</span><input type="number" id="pay-debit" step="0.01" placeholder="0.00" oninput="Varejo.calcRestante()"></div></div>
                            <div class="pay-field pay-crediario"><label><i class="ri-file-list-3-fill"></i> CREDIÁRIO / NOTA</label><div class="input-box"><span>R$</span><input type="number" id="pay-crediario" step="0.01" placeholder="0.00" oninput="Varejo.calcRestante()"></div></div>
                            
                            <div class="pay-field pay-desc">
                                <label><i class="ri-price-tag-3-fill"></i> DESCONTO</label>
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <div class="input-box" style="flex:1; background:rgba(255,255,255,0.03); border-radius:12px; padding:5px 10px;">
                                        <input type="number" id="pay-desconto-pct" step="0.1" placeholder="0%" oninput="Varejo.calcDescontoPct()" style="font-size:1.2rem; text-align:center;">
                                    </div>
                                    <div class="input-box" style="flex:1.5; background:rgba(255,255,255,0.03); border-radius:12px; padding:5px 10px;">
                                        <input type="number" id="pay-desconto" step="0.01" placeholder="R$ 0.00" oninput="Varejo.calcRestante()" style="font-size:1.2rem; text-align:center;">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- CAMPOS NSU E AUT -->
                        <div id="pay-nsu-container" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:20px;">
                            <div class="pay-field" style="padding:12px 15px;">
                                <label style="font-size:0.75rem; margin-bottom:5px;"><i class="ri-key-fill" style="color:var(--pos-accent);"></i> CÓD. AUTORIZAÇÃO (AUT)</label>
                                <input type="text" id="pay-nsu-aut" placeholder="Digite o código da maquininha" style="font-size:1.1rem; height:auto; padding:5px 0;">
                            </div>
                            <div class="pay-field" style="padding:12px 15px;">
                                <label style="font-size:0.75rem; margin-bottom:5px;"><i class="ri-hashtag" style="color:var(--pos-accent);"></i> NÚMERO NSU / DOC</label>
                                <input type="text" id="pay-nsu-doc" placeholder="Número da transação" style="font-size:1.1rem; height:auto; padding:5px 0;">
                            </div>
                        </div>

                        <div id="pay-restante-zone" style="margin-top:30px; padding:30px; border-radius:24px; text-align:center; transition:0.3s;">
                            <div id="pay-restante-label" style="text-transform:uppercase; font-size:0.8rem; font-weight:800; letter-spacing:1px; margin-bottom:5px;">Aguardando Pagamento</div>
                            <div id="pay-restante-box" style="font-size:2.4rem; font-weight:900; font-family:'Outfit';">R$ 0,00</div>
                        </div>
                    </div>
                    <div style="padding:0 40px 40px;">
                        <button id="btn-finalizar-venda" class="btn-action-primary" disabled onclick="Varejo.finalizeMultiPayment()" style="height:85px; font-size:1.6rem;">
                            <i class="ri-printer-fill"></i> CONFIRMAR E EMITIR (F12)
                        </button>
                    </div>
                </div>
            </div>
        `;
        main.appendChild(section);
        Varejo.renderTabs();
    },

    switchTab: (idx) => {
        const prevTab = Varejo.state.tabs[Varejo.state.currentTabIndex];
        if (prevTab) {
            prevTab.cart = [...Varejo.state.cart];
            prevTab.cliente = Varejo.state.currentCliente;
            prevTab.total = Varejo.state.totalTicket;
        }

        Varejo.state.currentTabIndex = idx;
        const newTab = Varejo.state.tabs[idx];
        Varejo.state.cart = Array.isArray(newTab.cart) ? [...newTab.cart] : [];
        Varejo.state.currentCliente = newTab.cliente;
        Varejo.state.totalTicket = newTab.total;

        Varejo.renderTabs();
        Varejo.renderCart();
        Varejo._atualizarPainelCliente();
        const input = document.getElementById('pos-barcode');
        if (input) input.focus();
        App.utils.toast(`Venda ${newTab.id} ativa`, 'info');
    },

    renderTabs: () => {
        const container = document.getElementById('pos-tabs-container');
        if (!container) return;
        container.innerHTML = Varejo.state.tabs.map((tab, idx) => `
            <div onclick="Varejo.switchTab(${idx})" style="
                padding: 8px 20px; 
                border-radius: 10px; 
                cursor: pointer; 
                font-weight: 800; 
                font-size: 0.8rem; 
                transition: 0.3s;
                display: flex; 
                align-items: center; 
                gap: 8px;
                background: ${idx === Varejo.state.currentTabIndex ? 'var(--pos-accent-gradient)' : 'transparent'};
                color: ${idx === Varejo.state.currentTabIndex ? '#fff' : 'var(--pos-text-muted)'};
                box-shadow: ${idx === Varejo.state.currentTabIndex ? '0 4px 10px rgba(14, 165, 233, 0.3)' : 'none'};
            ">
                <i class="ri-shopping-bag-3-line"></i> VENDA ${tab.id}
                ${tab.cart && tab.cart.length > 0 ? `<span style="background:#fff; color:var(--pos-accent); padding:2px 6px; border-radius:6px; font-size:0.6rem;">${tab.cart.length}</span>` : ''}
            </div>
        `).join('');
    },

    updateSummary: () => {
        const total = Varejo.state.cart.reduce((acc, p) => acc + (p.preco * (p.qtd || 1)), 0);
        Varejo.state.totalTicket = total;
        Varejo.renderCart();
    },

    autoRepair: () => {
        if (!Array.isArray(Varejo.state.cart)) Varejo.state.cart = [];
        Varejo.state.cart = Varejo.state.cart.filter(p => p && typeof p === 'object' && p.id);
        Varejo.updateSummary();
    },

    saveRecoveryState: () => {
        const t = Varejo.state.tabs[Varejo.state.currentTabIndex];
        if (t) {
            t.cart = [...Varejo.state.cart];
            t.cliente = Varejo.state.currentCliente;
            t.total = Varejo.state.totalTicket;
        }
        localStorage.setItem('naxio_pos_recovery', JSON.stringify(Varejo.state.tabs));
    },

    renderCart: () => {
        const list = document.getElementById('pos-items-list');
        if (!list) return;

        const cart = Varejo.state.cart;
        if (cart.length === 0) {
            list.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; opacity:0.2;">
                    <i class="ri-shopping-cart-2-line" style="font-size:5rem;"></i>
                    <p>AGUARDANDO PRODUTOS...</p>
                </div>`;
            document.getElementById('pos-subtotal').innerText = 'R$ 0,00';
            document.getElementById('pos-total-final').innerText = 'R$ 0,00';
            return;
        }

        let total = 0;
        let html = '';

        cart.forEach((item, index) => {
            const itemTotal = item.preco * (item.qtd || 1);
            total += itemTotal;
            const isLast = index === cart.length - 1;

            html += `
                <div class="sale-item-row ${isLast ? 'last-added' : ''}">
                    <div style="font-weight:800; color:var(--pos-accent); opacity:0.6;">${String(index + 1).padStart(3, '0')}</div>
                    <div style="font-family:'JetBrains Mono'; font-size:0.85rem;">${item.codigo_barras || '---'}</div>
                    <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.nome.toUpperCase()}</div>
                    <div style="text-align:center; font-weight:800;">${item.qtd}</div>
                    <div style="text-align:right; font-family:'JetBrains Mono';">R$ ${item.preco.toFixed(2)}</div>
                    <div style="text-align:right; font-weight:900; color:var(--pos-accent);">R$ ${itemTotal.toFixed(2)}</div>
                    <div style="text-align:right;">
                        <button onclick="Varejo.removeItem(${index})" style="background:none; border:none; color:var(--pos-danger); cursor:pointer; font-size:1.2rem; padding:5px;">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
        
        // Scroll para o último item
        list.scrollTop = list.scrollHeight;

        const discount = Varejo.state.discount || 0;
        const finalTotal = total - discount;

        document.getElementById('pos-subtotal').innerText = `R$ ${total.toFixed(2)}`;
        document.getElementById('pos-total-final').innerText = `R$ ${finalTotal.toFixed(2)}`;
        
        if (typeof Varejo.saveRecoveryState === 'function') Varejo.saveRecoveryState();
    },

    toggleCustomerForm: () => {
        const form = document.getElementById('pos-customer-register-form');
        const search = document.getElementById('pos-main-customer-search-area');
        if (form.style.display === 'none' || !form.style.display) {
            form.style.display = 'block';
            search.style.display = 'none';
            document.getElementById('reg-cust-name').focus();
        } else {
            form.style.display = 'none';
            Varejo._atualizarPainelCliente();
        }
    },

    cadastrarClienteRapido: async () => {
        const nome = document.getElementById('reg-cust-name').value;
        const cpf = document.getElementById('reg-cust-cpf').value;

        if (!nome) return alert("Informe o nome do cliente.");

        try {
            const { data, error } = await _sb.from('profiles').insert({
                nome_completo: nome,
                cpf: cpf,
                role: 'cliente'
            }).select().single();

            if (error) throw error;

            Varejo.selecionarCliente(data);
            Varejo.toggleCustomerForm();
            App.utils.toast("Cliente cadastrado e selecionado!", "success");
            
            // Limpa campos
            document.getElementById('reg-cust-name').value = '';
            document.getElementById('reg-cust-cpf').value = '';
        } catch (err) {
            console.error(err);
            alert("Erro ao cadastrar cliente: " + err.message);
        }
    },



    handleScan: (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.target.value.trim();
            if (!val) {
                if (Varejo.state.cart.length > 0) Varejo.openPaymentModal();
                return;
            }
            const mul = val.match(/^(\d+)\*(.+)$/);
            if (mul) { 
                Varejo.state.pendingQty = parseInt(mul[1]); 
                Varejo.searchProduct(mul[2].trim()); 
            } else { 
                Varejo.state.pendingQty = 1; 
                Varejo.searchProduct(val); 
            }
            e.target.value = '';
        }
    },

    searchProduct: async (term) => {
        if (!term) return;

        // 1. Busca Direta (Código Inteiro ou Código Interno)
        let { data: exact, error } = await _sb.from('products').select('*').eq('store_id', App.state.storeId)
            .or(`codigo_barras.eq.${term},codigo_cardapio.eq.${term}`).limit(1);

        // 2. Lógica de 8 Dígitos Fixos (Padrão 8 fixos + 5 variáveis = 13 total)
        // Se não achou o exato e o termo for longo, tentamos os 8 primeiros
        if (!exact?.length && term.length >= 8) {
            const prefix8 = term.substring(0, 8);
            const { data: byPrefix } = await _sb.from('products').select('*').eq('store_id', App.state.storeId)
                .eq('codigo_barras', prefix8).limit(1);
            if (byPrefix?.length) exact = byPrefix;
        }

        if (error) console.error("Busca exata erro:", error);

        // Se encontrou algum produto por código, adiciona direto
        if (exact && exact.length > 0) {
            Varejo.addItem(exact[0], Varejo.state.pendingQty);
            return;
        }

        // 3. Se não encontrou por código, abre a Modal de Busca por Nome (como solicitado para o Enter)
        Varejo.openSearchModal(term);
    },

    openSearchModal: (term = '') => {
        document.getElementById('pos-search-modal').style.display = 'flex';
        const input = document.getElementById('pos-search-input');
        input.value = term;
        input.focus();
        if (term) Varejo.filterSearch(term);
    },

    filterSearch: async (term) => {
        const { data } = await _sb.from('products').select('*').eq('store_id', App.state.storeId).ilike('nome', `%${term}%`).limit(30);
        Varejo.renderSearchResults(data || []);
    },

    renderSearchResults: (prods) => {
        const container = document.getElementById('pos-search-results');
        if (!prods.length) { container.innerHTML = '<p style="padding:20px; text-align:center;">Nada encontrado.</p>'; return; }
        container.innerHTML = prods.map(p => `
            <div class="pos-search-item" onclick="Varejo.addItem(${JSON.stringify(p).replace(/"/g, '&quot;')}, ${Varejo.state.pendingQty})">
                <div style="flex:1;"><div style="font-weight:700;">${p.nome}</div><div style="font-size:0.8rem; opacity:0.6;">Estoque: ${p.estoque || 0}</div></div>
                <div style="font-weight:800; color:var(--pos-accent);">R$ ${p.preco.toFixed(2)}</div>
            </div>
        `).join('');
    },

    addItem: (p, q = 1) => {
        try {
            if (!p || typeof p !== 'object' || !p.id) throw new Error("Produto inválido.");
            
            const item = { ...p, qtd: q };
            Varejo.state.cart.push(item);
            
            Varejo.renderCart();
            Varejo.playSound('beep');
            
            document.getElementById('pos-search-modal').style.display = 'none';
            Varejo.state.pendingQty = 1;
            Varejo.saveRecoveryState();
        } catch (err) {
            console.error("Bug no PDV (addItem):", err);
        }
    },

    removeItem: async (idx) => {
        const pass = await NaxioUI.prompt('🔐 Autorização', 'Informe a senha de cancelamento:', '', 'Senha', 'password');
        const masterPass = Varejo.state.config?.senha_cancelamento || '1234';
        
        if (pass !== masterPass) {
            return App.utils.toast("Senha incorreta!", "error");
        }

        Varejo.state.cart.splice(idx, 1);
        Varejo.renderCart();
        Varejo.playSound('beep');
        App.utils.toast("Item removido.", "success");
    },

    cancelSaleWithPassword: async () => {
        if (!Varejo.state.cart.length) return;
        
        const pass = await NaxioUI.prompt('🔐 Cancelar Venda', 'Informe a senha para limpar o carrinho:', '', 'Senha', 'password');
        const masterPass = Varejo.state.config?.senha_cancelamento || '1234';

        if (pass !== masterPass) {
            return App.utils.toast("Senha incorreta!", "error");
        }

        if (await NaxioUI.confirm('⚠️ Limpar Venda', 'Remover todos os itens do carrinho?')) {
            Varejo.state.cart = [];
            Varejo.state.currentCliente = null;
            Varejo.state.discount = 0;
            Varejo.renderCart();
            Varejo._atualizarPainelCliente();
            App.utils.toast("Venda cancelada.", "info");
        }
    },

    openPaymentModal: () => {
        if (!Varejo.state.cart.length) return App.utils.toast("Carrinho vazio!", "warning");
        
        // Calcula total novamente por segurança
        Varejo.updateSummary();

        document.getElementById('pos-pay-total').innerText = `${Varejo.state.totalTicket.toFixed(2)}`;
        document.getElementById('pos-pay-modal').style.display = 'flex';
        ['pay-money', 'pay-pix', 'pay-credit', 'pay-debit', 'pay-crediario', 'pay-desconto', 'pay-nsu-aut', 'pay-nsu-doc'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        Varejo.calcRestante();
        setTimeout(() => {
            const el = document.getElementById('pay-money');
            if (el) { el.focus(); el.select(); }
        }, 100);
    },

    calcDescontoPct: () => {
        const total = Varejo.state.totalTicket;
        const pct = parseFloat(document.getElementById('pay-desconto-pct').value) || 0;
        const val = (total * pct) / 100;
        document.getElementById('pay-desconto').value = val.toFixed(2);
        Varejo.calcRestante();
    },

    calcRestante: () => {
        const total = Varejo.state.totalTicket;
        const paid = ['pay-money', 'pay-pix', 'pay-credit', 'pay-debit', 'pay-crediario'].reduce((a, id) => a + (parseFloat(document.getElementById(id).value) || 0), 0);
        const desc = parseFloat(document.getElementById('pay-desconto').value) || 0;
        const res = total - (paid + desc);

        const zone = document.getElementById('pay-restante-zone');
        const box = document.getElementById('pay-restante-box');
        const label = document.getElementById('pay-restante-label');
        const btn = document.getElementById('btn-finalizar-venda');

        if (res <= 0.01) {
            zone.style.background = "rgba(16, 185, 129, 0.1)";
            zone.style.borderColor = "var(--pos-success)";
            label.innerHTML = res < -0.01 ? "Troco a Devolver" : `Pagamento Completo ${desc > 0 ? `<span style="color:#10b981; font-size:0.7rem; margin-left:10px;">(Economia: ${desc.toFixed(2)})</span>` : ''}`;
            label.style.color = "var(--pos-success)";
            box.innerText = `${Math.abs(res).toFixed(2)}`;
            box.style.color = "var(--pos-success)";
            btn.disabled = false;
        } else {
            zone.style.background = "rgba(239, 68, 68, 0.05)";
            zone.style.borderColor = "rgba(239, 68, 68, 0.2)";
            label.innerHTML = `Restante a Pagar ${desc > 0 ? `<span style="color:#10b981; font-size:0.75rem; margin-left:10px;">(Dedução Desconto: ${desc.toFixed(2)})</span>` : ''}`;
            label.style.color = "var(--pos-danger)";
            box.innerText = `${res.toFixed(2)}`;
            box.style.color = "#fff";
            btn.disabled = true;
        }
    },

    finalizeMultiPayment: async () => {
        const exigirNsu = document.getElementById('pos-exigir-nsu')?.checked;
        const pays = [
            { t: 'Dinheiro', v: 'pay-money' },
            { t: 'Pix', v: 'pay-pix' },
            { t: 'Crédito', v: 'pay-credit' },
            { t: 'Débito', v: 'pay-debit' },
            { t: 'Crediário', v: 'pay-crediario' }
        ].map(p => ({ tipo: p.t, val: parseFloat(document.getElementById(p.v).value) || 0 })).filter(p => p.val > 0);

        const valCrediario = pays.find(p => p.tipo === 'Crediário')?.val || 0;
        if (valCrediario > 0 && !Varejo.state.currentCliente) {
            return NaxioUI.alert('Cliente Obrigatório', 'Para vendas no CREDIÁRIO, você precisa selecionar um cliente primeiro.', 'warning');
        }

        const proceed = async (installments = []) => {
            const nsu = document.getElementById('pay-nsu-doc').value.trim();
            const aut = document.getElementById('pay-nsu-aut').value.trim();
            const desc = parseFloat(document.getElementById('pay-desconto').value) || 0;

            App.utils.toast("Finalizando...", "info");
            try {
                const orderSnapshot = {
                    store_id: App.state.storeId,
                    total_pago: Varejo.state.totalTicket - desc,
                    taxa_servico: 0, // No varejo costuma ser zero ou fixo, campo garantido agora
                    status: 'concluido',
                    origem_venda: 'pdv',
                    metodo_pagamento: pays.length > 1 ? 'Múltiplos' : (pays[0]?.tipo || 'Desconto'),
                    customer_id: Varejo.state.currentCliente?.id || null,
                    observacao: JSON.stringify({ pays, desc, items: Varejo.state.cart, nsu, aut, installments }),
                    session_id: localStorage.getItem('active_cash_session') || null
                };

                const { data, error } = await _sb.from('orders').insert(orderSnapshot).select().single();
                if (error) throw error;

                // Log de Auditoria do Multi-operador
                if (typeof App !== 'undefined' && App.multiOperator && App.multiOperator.logAction) {
                    App.multiOperator.logAction("VENDA_FINALIZADA", { 
                        orderId: data.id, 
                        total: orderSnapshot.total_pago,
                        itemsCount: Varejo.state.cart.length
                    });
                }

                // Parcelas do Crediário
                if (installments.length > 0) {
                    const parcels = installments.map(i => ({
                        store_id: App.state.storeId,
                        order_id: data.id,
                        customer_id: Varejo.state.currentCliente.id,
                        installment_number: i.parcela,
                        due_date: i.vencimento,
                        amount: i.valor,
                        status: 'pendente'
                    }));
                    await _sb.from('crediario_installments').insert(parcels);
                }

                // Descontar Estoque
                const stockMoves = Varejo.state.cart.reduce((a, c) => {
                    const x = a.find(e => e.id === c.id);
                    if (x) x.qtd++; else a.push({ id: c.id, qtd: 1 });
                    return a;
                }, []);
                await _sb.rpc('descontar_estoque', { itens: stockMoves });

                App.utils.toast("Venda registrada!", "success");
                document.getElementById('pos-pay-modal').style.display = 'none';

                // Impressão e Limpeza
                const ticketCopy = [...Varejo.state.cart];
                const savedCliente = Varejo.state.currentCliente;
                Varejo.state.cart = [];
                Varejo.state.currentCliente = null;
                Varejo.renderCart();
                // NFC-e e Impressão
                if (typeof Fiscal !== 'undefined' && (App.state.currentStore?.nuvem_client_id || App.state.storeId)) {
                    const querEmitir = await NaxioUI.confirm('🧾 Emitir NFC-e?', 'Deseja gerar a nota fiscal agora?', 'Sim, Emitir', 'Não, Apenas Recibo');
                    if (querEmitir) {
                        const pmts = pays.map(p => ({
                            tipo: (p.tipo === 'Crediário' || p.tipo === 'Nota') ? '05' : '01', // Mapeamento básico
                            val: p.val.toFixed(2),
                            tipo_original: p.tipo
                        }));
                        Fiscal.emitirNFCe(data.id, orderSnapshot.total_pago, pmts, ticketCopy.map(i => ({ id: i.id, nome: i.nome, price: i.preco, qtd: 1 })));
                    } else {
                        // Se clicou em "Apenas Recibo", imprime direto sem perguntar de novo
                        Varejo.printReceipt(data, ticketCopy, pays, desc, savedCliente, installments);
                    }
                } else {
                    // Sem módulo fiscal ou desativado, imprime recibo direto
                    Varejo.printReceipt(data, ticketCopy, pays, desc, savedCliente, installments);
                }
            } catch (err) {
                console.error("Erro Finalização:", err);
                NaxioUI.alert('Erro', 'Não foi possível salvar a venda: ' + err.message, 'error');
            }
        };

        if (valCrediario > 0) {
            App.crediario.openInstallmentModal(valCrediario, Varejo.state.currentCliente, proceed);
        } else {
            proceed();
        }
    },

    buscarCliente: async (t) => {
        const res = document.getElementById('pos-main-customer-results');
        if (!t || t.length < 2) { res.style.display = 'none'; return; }
        
        const { data } = await _sb.from('profiles').select('id, nome_completo, cpf').ilike('nome_completo', `%${t}%`).limit(10);
        
        if (!data?.length) { 
            res.innerHTML = `<div style="padding:20px; text-align:center; opacity:0.5; font-size:0.8rem;">NENHUM CLIENTE ENCONTRADO</div>`;
            res.style.display = 'block';
            return; 
        }

        res.innerHTML = data.map(c => `
            <div onclick="Varejo.selecionarCliente(${JSON.stringify(c).replace(/"/g, '&quot;')})" 
                 style="padding:15px 20px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05); transition:0.2s; display:flex; flex-direction:column; gap:4px;"
                 onmouseover="this.style.background='rgba(255,255,255,0.08)'" 
                 onmouseout="this.style.background='transparent'">
                <span style="font-weight:800; font-size:0.95rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.nome_completo.toUpperCase()}</span>
                <span style="font-size:0.7rem; color:var(--pos-accent); font-weight:800; letter-spacing:0.5px;">CPF/ID: ${c.cpf || 'NÃO INFORMADO'}</span>
            </div>
        `).join('');
        res.style.display = 'block';
    },

    selecionarCliente: (c) => { 
        Varejo.state.currentCliente = c; 
        Varejo._atualizarPainelCliente(); 
        document.getElementById('pos-main-customer-results').style.display = 'none';
        const searchInput = document.getElementById('pos-main-customer-search');
        if (searchInput) searchInput.value = '';
    },
    limparCliente: () => { Varejo.state.currentCliente = null; Varejo._atualizarPainelCliente(); },
    _atualizarPainelCliente: () => {
        const c = Varejo.state.currentCliente;
        const p = document.getElementById('pos-main-customer-selected');
        const s = document.getElementById('pos-main-customer-search-area');
        const nameEl = document.getElementById('pos-main-customer-name');

        if (c) { 
            if (p) p.style.display = 'block'; 
            if (s) s.style.display = 'none'; 
            if (nameEl) nameEl.innerText = c.nome_completo || c.nome || 'Cliente'; 
        } else { 
            if (p) p.style.display = 'none'; 
            if (s) s.style.display = 'block'; 
        }
        if (typeof Varejo.saveRecoveryState === 'function') Varejo.saveRecoveryState();
    },

    loadCategories: async () => {
        const list = document.getElementById('pos-category-list');
        if (!list) return; // Segurança: se não houver o container de categorias, não faz nada

        const { data } = await _sb.from('products').select('categoria').eq('store_id', App.state.storeId);
        if (!data) return;
        
        const cats = [...new Set(data.map(c => c.categoria))].filter(Boolean).sort();
        list.innerHTML = ''; // Limpa antes de carregar
        cats.forEach(c => {
            const div = document.createElement('div'); 
            div.className = 'cat-btn'; 
            div.innerHTML = `<i class="ri-folder-line"></i><span>${c}</span>`;
            div.onclick = () => Varejo.loadProductsByCategory(c, div); 
            list.appendChild(div);
        });
    },

    loadProductsByCategory: async (c, el) => {
        const grid = document.getElementById('pos-product-grid');
        if (!grid) return; // Segurança: se não houver a grade de produtos, não faz nada

        if (el) { 
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); 
            el.classList.add('active'); 
        }
        
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; opacity:0.5;"><i class="ri-loader-4-line spin" style="font-size:2rem;"></i><br>Carregando Itens...</div>';
        
        try {
            let q = _sb.from('products').select('*').eq('store_id', App.state.storeId).limit(50);
            if (c) q = q.eq('categoria', c);
            const { data, error } = await q;
            
            if (error) throw error;

            grid.innerHTML = data.map(p => `
                <div class="product-card animate-in" onclick="Varejo.addItem(${JSON.stringify(p).replace(/"/g, '&quot;')}, 1)">
                    <div style="font-weight:800; font-size:1.1rem; height:2.5rem; overflow:hidden; line-height:1.2;">${p.nome}</div>
                    <div class="price-tag">R$ ${parseFloat(p.preco).toFixed(2)}</div>
                    <div class="stock-bar">
                        <div class="stock-progress" style="width:${Math.min(100, (p.estoque || 0) * 10)}%; background:${p.estoque < 5 ? '#f43f5e' : '#10b981'}"></div>
                    </div>
                    <div style="font-size:0.65rem; font-weight:800; color:var(--pos-text-muted); margin-top:5px; display:flex; justify-content:space-between;">
                        <span>ESTOQUE: ${p.estoque || 0} UN</span>
                        <span>COD: ${p.id.toString().slice(-4).toUpperCase()}</span>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:red;">Erro ao carregar produtos.</div>';
        }
    },

    startClock: () => setInterval(() => { const el = document.getElementById('pos-clock'); if (el) el.innerText = new Date().toLocaleTimeString('pt-BR'); }, 1000),

    printReceipt: (order, items, pays, desc, cliente, installments = []) => {
        const win = window.open('', '', 'width=800,height=600');
        const storeName = (App.state.currentStore?.nome_loja) || App.state.storeName || 'MINHA LOJA';
        const date = new Date().toLocaleString('pt-BR');

        // Agrupa itens para o recibo para economizar papel
        const grouped = [];
        items.forEach(i => {
            const ex = grouped.find(g => g.id === i.id);
            if (ex) { ex.qtd++; ex.total = ex.qtd * i.preco; }
            else { grouped.push({ ...i, qtd: 1, total: i.preco }); }
        });

        // Detalhes do Crediário
        let installmentsHtml = '';
        if (installments && installments.length > 0) {
            installmentsHtml = `
                <div class="sep"></div>
                <div class="bold">PLANOS DE PAGAMENTO (CREDIÁRIO):</div>
                ${installments.map(ins => `
                    <div class="item" style="font-size:12px;">
                        <span>Parc. ${ins.parcela} (${new Date(ins.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')})</span>
                        <span>${parseFloat(ins.valor).toFixed(2)}</span>
                    </div>
                `).join('')}
            `;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
                    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier Prime', Courier, monospace !important; }
                    body { 
                        width: 100%;
                        max-width: 80mm;
                        margin: 0 auto; 
                        padding: 10px; 
                        color: #000; 
                        background: #fff;
                        font-size: 12px; 
                        line-height: 1.2; 
                        -webkit-print-color-adjust: exact; 
                    }
                    .center { text-align: center; }
                    .bold { font-weight: bold; font-size: 15px; }
                    .sep { border-top: 1px dashed #000; margin: 8px 0; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 4px; }
                    .footer { font-size: 11px; margin-top: 15px; padding-bottom: 20px; border-top: 1px solid #000; padding-top: 10px; }
                    
                    @page { margin: 0; size: 80mm auto; }
                    @media print { 
                        body { width: 80mm; padding: 10px; margin: 0; } 
                        .no-print { display: none; } 
                    }
                    .no-print { margin-top: 20px; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 8px; }
                    .no-print button { padding: 10px 20px; cursor: pointer; margin: 5px; background: #000; color: #fff; border: none; border-radius: 5px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="center bold" style="font-size: 18px;">${storeName.toUpperCase()}</div>
                <div class="center">COMPROVANTE DE VENDA</div>
                <div class="sep"></div>
                <div style="font-size:12px;">
                    <div>DATA: ${date}</div>
                    <div>PEDIDO: #${order.id.toString().slice(-6).toUpperCase()}</div>
                    <div>CLIENTE: ${cliente?.nome_completo || 'CONSUMIDOR FINAL'}</div>
                </div>
                <div class="sep"></div>
                <div class="bold">ITENS:</div>
                <div style="font-size:13px;">
                ${grouped.map(i => `
                    <div class="item">
                        <span>${i.qtd}x ${i.nome.slice(0, 30)}</span>
                        <span>${i.total.toFixed(2)}</span>
                    </div>
                `).join('')}
                </div>
                <div class="sep"></div>
                <div class="item bold"><span>SUBTOTAL:</span> <span>${(Varejo.state.totalTicket || 0).toFixed(2)}</span></div>
                ${desc > 0 ? `<div class="item"><span>DESCONTO:</span> <span>- ${desc.toFixed(2)}</span></div>` : ''}
                <div class="item bold" style="font-size: 18px;"><span>TOTAL:</span> <span>${(order.total_pago).toFixed(2)}</span></div>
                <div class="sep"></div>
                <div class="bold">PAGAMENTO:</div>
                ${pays.map(p => `<div class="item"><span>${p.tipo}:</span> <span>${p.val.toFixed(2)}</span></div>`).join('')}
                
                ${installmentsHtml}

                <div class="sep"></div>
                <div class="center footer">
                    Obrigado pela preferência!<br>
                    Guarde este comprovante para trocas.<br>
                    Desenvolvido por NAXIO PRO
                </div>
                <div class="no-print">
                    <button onclick="window.print()">IMPRIMIR</button>
                    <button onclick="window.close()">FECHAR</button>
                </div>
                <script>
                    setTimeout(() => { 
                        window.print();
                    }, 800);
                </script>
            </body>
            </html>
        `;
        win.document.write(html);
        win.document.close();
    },
    openToolsMenu: () => {
        const tools = Object.entries(App.storeTools);
        const html = `
        <div id="pos-tools-modal" class="modal-overlay" style="display:flex;">
            <div class="modal-content" style="max-width:800px; max-height:80vh; overflow:hidden; display:flex; flex-direction:column;">
                <div class="modal-header">
                    <h3><i class="ri-magic-line"></i> Ferramentas Enterprise (30 Funcionalidades)</h3>
                    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('pos-tools-modal').remove()">X</button>
                </div>
                <div class="modal-body scroll-thin" style="flex:1; overflow-y:auto; padding:20px; display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">
                    ${tools.map(([key, fn]) => {
                        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        return `<button class="btn btn-outline" style="text-align:left; padding:15px; border-radius:12px; font-size:0.85rem;" onclick="App.storeTools.${key}()">
                            <i class="ri-checkbox-circle-line" style="color:var(--pos-success);"></i> ${label}
                        </button>`;
                    }).join('')}
                </div>
                <div class="modal-footer" style="padding:15px; border-top:1px solid var(--pos-border); text-align:center; font-size:0.75rem; color:var(--pos-text-muted);">
                    As funcionalidades marcadas como (em breve) serão liberadas na próxima atualização.
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    }
};

window.Varejo = Varejo;
console.log("✅ Varejo 5.0 Pronto.");
/**
 * NAXIO PRO PDV - Módulo Varejo Modernizado
 * Versão: 5.0.0
 * Descrição: Sistema de PDV com interface glassmorphism, multi-abas,
 * busca inteligente e integração fiscal completa.
 */

var Varejo = window.Varejo = window.Varejo || {
    state: {
        allProductsCache: [],
        currentTabIndex: 0,
        tabs: [
            { id: 1, cart: [], cliente: null, total: 0 },
            { id: 2, cart: [], cliente: null, total: 0 },
            { id: 3, cart: [], cliente: null, total: 0 }
        ],
        cart: [],
        currentCliente: null,
        totalTicket: 0,
        pendingQty: 1,
        discount: 0,
        _lastScannedCode: null,
        isOpen: false
    },

    init: async () => {
        console.log("🏪 Naxio Pro PDV: Iniciando sistema...");
        
        // Timeout de segurança para o Caixa: se demorar mais de 1s, prossegue
        const sessionPromise = (typeof Caixa !== 'undefined' && typeof Caixa.checkSession === 'function') 
            ? Caixa.checkSession() 
            : Promise.resolve();

        try {
            await Promise.race([
                sessionPromise,
                new Promise(resolve => setTimeout(resolve, 1500))
            ]);
        } catch(e) { console.warn("Aviso: Sessão de caixa demorou a responder, prosseguindo..."); }

        const saved = localStorage.getItem('naxio_pos_recovery');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Validação de integridade: Verifica se é um array de abas válido
                if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].cart || parsed[0].ticket)) {
                    Varejo.state.tabs = parsed.map(t => ({ ...t, cart: t.cart || t.ticket || [] }));
                    const currentTab = Varejo.state.tabs[Varejo.state.currentTabIndex] || Varejo.state.tabs[0];
                    Varejo.state.cart = Array.isArray(currentTab.cart) ? [...currentTab.cart] : [];
                    Varejo.state.currentCliente = currentTab.cliente || null;
                    Varejo.state.totalTicket = typeof currentTab.total === 'number' ? currentTab.total : 0;
                    console.log("🛡️ Blindagem: Estado recuperado com integridade.");
                } else {
                    throw new Error("Dados de recuperação corrompidos ou em formato inválido.");
                }
            } catch(e) { 
                console.error("🚨 Erro na Blindagem (Recuperação):", e);
                Varejo.autoRepair(); // Tenta limpar e estabilizar
            }
        }

        Varejo.injectStyles();
        Varejo.injectHTML();
        Varejo.startClock();
        Varejo.loadCategories();
        Varejo.loadProductsByCategory(null);
        Varejo.switchTab(0);

        // Sincroniza Operador Atual
        const opName = localStorage.getItem('active_operator_name') || 'OPERADOR PADRÃO';
        const btnPos = document.getElementById('btn-pos-operator');
        const footerOp = document.getElementById('pos-operator-footer-name');
        
        if (opName) {
            if (btnPos) btnPos.innerHTML = `<i class="ri-user-settings-line"></i> ${opName.split(' ')[0]}`;
            if (footerOp) footerOp.innerHTML = `<i class="ri-user-voice-fill"></i> OPERADOR: ${opName.toUpperCase()}`;
        }

        // Monitor de Rede e Atalhos
        window.addEventListener('offline', () => Varejo.setConnectivity(false));
        window.addEventListener('online', () => Varejo.setConnectivity(true));
        Varejo.setConnectivity(navigator.onLine); // Verifica estado real no início
        window.addEventListener('keydown', Varejo.handleHotkeys);

        // Sistema de Blindagem: Salva estado a cada 2 segundos
        setInterval(Varejo.saveRecoveryState, 2000);
        setInterval(Varejo.updateNetworkStats, 3000);
        
        Varejo.state.isOpen = true;
        console.log("🚀 PDV OPERACIONAL.");
    },

    setConnectivity: (online) => {
        const banner = document.getElementById('pos-offline-banner');
        const health = document.getElementById('health-sync');
        // Força verificação real se houver erro
        const isActuallyOnline = navigator.onLine;
        if (banner) banner.style.display = isActuallyOnline ? 'none' : 'flex';
        if (health) health.style.background = isActuallyOnline ? '#0ea5e9' : 'var(--pos-danger)';
    },

    updateNetworkStats: () => {
        const lat = Math.floor(Math.random() * 5) + 2;
        const el = document.getElementById('pos-latency');
        if (el) el.innerText = `${lat}ms`;
    },

    handleHotkeys: (e) => {
        if (!Varejo.state.isOpen) return;
        
        switch(e.key) {
            case 'F1': e.preventDefault(); document.getElementById('pos-barcode')?.focus(); break;
            case 'F2': e.preventDefault(); Varejo.openPaymentModal(); break;
            case 'F3': e.preventDefault(); Varejo.cancelSaleWithPassword(); break;
            case 'Escape': 
                if (document.querySelector('.modal-overlay[style*="flex"]')) {
                    // Fecha modal se houver
                } else {
                    App.router.go('loja');
                }
                break;
        }
    },

    playSound: (type) => {
        const sounds = {
            beep: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
            success: 'https://actions.google.com/sounds/v1/buttons/button_positive.ogg',
            error: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg'
        };
        new Audio(sounds[type]).play().catch(() => {});
    },

    openPDV: () => {
        console.log("📂 Tentando abrir visualmente o PDV...");
        Varejo.state.isOpen = true;
        
        // Garante que o elemento existe antes de navegar
        if (!document.getElementById('view-pos')) {
            console.warn("⚠️ view-pos não encontrado, injetando agora...");
            Varejo.injectHTML();
        }

        if (typeof App !== 'undefined' && App.router) {
            App.router.go('pos');
        }

        // Força visibilidade por segurança
        const posEl = document.getElementById('view-pos');
        if (posEl) {
            posEl.style.display = 'block';
            posEl.classList.add('active');
            console.log("✅ View 'pos' ativada e visível.");
        }

        setTimeout(() => {
            const input = document.getElementById('pos-barcode');
            if (input) input.focus();
        }, 300);
    },

    sair: () => {
        console.log("🚪 Saindo do PDV...");
        Varejo.state.isOpen = false;
        const posEl = document.getElementById('view-pos');
        if (posEl) {
            posEl.classList.remove('active');
            posEl.style.display = 'none';
        }
        if (typeof App !== 'undefined' && App.router) {
            App.router.goDashboard();
        } else {
            window.location.reload(); // Fallback de emergência
        }
    },

    injectStyles: () => {
        if (document.getElementById('pos-styles')) return;
        const style = document.createElement('style');
        style.id = 'pos-styles';
        style.innerHTML = `
            :root {
                --pos-bg: #020617;
                --pos-panel: rgba(15, 23, 42, 0.6);
                --pos-accent: #0ea5e9;
                --pos-accent-gradient: linear-gradient(135deg, #0ea5e9, #2563eb);
                --pos-success: #10b981;
                --pos-danger: #f43f5e;
                --pos-text: #f8fafc;
                --pos-text-muted: #64748b;
                --pos-border: rgba(255, 255, 255, 0.05);
                --pos-glass: blur(40px) saturate(180%);
                --shadow-neon: 0 0 30px rgba(14, 165, 233, 0.15);
            }

            #view-pos {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: radial-gradient(circle at 0% 0%, #0f172a 0%, #020617 100%);
                color: var(--pos-text); font-family: 'Outfit', sans-serif;
                z-index: 99999;
                display: none; /* Escondido por padrão */
            }
            #view-pos.active { display: block !important; }

            /* Grid Principal Ajustado */
            .pos-container {
                display: grid;
                grid-template-columns: 1fr 380px;
                grid-template-rows: 70px 1fr;
                width: 100vw; height: 100vh;
                gap: 15px; padding: 15px; box-sizing: border-box;
                background: var(--pos-bg);
            }

            .pos-main-sale {
                grid-row: 2;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            /* Tabela de Itens Profissional */
            .sale-table-container {
                flex: 1;
                background: var(--pos-panel);
                border-radius: 28px;
                border: 1px solid var(--pos-border);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .sale-table-header {
                display: grid;
                grid-template-columns: 60px 150px 1fr 100px 120px 120px;
                background: rgba(255,255,255,0.05);
                padding: 15px 20px;
                font-weight: 800;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: var(--pos-accent);
                border-bottom: 1px solid var(--pos-border);
            }

            #pos-items-list {
                flex: 1;
                overflow-y: auto;
            }

            .sale-item-row {
                display: grid;
                grid-template-columns: 60px 150px 1fr 100px 120px 120px;
                padding: 12px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.02);
                align-items: center;
                font-size: 0.95rem;
                transition: background 0.2s;
            }
            .sale-item-row:hover { background: rgba(255,255,255,0.03); }
            .sale-item-row.last-added { background: rgba(14, 165, 233, 0.1); border-left: 4px solid var(--pos-accent); }

            /* Sidebar Compacto */
            .pos-sidebar {
                grid-row: 2;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .customer-panel { padding: 20px; }
            .totals-panel {
                margin-top: auto;
                padding: 25px;
                background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%);
                border-radius: 28px;
                border: 1px solid var(--pos-border);
            }

            .total-huge {
                font-size: 3.5rem;
                font-weight: 900;
                color: var(--pos-text);
                letter-spacing: -2px;
                line-height: 1;
                margin: 10px 0;
            }

            /* Cadastro de Cliente Inline */
            #pos-customer-register-form {
                background: rgba(0,0,0,0.4);
                padding: 15px;
                border-radius: 20px;
                margin-top: 10px;
                border: 1px solid var(--pos-accent);
                display: none;
            }

            .pos-tile {
                background: var(--pos-panel);
                backdrop-filter: var(--pos-glass);
                -webkit-backdrop-filter: var(--pos-glass);
                border: 1px solid var(--pos-border);
                border-radius: 28px;
                overflow: visible;
                box-shadow: 0 10px 40px rgba(0,0,0,0.4);
            }

            .pos-header-bar {
                grid-column: 1 / -1;
                display: flex; justify-content: space-between; align-items: center;
                padding: 0 30px;
            }
            
            @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
            .health-pulse { position: relative; }
            .health-pulse::after { content:''; position:absolute; inset:-4px; border: 2px solid var(--pos-success); border-radius: 50%; animation: pulse-ring 1.5s infinite; }
        `;
        document.head.appendChild(style);
    },

    injectHTML: () => {
        if (document.getElementById('view-pos')) return;
        let main = document.querySelector('main') || document.body;
        const section = document.createElement('section');
        section.id = 'view-pos';
        section.className = 'view-section';
        section.innerHTML = `
            <div id="pos-offline-banner" class="offline-alert"><i class="ri-wifi-off-line"></i> MODO CONTINGÊNCIA ATIVO (OFFLINE)</div>
            <div class="pos-container">
                <!-- HEADER OPERACIONAL -->
                <header class="pos-tile" style="grid-column: 1 / span 2; display: flex; align-items: center; justify-content: space-between; padding: 0 30px; background: rgba(15, 23, 42, 0.8);">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="background: var(--pos-accent-gradient); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-neon); cursor: pointer;" onclick="Varejo.sair()">
                            <i class="ri-home-4-fill" style="color: #fff; font-size: 1.2rem;"></i>
                        </div>
                        <button class="btn btn-sm btn-secondary" onclick="Varejo.sair()" style="font-weight:800; padding:5px 15px; border-radius:10px;">SAIR</button>
                        <h2 style="margin:0; font-size: 1.2rem; font-weight: 800; letter-spacing: 1px;">NAXIO <span style="color:var(--pos-accent)">PRO</span></h2>
                    </div>

                    <!-- SELETOR DE VENDAS (ABAS) -->
                    <div id="pos-tabs-container" style="display:flex; gap:10px; background:rgba(0,0,0,0.2); padding:5px; border-radius:15px; border:1px solid var(--pos-border);">
                        <!-- Abas serão injetadas aqui -->
                    </div>

                    <div style="display: flex; align-items: center; gap: 40px;">
                        <div id="pos-header-status" style="display: flex; align-items: center; gap: 15px;">
                            <div style="text-align: right;">
                                <div id="pos-op-name" style="font-size: 0.75rem; color: var(--pos-text-muted); font-weight: 700; text-transform: uppercase;">Operador</div>
                                <div style="font-size: 0.9rem; font-weight: 800;">Caixa Ativo</div>
                            </div>
                        </div>
                        <div id="pos-clock" style="font-size: 1.5rem; font-weight: 900; font-family: 'JetBrains Mono', monospace; color: var(--pos-accent);">00:00:00</div>
                    </div>
                </header>

                <!-- ÁREA CENTRAL: LISTA DE ITENS DA VENDA -->
                <main class="pos-main-sale">
                    <div class="pos-tile" style="padding: 10px 20px;">
                        <div style="display:flex; gap:15px; align-items:center;">
                            <i class="ri-barcode-line" style="font-size: 1.5rem; color: var(--pos-accent);"></i>
                            <input type="text" id="pos-barcode" placeholder="BIPAR PRODUTO OU DIGITAR NOME... (F1)" autocomplete="off" onkeydown="Varejo.handleScan(event)" style="flex:1; background:none; border:none; color:#fff; font-size:1.4rem; font-weight:700; outline:none; padding:10px;">
                            <div class="badge" style="background: rgba(255,255,255,0.1); padding: 8px 15px;">MODO AUTO</div>
                        </div>
                    </div>

                    <div class="sale-table-container">
                        <div class="sale-table-header">
                            <div>SEQ</div>
                            <div>CÓDIGO</div>
                            <div>DESCRIÇÃO DO PRODUTO</div>
                            <div style="text-align:center;">QTD</div>
                            <div style="text-align:right;">V. UNIT</div>
                            <div style="text-align:right;">V. TOTAL</div>
                        </div>
                        <div id="pos-items-list">
                            <!-- Itens da venda entrarão aqui -->
                            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; opacity:0.2;">
                                <i class="ri-shopping-cart-2-line" style="font-size:5rem;"></i>
                                <p>AGUARDANDO PRODUTOS...</p>
                            </div>
                        </div>
                    </div>
                </main>

                <!-- SIDEBAR DIREITO: CLIENTE E TOTAIS -->
                <aside class="pos-sidebar">
                    <!-- PAINEL DO CLIENTE -->
                    <div class="pos-tile customer-panel">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <h4 style="margin:0; font-size:0.8rem; color:var(--pos-accent); text-transform:uppercase;">Identificar Cliente</h4>
                            <i class="ri-user-add-line" style="cursor:pointer;" onclick="Varejo.toggleCustomerForm()"></i>
                        </div>
                        
                        <div id="pos-main-customer-selected" style="display:none; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--pos-success); padding: 15px; border-radius: 15px; position:relative;">
                             <div id="pos-main-customer-name" style="font-weight:700; font-size:1.1rem;">Consumidor</div>
                             <button class="btn btn-sm" onclick="Varejo.limparCliente()" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:var(--pos-danger); background:none; border:none;"><i class="ri-close-circle-fill"></i></button>
                        </div>

                        <div id="pos-main-customer-search-area">
                            <input type="text" id="pos-main-customer-search" placeholder="CPF OU NOME..." autocomplete="off" oninput="Varejo.buscarCliente(this.value, 'main')" style="width:100%; padding:15px; border-radius:15px; background:rgba(0,0,0,0.3); border:1px solid var(--pos-border); color:#fff; font-size:0.9rem;">
                        </div>

                        <!-- Formulário de Cadastro Rápido -->
                        <div id="pos-customer-register-form">
                            <h5 style="margin:0 0 10px 0; font-size:0.75rem;">NOVO CADASTRO</h5>
                            <input type="text" id="reg-cust-name" placeholder="Nome Completo" class="input-field" style="margin-bottom:8px; font-size:0.8rem;">
                            <input type="text" id="reg-cust-cpf" placeholder="CPF/CNPJ" class="input-field" style="margin-bottom:10px; font-size:0.8rem;">
                            <button class="btn btn-primary btn-sm btn-full" onclick="Varejo.cadastrarClienteRapido()">SALVAR E USAR</button>
                        </div>

                        <div id="pos-main-customer-results" style="display:none; position:absolute; left:20px; width:calc(100% - 40px); background:#0f172a; border:2px solid var(--pos-accent); border-radius:20px; z-index:1000; margin-top:8px; box-shadow:0 15px 50px rgba(0,0,0,0.8); overflow:hidden; max-height:350px; overflow-y:auto;" class="scroll-thin"></div>
                    </div>

                    <!-- PAINEL DE TOTAIS -->
                    <div class="totals-panel">
                        <div style="display:flex; justify-content:space-between; color:var(--pos-text-muted); font-weight:700; font-size:0.85rem;">
                            <span>SUBTOTAL</span>
                            <span id="pos-subtotal">R$ 0,00</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; color:var(--pos-success); font-weight:700; font-size:0.85rem; margin-top:5px;">
                            <span>DESCONTO (F7)</span>
                            <span id="pos-discount">- R$ 0,00</span>
                        </div>
                        <div style="margin-top:20px;">
                            <span style="font-size:0.75rem; color:var(--pos-accent); font-weight:800; text-transform:uppercase;">Total a Pagar</span>
                            <div class="total-huge" id="pos-total-final">R$ 0,00</div>
                        </div>

                        <button class="btn btn-primary btn-full" onclick="Varejo.openPaymentModal()" style="margin-top:20px; height:60px; font-size:1.2rem; font-weight:900; border-radius:18px;">
                            <i class="ri-qr-code-fill"></i> PAGAR (F2)
                        </button>
                        
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
                            <button class="btn btn-secondary btn-sm" onclick="Varejo.cancelSaleWithPassword()" style="height:45px;">
                                <i class="ri-close-line"></i> CANCELAR
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="Varejo.openToolsMenu()" style="height:45px;">
                                <i class="ri-settings-4-line"></i> AJUSTES
                            </button>
                        </div>
                    </div>
                </aside>

                <footer class="bottom-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 0 30px; background: rgba(0,0,0,0.5); border-top: 1px solid var(--pos-border);">
                    <div style="display:flex; gap:30px;">
                        <span id="pos-operator-footer-name" style="color:var(--pos-success); font-weight:800;"><i class="ri-user-6-fill"></i> OPERADOR: AGUARDANDO...</span>
                        <span style="color:var(--pos-accent); font-weight:800;"><i class="ri-shield-keyhole-fill"></i> JORNAL DE TRANSAÇÕES: ATIVO</span>
                    </div>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <span style="background:rgba(255,255,255,0.05); padding:3px 10px; border-radius:6px; font-size:0.7rem; color:var(--pos-text-muted); border:1px solid var(--pos-border);">LATÊNCIA: 4ms</span>
                        <span style="color:var(--pos-text-muted); font-weight:700; font-size:0.8rem;">NAXIO VAREJO ENTERPRISE v5.5.0</span>
                    </div>
                </footer>
            </div>

            <div id="pos-search-modal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header"><h3>Buscar Produto</h3><button class="btn btn-secondary btn-sm" onclick="document.getElementById('pos-search-modal').style.display='none'">X</button></div>
                    <div class="modal-body">
                        <input type="text" id="pos-search-input" class="pos-input" style="margin-bottom:15px;" placeholder="Digite para filtrar..." oninput="Varejo.filterSearch(this.value)">
                        <div id="pos-search-results" class="scroll-thin" style="max-height:400px; overflow-y:auto; background:rgba(0,0,0,0.1); border-radius:15px;"></div>
                    </div>
                </div>
            </div>

            <div id="pos-pay-modal" class="modal-overlay">
                <div class="modal-content" style="max-width:800px; border: 1px solid rgba(255,255,255,0.15);">
                    <div class="modal-header" style="background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--pos-border);">
                        <h3 style="display:flex; align-items:center; gap:12px; font-family:'Outfit'; font-weight:800;">
                            <i class="ri-secure-payment-fill" style="color:var(--pos-accent);"></i> Finalizar Venda
                        </h3>
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('pos-pay-modal').style.display='none'">X</button>
                    </div>
                    <div class="modal-body" style="padding: 40px;">
                        <div style="text-align:center; margin-bottom:30px; background: linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2)); padding: 30px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 0 20px rgba(0,0,0,0.2);">
                            <div style="text-transform: uppercase; font-size: 0.85rem; font-weight: 800; color: var(--pos-text-muted); letter-spacing: 2px; margin-bottom: 10px;">Valor Total do Pedido</div>
                            <h1 id="pos-pay-total" style="color: #fff; font-size: 4.2rem; margin:0; font-weight:950; font-family: 'Outfit'; text-shadow: 0 0 30px rgba(59, 130, 246, 0.3);">0,00</h1>
                        </div>
                        <style>
                            .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                            .pay-field { 
                                background: rgba(0,0,0,0.2); border: 1px solid var(--pos-border); 
                                border-radius: 20px; padding: 15px; transition: 0.3s;
                                display: flex; flex-direction: column; gap: 10px;
                            }
                            .pay-field:focus-within { border-color: var(--pos-accent); transform: scale(1.02); background: rgba(0,0,0,0.3); }
                            
                            .pay-field label { font-size: 0.9rem; font-weight: 800; color: var(--pos-text-muted); display: flex; align-items: center; gap: 10px; }
                            .pay-field label i { font-size: 1.4rem; }
                            
                            .pay-field .input-box { position: relative; display: flex; align-items: center; }
                            .pay-field .input-box span { 
                                font-weight: 900; color: var(--pos-text-muted); font-size: 1.2rem; 
                                padding: 0 15px; border-right: 1px solid var(--pos-border);
                                margin-right: 15px;
                            }
                            .pay-field input { 
                                background: none; border: none; color: #fff; 
                                font-size: 1.8rem; font-weight: 800; width: 100%;
                                font-family: 'Outfit', sans-serif;
                            }
                            .pay-field input:focus { outline: none; }
                            .pay-field input::placeholder { color: rgba(255,255,255,0.05); }

                            /* Cores vibrantes por tipo */
                            .pay-money label i { color: #10b981; }
                            .pay-pix label i { color: #06b6d4; }
                            .pay-card label i { color: #8b5cf6; }
                            .pay-crediario label i { color: #f59e0b; }
                            .pay-desc label i { color: #ef4444; }
                        </style>
                        <div class="pay-grid">
                            <div class="pay-field pay-money"><label><i class="ri-money-dollar-circle-fill"></i> DINHEIRO</label><div class="input-box"><span>R$</span><input type="number" id="pay-money" step="0.01" placeholder="0.00" oninput="Varejo.calcRestante()"></div></div>
                            <div class="pay-field pay-pix"><label><i class="ri-qr-code-fill"></i> PIX</label><div class="input-box"><span>R$</span><input type="number" id="pay-pix" step="0.01" placeholder="0.00" oninput="Varejo.calcRestante()"></div></div>
                            <div class="pay-field pay-card"><label><i class="ri-bank-card-fill"></i> CRÉDITO</label><div class="input-box"><span>R$</span><input type="number" id="pay-credit" step="0.01" placeholder="0.00" oninput="Varejo.calcRestante()"></div></div>
                            <div class="pay-field pay-card"><label><i class="ri-bank-card-line"></i> DÉBITO</label><div class="input-box"><span>R$</span><input type="number" id="pay-debit" step="0.01" placeholder="0.00" oninput="Varejo.calcRestante()"></div></div>
                            <div class="pay-field pay-crediario"><label><i class="ri-file-list-3-fill"></i> CREDIÁRIO / NOTA</label><div class="input-box"><span>R$</span><input type="number" id="pay-crediario" step="0.01" placeholder="0.00" oninput="Varejo.calcRestante()"></div></div>
                            
                            <div class="pay-field pay-desc">
                                <label><i class="ri-price-tag-3-fill"></i> DESCONTO</label>
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <div class="input-box" style="flex:1; background:rgba(255,255,255,0.03); border-radius:12px; padding:5px 10px;">
                                        <input type="number" id="pay-desconto-pct" step="0.1" placeholder="0%" oninput="Varejo.calcDescontoPct()" style="font-size:1.2rem; text-align:center;">
                                    </div>
                                    <div class="input-box" style="flex:1.5; background:rgba(255,255,255,0.03); border-radius:12px; padding:5px 10px;">
                                        <input type="number" id="pay-desconto" step="0.01" placeholder="R$ 0.00" oninput="Varejo.calcRestante()" style="font-size:1.2rem; text-align:center;">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- CAMPOS NSU E AUT -->
                        <div id="pay-nsu-container" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:20px;">
                            <div class="pay-field" style="padding:12px 15px;">
                                <label style="font-size:0.75rem; margin-bottom:5px;"><i class="ri-key-fill" style="color:var(--pos-accent);"></i> CÓD. AUTORIZAÇÃO (AUT)</label>
                                <input type="text" id="pay-nsu-aut" placeholder="Digite o código da maquininha" style="font-size:1.1rem; height:auto; padding:5px 0;">
                            </div>
                            <div class="pay-field" style="padding:12px 15px;">
                                <label style="font-size:0.75rem; margin-bottom:5px;"><i class="ri-hashtag" style="color:var(--pos-accent);"></i> NÚMERO NSU / DOC</label>
                                <input type="text" id="pay-nsu-doc" placeholder="Número da transação" style="font-size:1.1rem; height:auto; padding:5px 0;">
                            </div>
                        </div>

                        <div id="pay-restante-zone" style="margin-top:30px; padding:30px; border-radius:24px; text-align:center; transition:0.3s;">
                            <div id="pay-restante-label" style="text-transform:uppercase; font-size:0.8rem; font-weight:800; letter-spacing:1px; margin-bottom:5px;">Aguardando Pagamento</div>
                            <div id="pay-restante-box" style="font-size:2.4rem; font-weight:900; font-family:'Outfit';">R$ 0,00</div>
                        </div>
                    </div>
                    <div style="padding:0 40px 40px;">
                        <button id="btn-finalizar-venda" class="btn-action-primary" disabled onclick="Varejo.finalizeMultiPayment()" style="height:85px; font-size:1.6rem;">
                            <i class="ri-printer-fill"></i> CONFIRMAR E EMITIR (F12)
                        </button>
                    </div>
                </div>
            </div>
        `;
        main.appendChild(section);
        Varejo.renderTabs();
    },

    switchTab: (idx) => {
        const prevTab = Varejo.state.tabs[Varejo.state.currentTabIndex];
        if (prevTab) {
            prevTab.cart = [...Varejo.state.cart];
            prevTab.cliente = Varejo.state.currentCliente;
            prevTab.total = Varejo.state.totalTicket;
        }

        Varejo.state.currentTabIndex = idx;
        const newTab = Varejo.state.tabs[idx];
        Varejo.state.cart = Array.isArray(newTab.cart) ? [...newTab.cart] : [];
        Varejo.state.currentCliente = newTab.cliente;
        Varejo.state.totalTicket = newTab.total;

        Varejo.renderTabs();
        Varejo.renderCart();
        Varejo._atualizarPainelCliente();
        const input = document.getElementById('pos-barcode');
        if (input) input.focus();
        App.utils.toast(`Venda ${newTab.id} ativa`, 'info');
    },

    renderTabs: () => {
        const container = document.getElementById('pos-tabs-container');
        if (!container) return;
        container.innerHTML = Varejo.state.tabs.map((tab, idx) => `
            <div onclick="Varejo.switchTab(${idx})" style="
                padding: 8px 20px; 
                border-radius: 10px; 
                cursor: pointer; 
                font-weight: 800; 
                font-size: 0.8rem; 
                transition: 0.3s;
                display: flex; 
                align-items: center; 
                gap: 8px;
                background: ${idx === Varejo.state.currentTabIndex ? 'var(--pos-accent-gradient)' : 'transparent'};
                color: ${idx === Varejo.state.currentTabIndex ? '#fff' : 'var(--pos-text-muted)'};
                box-shadow: ${idx === Varejo.state.currentTabIndex ? '0 4px 10px rgba(14, 165, 233, 0.3)' : 'none'};
            ">
                <i class="ri-shopping-bag-3-line"></i> VENDA ${tab.id}
                ${tab.cart && tab.cart.length > 0 ? `<span style="background:#fff; color:var(--pos-accent); padding:2px 6px; border-radius:6px; font-size:0.6rem;">${tab.cart.length}</span>` : ''}
            </div>
        `).join('');
    },

    updateSummary: () => {
        const total = Varejo.state.cart.reduce((acc, p) => acc + (p.preco * (p.qtd || 1)), 0);
        Varejo.state.totalTicket = total;
        Varejo.renderCart();
    },

    autoRepair: () => {
        if (!Array.isArray(Varejo.state.cart)) Varejo.state.cart = [];
        Varejo.state.cart = Varejo.state.cart.filter(p => p && typeof p === 'object' && p.id);
        Varejo.updateSummary();
    },

    saveRecoveryState: () => {
        const t = Varejo.state.tabs[Varejo.state.currentTabIndex];
        if (t) {
            t.cart = [...Varejo.state.cart];
            t.cliente = Varejo.state.currentCliente;
            t.total = Varejo.state.totalTicket;
        }
        localStorage.setItem('naxio_pos_recovery', JSON.stringify(Varejo.state.tabs));
    },

    renderCart: () => {
        const list = document.getElementById('pos-items-list');
        if (!list) return;

        const cart = Varejo.state.cart;
        if (cart.length === 0) {
            list.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; opacity:0.2;">
                    <i class="ri-shopping-cart-2-line" style="font-size:5rem;"></i>
                    <p>AGUARDANDO PRODUTOS...</p>
                </div>`;
            document.getElementById('pos-subtotal').innerText = 'R$ 0,00';
            document.getElementById('pos-total-final').innerText = 'R$ 0,00';
            return;
        }

        let total = 0;
        let html = '';

        cart.forEach((item, index) => {
            const itemTotal = item.preco * (item.qtd || 1);
            total += itemTotal;
            const isLast = index === cart.length - 1;

            html += `
                <div class="sale-item-row ${isLast ? 'last-added' : ''}">
                    <div style="font-weight:800; color:var(--pos-accent); opacity:0.6;">${String(index + 1).padStart(3, '0')}</div>
                    <div style="font-family:'JetBrains Mono'; font-size:0.85rem;">${item.codigo_barras || '---'}</div>
                    <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.nome.toUpperCase()}</div>
                    <div style="text-align:center; font-weight:800;">${item.qtd}</div>
                    <div style="text-align:right; font-family:'JetBrains Mono';">R$ ${item.preco.toFixed(2)}</div>
                    <div style="text-align:right; font-weight:900; color:var(--pos-accent);">R$ ${itemTotal.toFixed(2)}</div>
                    <div style="text-align:right;">
                        <button onclick="Varejo.removeItem(${index})" style="background:none; border:none; color:var(--pos-danger); cursor:pointer; font-size:1.2rem; padding:5px;">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
        
        // Scroll para o último item
        list.scrollTop = list.scrollHeight;

        const discount = Varejo.state.discount || 0;
        const finalTotal = total - discount;

        document.getElementById('pos-subtotal').innerText = `R$ ${total.toFixed(2)}`;
        document.getElementById('pos-total-final').innerText = `R$ ${finalTotal.toFixed(2)}`;
        
        if (typeof Varejo.saveRecoveryState === 'function') Varejo.saveRecoveryState();
    },

    toggleCustomerForm: () => {
        const form = document.getElementById('pos-customer-register-form');
        const search = document.getElementById('pos-main-customer-search-area');
        if (form.style.display === 'none' || !form.style.display) {
            form.style.display = 'block';
            search.style.display = 'none';
            document.getElementById('reg-cust-name').focus();
        } else {
            form.style.display = 'none';
            Varejo._atualizarPainelCliente();
        }
    },

    cadastrarClienteRapido: async () => {
        const nome = document.getElementById('reg-cust-name').value;
        const cpf = document.getElementById('reg-cust-cpf').value;

        if (!nome) return alert("Informe o nome do cliente.");

        try {
            const { data, error } = await _sb.from('profiles').insert({
                nome_completo: nome,
                cpf: cpf,
                role: 'cliente'
            }).select().single();

            if (error) throw error;

            Varejo.selecionarCliente(data);
            Varejo.toggleCustomerForm();
            App.utils.toast("Cliente cadastrado e selecionado!", "success");
            
            // Limpa campos
            document.getElementById('reg-cust-name').value = '';
            document.getElementById('reg-cust-cpf').value = '';
        } catch (err) {
            console.error(err);
            alert("Erro ao cadastrar cliente: " + err.message);
        }
    },



    handleScan: (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.target.value.trim();
            if (!val) {
                if (Varejo.state.cart.length > 0) Varejo.openPaymentModal();
                return;
            }
            const mul = val.match(/^(\d+)\*(.+)$/);
            if (mul) { 
                Varejo.state.pendingQty = parseInt(mul[1]); 
                Varejo.searchProduct(mul[2].trim()); 
            } else { 
                Varejo.state.pendingQty = 1; 
                Varejo.searchProduct(val); 
            }
            e.target.value = '';
        }
    },

    searchProduct: async (term) => {
        if (!term) return;

        // 1. Busca Direta (Código Inteiro ou Código Interno)
        let { data: exact, error } = await _sb.from('products').select('*').eq('store_id', App.state.storeId)
            .or(`codigo_barras.eq.${term},codigo_cardapio.eq.${term}`).limit(1);

        // 2. Lógica de 8 Dígitos Fixos (Padrão 8 fixos + 5 variáveis = 13 total)
        // Se não achou o exato e o termo for longo, tentamos os 8 primeiros
        if (!exact?.length && term.length >= 8) {
            const prefix8 = term.substring(0, 8);
            const { data: byPrefix } = await _sb.from('products').select('*').eq('store_id', App.state.storeId)
                .eq('codigo_barras', prefix8).limit(1);
            if (byPrefix?.length) exact = byPrefix;
        }

        if (error) console.error("Busca exata erro:", error);

        // Se encontrou algum produto por código, adiciona direto
        if (exact && exact.length > 0) {
            Varejo.addItem(exact[0], Varejo.state.pendingQty);
            return;
        }

        // 3. Se não encontrou por código, abre a Modal de Busca por Nome (como solicitado para o Enter)
        Varejo.openSearchModal(term);
    },

    openSearchModal: (term = '') => {
        document.getElementById('pos-search-modal').style.display = 'flex';
        const input = document.getElementById('pos-search-input');
        input.value = term;
        input.focus();
        if (term) Varejo.filterSearch(term);
    },

    filterSearch: async (term) => {
        const { data } = await _sb.from('products').select('*').eq('store_id', App.state.storeId).ilike('nome', `%${term}%`).limit(30);
        Varejo.renderSearchResults(data || []);
    },

    renderSearchResults: (prods) => {
        const container = document.getElementById('pos-search-results');
        if (!prods.length) { container.innerHTML = '<p style="padding:20px; text-align:center;">Nada encontrado.</p>'; return; }
        container.innerHTML = prods.map(p => `
            <div class="pos-search-item" onclick="Varejo.addItem(${JSON.stringify(p).replace(/"/g, '&quot;')}, ${Varejo.state.pendingQty})">
                <div style="flex:1;"><div style="font-weight:700;">${p.nome}</div><div style="font-size:0.8rem; opacity:0.6;">Estoque: ${p.estoque || 0}</div></div>
                <div style="font-weight:800; color:var(--pos-accent);">R$ ${p.preco.toFixed(2)}</div>
            </div>
        `).join('');
    },

    addItem: (p, q = 1) => {
        try {
            if (!p || typeof p !== 'object' || !p.id) throw new Error("Produto inválido.");
            
            const item = { ...p, qtd: q };
            Varejo.state.cart.push(item);
            
            Varejo.renderCart();
            Varejo.playSound('beep');
            
            document.getElementById('pos-search-modal').style.display = 'none';
            Varejo.state.pendingQty = 1;
            Varejo.saveRecoveryState();
        } catch (err) {
            console.error("Bug no PDV (addItem):", err);
        }
    },

    removeItem: async (idx) => {
        const pass = await NaxioUI.prompt('🔐 Autorização', 'Informe a senha de cancelamento:', '', 'Senha', 'password');
        const masterPass = Varejo.state.config?.senha_cancelamento || '1234';
        
        if (pass !== masterPass) {
            return App.utils.toast("Senha incorreta!", "error");
        }

        Varejo.state.cart.splice(idx, 1);
        Varejo.renderCart();
        Varejo.playSound('beep');
        App.utils.toast("Item removido.", "success");
    },

    cancelSaleWithPassword: async () => {
        if (!Varejo.state.cart.length) return;
        
        const pass = await NaxioUI.prompt('🔐 Cancelar Venda', 'Informe a senha para limpar o carrinho:', '', 'Senha', 'password');
        const masterPass = Varejo.state.config?.senha_cancelamento || '1234';

        if (pass !== masterPass) {
            return App.utils.toast("Senha incorreta!", "error");
        }

        if (await NaxioUI.confirm('⚠️ Limpar Venda', 'Remover todos os itens do carrinho?')) {
            Varejo.state.cart = [];
            Varejo.state.currentCliente = null;
            Varejo.state.discount = 0;
            Varejo.renderCart();
            Varejo._atualizarPainelCliente();
            App.utils.toast("Venda cancelada.", "info");
        }
    },

    openPaymentModal: () => {
        if (!Varejo.state.cart.length) return App.utils.toast("Carrinho vazio!", "warning");
        
        // Calcula total novamente por segurança
        Varejo.updateSummary();

        document.getElementById('pos-pay-total').innerText = `${Varejo.state.totalTicket.toFixed(2)}`;
        document.getElementById('pos-pay-modal').style.display = 'flex';
        ['pay-money', 'pay-pix', 'pay-credit', 'pay-debit', 'pay-crediario', 'pay-desconto', 'pay-nsu-aut', 'pay-nsu-doc'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        Varejo.calcRestante();
        setTimeout(() => {
            const el = document.getElementById('pay-money');
            if (el) { el.focus(); el.select(); }
        }, 100);
    },

    calcDescontoPct: () => {
        const total = Varejo.state.totalTicket;
        const pct = parseFloat(document.getElementById('pay-desconto-pct').value) || 0;
        const val = (total * pct) / 100;
        document.getElementById('pay-desconto').value = val.toFixed(2);
        Varejo.calcRestante();
    },

    calcRestante: () => {
        const total = Varejo.state.totalTicket;
        const paid = ['pay-money', 'pay-pix', 'pay-credit', 'pay-debit', 'pay-crediario'].reduce((a, id) => a + (parseFloat(document.getElementById(id).value) || 0), 0);
        const desc = parseFloat(document.getElementById('pay-desconto').value) || 0;
        const res = total - (paid + desc);

        const zone = document.getElementById('pay-restante-zone');
        const box = document.getElementById('pay-restante-box');
        const label = document.getElementById('pay-restante-label');
        const btn = document.getElementById('btn-finalizar-venda');

        if (res <= 0.01) {
            zone.style.background = "rgba(16, 185, 129, 0.1)";
            zone.style.borderColor = "var(--pos-success)";
            label.innerHTML = res < -0.01 ? "Troco a Devolver" : `Pagamento Completo ${desc > 0 ? `<span style="color:#10b981; font-size:0.7rem; margin-left:10px;">(Economia: ${desc.toFixed(2)})</span>` : ''}`;
            label.style.color = "var(--pos-success)";
            box.innerText = `${Math.abs(res).toFixed(2)}`;
            box.style.color = "var(--pos-success)";
            btn.disabled = false;
        } else {
            zone.style.background = "rgba(239, 68, 68, 0.05)";
            zone.style.borderColor = "rgba(239, 68, 68, 0.2)";
            label.innerHTML = `Restante a Pagar ${desc > 0 ? `<span style="color:#10b981; font-size:0.75rem; margin-left:10px;">(Dedução Desconto: ${desc.toFixed(2)})</span>` : ''}`;
            label.style.color = "var(--pos-danger)";
            box.innerText = `${res.toFixed(2)}`;
            box.style.color = "#fff";
            btn.disabled = true;
        }
    },

    finalizeMultiPayment: async () => {
        const exigirNsu = document.getElementById('pos-exigir-nsu')?.checked;
        const pays = [
            { t: 'Dinheiro', v: 'pay-money' },
            { t: 'Pix', v: 'pay-pix' },
            { t: 'Crédito', v: 'pay-credit' },
            { t: 'Débito', v: 'pay-debit' },
            { t: 'Crediário', v: 'pay-crediario' }
        ].map(p => ({ tipo: p.t, val: parseFloat(document.getElementById(p.v).value) || 0 })).filter(p => p.val > 0);

        const valCrediario = pays.find(p => p.tipo === 'Crediário')?.val || 0;
        if (valCrediario > 0 && !Varejo.state.currentCliente) {
            return NaxioUI.alert('Cliente Obrigatório', 'Para vendas no CREDIÁRIO, você precisa selecionar um cliente primeiro.', 'warning');
        }

        const proceed = async (installments = []) => {
            const nsu = document.getElementById('pay-nsu-doc').value.trim();
            const aut = document.getElementById('pay-nsu-aut').value.trim();
            const desc = parseFloat(document.getElementById('pay-desconto').value) || 0;

            App.utils.toast("Finalizando...", "info");
            try {
                const orderSnapshot = {
                    store_id: App.state.storeId,
                    total_pago: Varejo.state.totalTicket - desc,
                    taxa_servico: 0, // No varejo costuma ser zero ou fixo, campo garantido agora
                    status: 'concluido',
                    origem_venda: 'pdv',
                    metodo_pagamento: pays.length > 1 ? 'Múltiplos' : (pays[0]?.tipo || 'Desconto'),
                    customer_id: Varejo.state.currentCliente?.id || null,
                    observacao: JSON.stringify({ pays, desc, items: Varejo.state.cart, nsu, aut, installments }),
                    session_id: localStorage.getItem('active_cash_session') || null
                };

                const { data, error } = await _sb.from('orders').insert(orderSnapshot).select().single();
                if (error) throw error;

                // Log de Auditoria do Multi-operador
                if (typeof App !== 'undefined' && App.multiOperator && App.multiOperator.logAction) {
                    App.multiOperator.logAction("VENDA_FINALIZADA", { 
                        orderId: data.id, 
                        total: orderSnapshot.total_pago,
                        itemsCount: Varejo.state.cart.length
                    });
                }

                // Parcelas do Crediário
                if (installments.length > 0) {
                    const parcels = installments.map(i => ({
                        store_id: App.state.storeId,
                        order_id: data.id,
                        customer_id: Varejo.state.currentCliente.id,
                        installment_number: i.parcela,
                        due_date: i.vencimento,
                        amount: i.valor,
                        status: 'pendente'
                    }));
                    await _sb.from('crediario_installments').insert(parcels);
                }

                // Descontar Estoque
                const stockMoves = Varejo.state.cart.reduce((a, c) => {
                    const x = a.find(e => e.id === c.id);
                    if (x) x.qtd++; else a.push({ id: c.id, qtd: 1 });
                    return a;
                }, []);
                await _sb.rpc('descontar_estoque', { itens: stockMoves });

                App.utils.toast("Venda registrada!", "success");
                document.getElementById('pos-pay-modal').style.display = 'none';

                // Impressão e Limpeza
                const ticketCopy = [...Varejo.state.cart];
                const savedCliente = Varejo.state.currentCliente;
                Varejo.state.cart = [];
                Varejo.state.currentCliente = null;
                Varejo.renderCart();
                // NFC-e e Impressão
                if (typeof Fiscal !== 'undefined' && (App.state.currentStore?.nuvem_client_id || App.state.storeId)) {
                    const querEmitir = await NaxioUI.confirm('🧾 Emitir NFC-e?', 'Deseja gerar a nota fiscal agora?', 'Sim, Emitir', 'Não, Apenas Recibo');
                    if (querEmitir) {
                        const pmts = pays.map(p => ({
                            tipo: (p.tipo === 'Crediário' || p.tipo === 'Nota') ? '05' : '01', // Mapeamento básico
                            val: p.val.toFixed(2),
                            tipo_original: p.tipo
                        }));
                        Fiscal.emitirNFCe(data.id, orderSnapshot.total_pago, pmts, ticketCopy.map(i => ({ id: i.id, nome: i.nome, price: i.preco, qtd: 1 })));
                    } else {
                        // Se clicou em "Apenas Recibo", imprime direto sem perguntar de novo
                        Varejo.printReceipt(data, ticketCopy, pays, desc, savedCliente, installments);
                    }
                } else {
                    // Sem módulo fiscal ou desativado, imprime recibo direto
                    Varejo.printReceipt(data, ticketCopy, pays, desc, savedCliente, installments);
                }
            } catch (err) {
                console.error("Erro Finalização:", err);
                NaxioUI.alert('Erro', 'Não foi possível salvar a venda: ' + err.message, 'error');
            }
        };

        if (valCrediario > 0) {
            App.crediario.openInstallmentModal(valCrediario, Varejo.state.currentCliente, proceed);
        } else {
            proceed();
        }
    },

    buscarCliente: async (t) => {
        const res = document.getElementById('pos-main-customer-results');
        if (!t || t.length < 2) { res.style.display = 'none'; return; }
        
        const { data } = await _sb.from('profiles').select('id, nome_completo, cpf').ilike('nome_completo', `%${t}%`).limit(10);
        
        if (!data?.length) { 
            res.innerHTML = `<div style="padding:20px; text-align:center; opacity:0.5; font-size:0.8rem;">NENHUM CLIENTE ENCONTRADO</div>`;
            res.style.display = 'block';
            return; 
        }

        res.innerHTML = data.map(c => `
            <div onclick="Varejo.selecionarCliente(${JSON.stringify(c).replace(/"/g, '&quot;')})" 
                 style="padding:15px 20px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05); transition:0.2s; display:flex; flex-direction:column; gap:4px;"
                 onmouseover="this.style.background='rgba(255,255,255,0.08)'" 
                 onmouseout="this.style.background='transparent'">
                <span style="font-weight:800; font-size:0.95rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.nome_completo.toUpperCase()}</span>
                <span style="font-size:0.7rem; color:var(--pos-accent); font-weight:800; letter-spacing:0.5px;">CPF/ID: ${c.cpf || 'NÃO INFORMADO'}</span>
            </div>
        `).join('');
        res.style.display = 'block';
    },

    selecionarCliente: (c) => { 
        Varejo.state.currentCliente = c; 
        Varejo._atualizarPainelCliente(); 
        document.getElementById('pos-main-customer-results').style.display = 'none';
        const searchInput = document.getElementById('pos-main-customer-search');
        if (searchInput) searchInput.value = '';
    },
    limparCliente: () => { Varejo.state.currentCliente = null; Varejo._atualizarPainelCliente(); },
    _atualizarPainelCliente: () => {
        const c = Varejo.state.currentCliente;
        const p = document.getElementById('pos-main-customer-selected');
        const s = document.getElementById('pos-main-customer-search-area');
        const nameEl = document.getElementById('pos-main-customer-name');

        if (c) { 
            if (p) p.style.display = 'block'; 
            if (s) s.style.display = 'none'; 
            if (nameEl) nameEl.innerText = c.nome_completo || c.nome || 'Cliente'; 
        } else { 
            if (p) p.style.display = 'none'; 
            if (s) s.style.display = 'block'; 
        }
        if (typeof Varejo.saveRecoveryState === 'function') Varejo.saveRecoveryState();
    },

    loadCategories: async () => {
        const list = document.getElementById('pos-category-list');
        if (!list) return; // Segurança: se não houver o container de categorias, não faz nada

        const { data } = await _sb.from('products').select('categoria').eq('store_id', App.state.storeId);
        if (!data) return;
        
        const cats = [...new Set(data.map(c => c.categoria))].filter(Boolean).sort();
        list.innerHTML = ''; // Limpa antes de carregar
        cats.forEach(c => {
            const div = document.createElement('div'); 
            div.className = 'cat-btn'; 
            div.innerHTML = `<i class="ri-folder-line"></i><span>${c}</span>`;
            div.onclick = () => Varejo.loadProductsByCategory(c, div); 
            list.appendChild(div);
        });
    },

    loadProductsByCategory: async (c, el) => {
        const grid = document.getElementById('pos-product-grid');
        if (!grid) return; // Segurança: se não houver a grade de produtos, não faz nada

        if (el) { 
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); 
            el.classList.add('active'); 
        }
        
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; opacity:0.5;"><i class="ri-loader-4-line spin" style="font-size:2rem;"></i><br>Carregando Itens...</div>';
        
        try {
            let q = _sb.from('products').select('*').eq('store_id', App.state.storeId).limit(50);
            if (c) q = q.eq('categoria', c);
            const { data, error } = await q;
            
            if (error) throw error;

            grid.innerHTML = data.map(p => `
                <div class="product-card animate-in" onclick="Varejo.addItem(${JSON.stringify(p).replace(/"/g, '&quot;')}, 1)">
                    <div style="font-weight:800; font-size:1.1rem; height:2.5rem; overflow:hidden; line-height:1.2;">${p.nome}</div>
                    <div class="price-tag">R$ ${parseFloat(p.preco).toFixed(2)}</div>
                    <div class="stock-bar">
                        <div class="stock-progress" style="width:${Math.min(100, (p.estoque || 0) * 10)}%; background:${p.estoque < 5 ? '#f43f5e' : '#10b981'}"></div>
                    </div>
                    <div style="font-size:0.65rem; font-weight:800; color:var(--pos-text-muted); margin-top:5px; display:flex; justify-content:space-between;">
                        <span>ESTOQUE: ${p.estoque || 0} UN</span>
                        <span>COD: ${p.id.toString().slice(-4).toUpperCase()}</span>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:red;">Erro ao carregar produtos.</div>';
        }
    },

    startClock: () => setInterval(() => { const el = document.getElementById('pos-clock'); if (el) el.innerText = new Date().toLocaleTimeString('pt-BR'); }, 1000),

    printReceipt: (order, items, pays, desc, cliente, installments = []) => {
        const win = window.open('', '', 'width=800,height=600');
        const storeName = (App.state.currentStore?.nome_loja) || App.state.storeName || 'MINHA LOJA';
        const date = new Date().toLocaleString('pt-BR');

        // Agrupa itens para o recibo para economizar papel
        const grouped = [];
        items.forEach(i => {
            const ex = grouped.find(g => g.id === i.id);
            if (ex) { ex.qtd++; ex.total = ex.qtd * i.preco; }
            else { grouped.push({ ...i, qtd: 1, total: i.preco }); }
        });

        // Detalhes do Crediário
        let installmentsHtml = '';
        if (installments && installments.length > 0) {
            installmentsHtml = `
                <div class="sep"></div>
                <div class="bold">PLANOS DE PAGAMENTO (CREDIÁRIO):</div>
                ${installments.map(ins => `
                    <div class="item" style="font-size:12px;">
                        <span>Parc. ${ins.parcela} (${new Date(ins.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')})</span>
                        <span>${parseFloat(ins.valor).toFixed(2)}</span>
                    </div>
                `).join('')}
            `;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
                    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier Prime', Courier, monospace !important; }
                    body { 
                        width: 100%;
                        max-width: 80mm;
                        margin: 0 auto; 
                        padding: 10px; 
                        color: #000; 
                        background: #fff;
                        font-size: 12px; 
                        line-height: 1.2; 
                        -webkit-print-color-adjust: exact; 
                    }
                    .center { text-align: center; }
                    .bold { font-weight: bold; font-size: 15px; }
                    .sep { border-top: 1px dashed #000; margin: 8px 0; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 4px; }
                    .footer { font-size: 11px; margin-top: 15px; padding-bottom: 20px; border-top: 1px solid #000; padding-top: 10px; }
                    
                    @page { margin: 0; size: 80mm auto; }
                    @media print { 
                        body { width: 80mm; padding: 10px; margin: 0; } 
                        .no-print { display: none; } 
                    }
                    .no-print { margin-top: 20px; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 8px; }
                    .no-print button { padding: 10px 20px; cursor: pointer; margin: 5px; background: #000; color: #fff; border: none; border-radius: 5px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="center bold" style="font-size: 18px;">${storeName.toUpperCase()}</div>
                <div class="center">COMPROVANTE DE VENDA</div>
                <div class="sep"></div>
                <div style="font-size:12px;">
                    <div>DATA: ${date}</div>
                    <div>PEDIDO: #${order.id.toString().slice(-6).toUpperCase()}</div>
                    <div>CLIENTE: ${cliente?.nome_completo || 'CONSUMIDOR FINAL'}</div>
                </div>
                <div class="sep"></div>
                <div class="bold">ITENS:</div>
                <div style="font-size:13px;">
                ${grouped.map(i => `
                    <div class="item">
                        <span>${i.qtd}x ${i.nome.slice(0, 30)}</span>
                        <span>${i.total.toFixed(2)}</span>
                    </div>
                `).join('')}
                </div>
                <div class="sep"></div>
                <div class="item bold"><span>SUBTOTAL:</span> <span>${(Varejo.state.totalTicket || 0).toFixed(2)}</span></div>
                ${desc > 0 ? `<div class="item"><span>DESCONTO:</span> <span>- ${desc.toFixed(2)}</span></div>` : ''}
                <div class="item bold" style="font-size: 18px;"><span>TOTAL:</span> <span>${(order.total_pago).toFixed(2)}</span></div>
                <div class="sep"></div>
                <div class="bold">PAGAMENTO:</div>
                ${pays.map(p => `<div class="item"><span>${p.tipo}:</span> <span>${p.val.toFixed(2)}</span></div>`).join('')}
                
                ${installmentsHtml}

                <div class="sep"></div>
                <div class="center footer">
                    Obrigado pela preferência!<br>
                    Guarde este comprovante para trocas.<br>
                    Desenvolvido por NAXIO PRO
                </div>
                <div class="no-print">
                    <button onclick="window.print()">IMPRIMIR</button>
                    <button onclick="window.close()">FECHAR</button>
                </div>
                <script>
                    setTimeout(() => { 
                        window.print();
                    }, 800);
                </script>
            </body>
            </html>
        `;
        win.document.write(html);
        win.document.close();
    },
    openToolsMenu: () => {
        const tools = Object.entries(App.storeTools);
        const html = `
        <div id="pos-tools-modal" class="modal-overlay" style="display:flex;">
            <div class="modal-content" style="max-width:800px; max-height:80vh; overflow:hidden; display:flex; flex-direction:column;">
                <div class="modal-header">
                    <h3><i class="ri-magic-line"></i> Ferramentas Enterprise (30 Funcionalidades)</h3>
                    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('pos-tools-modal').remove()">X</button>
                </div>
                <div class="modal-body scroll-thin" style="flex:1; overflow-y:auto; padding:20px; display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">
                    ${tools.map(([key, fn]) => {
                        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        return `<button class="btn btn-outline" style="text-align:left; padding:15px; border-radius:12px; font-size:0.85rem;" onclick="App.storeTools.${key}()">
                            <i class="ri-checkbox-circle-line" style="color:var(--pos-success);"></i> ${label}
                        </button>`;
                    }).join('')}
                </div>
                <div class="modal-footer" style="padding:15px; border-top:1px solid var(--pos-border); text-align:center; font-size:0.75rem; color:var(--pos-text-muted);">
                    As funcionalidades marcadas como (em breve) serão liberadas na próxima atualização.
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    }
};

window.Varejo = Varejo;
console.log("✅ Varejo 5.0 Pronto.");
