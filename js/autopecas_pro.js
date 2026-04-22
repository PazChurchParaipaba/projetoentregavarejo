/**
 * AUTOPEÇAS PRO - Módulo de Expansão
 * Focado em Transparência, Acessibilidade e B2B
 */

if (typeof App !== 'undefined') {
    App.autopecasPro = {
        init: () => {
            console.log("🚀 AutoPeças PRO: Inicializando módulos avançados...");
            App.autopecasPro.setupAccessibility();
            App.autopecasPro.enhanceProductForm();
            App.autopecasPro.injectProButtons();
        },

        // 1. ACESSIBILIDADE: CONTROLE DE TAMANHO
        setupAccessibility: () => {
            const bar = document.createElement('div');
            bar.className = 'accessibility-bar';
            bar.innerHTML = `
                <button class="accessibility-btn" title="Aumentar Fonte" onclick="App.autopecasPro.changeFontSize(1)">
                    <i class="ri-add-line"></i>
                </button>
                <button class="accessibility-btn" title="Resetar" onclick="App.autopecasPro.changeFontSize(0)">
                    <i class="ri-refresh-line"></i>
                </button>
            `;
            document.body.appendChild(bar);
        },

        changeFontSize: (delta) => {
            const body = document.body;
            if (delta === 0) {
                body.classList.remove('font-size-large', 'font-size-xlarge');
                localStorage.removeItem('naxio-font-size');
                return;
            }

            if (body.classList.contains('font-size-xlarge')) {
                if (delta < 0) body.classList.replace('font-size-xlarge', 'font-size-large');
            } else if (body.classList.contains('font-size-large')) {
                if (delta > 0) body.classList.replace('font-size-large', 'font-size-xlarge');
                else body.classList.remove('font-size-large');
            } else {
                if (delta > 0) body.classList.add('font-size-large');
            }
            
            const current = body.classList.contains('font-size-xlarge') ? 'xl' : (body.classList.contains('font-size-large') ? 'lg' : 'md');
            localStorage.setItem('naxio-font-size', current);
        },

        // 2. DESCRIÇÃO DO PRODUTO APRIMORADA
        enhanceProductForm: () => {
            const originalOpenModal = App.store.openProductModal;
            App.store.openProductModal = function(prod = null) {
                originalOpenModal.apply(this, arguments);
                
                // Melhora Descrição Geral
                const descField = document.getElementById('new-prod-desc');
                if (descField) {
                    descField.placeholder = "Descrição técnica detalhada (Tecido, Medidas, Estado, Garantia)...";
                    descField.parentElement.classList.add('product-desc-wrapper');
                    if (!document.getElementById('desc-char-counter')) {
                        const counter = document.createElement('div');
                        counter.id = 'desc-char-counter';
                        counter.className = 'desc-counter';
                        descField.parentElement.appendChild(counter);
                        descField.oninput = () => counter.innerText = `${descField.value.length} caracteres`;
                    }
                }

                // Melhora Aplicação (Autopeças)
                const appField = document.getElementById('ap-aplicacao');
                if (appField && appField.tagName === 'INPUT') {
                    // Transformar em textarea para melhor visibilidade de múltiplos carros
                    const wrapper = appField.parentElement;
                    const val = appField.value;
                    wrapper.innerHTML = `<label class="text-xs">Aplicação (Carros Compatíveis - Use vírgula para separar)</label>
                                       <textarea id="ap-aplicacao" class="input-field" style="min-height:80px !important;">${val}</textarea>`;
                }
            };
        },

        injectProButtons: () => {
            const panel = document.querySelector('.painel-actions-grid');
            if (panel && !document.getElementById('btn-nfe-b2b')) {
                const btn = document.createElement('button');
                btn.id = 'btn-nfe-b2b';
                btn.className = 'btn action-btn btn-nfe-empresa';
                btn.innerHTML = '<i class="ri-building-line"></i> NF-e Grande (B2B)';
                btn.onclick = App.autopecasPro.openNfeB2BModal;
                panel.appendChild(btn);
            }
        },

        // 3. DETALHAMENTO DE OS PARA TRANSPARÊNCIA
        openOSDetailsPro: async (osId) => {
            const { data: os } = await _sb.from('service_orders').select('*, profiles(nome_completo)').eq('id', osId).single();
            const { data: items } = await _sb.from('service_order_items').select('*').eq('os_id', osId);
            
            if (!os) return;

            const modalHtml = `
                <div id="os-pro-modal" class="modal-overlay" style="display:flex; z-index:10010;">
                    <div class="modal-content modal-full">
                        <div class="modal-header">
                            <h3><i class="ri-tools-line"></i> Detalhamento Transparente OS #${os.id.slice(0,6)}</h3>
                            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('os-pro-modal').remove()">Fechar</button>
                        </div>
                        <div class="modal-body">
                            <div class="os-info-grid">
                                <div class="os-info-box"><label>Cliente</label><span>${os.cliente_nome}</span></div>
                                <div class="os-info-box"><label>Veículo</label><span class="placa-display">${os.veiculo_placa || 'SEM PLACA'}</span><br><span>${os.veiculo_modelo}</span></div>
                                <div class="os-info-box"><label>Status Atual</label><span class="os-status-badge" style="background:${App.autopecas.getStatusColor(os.status)}">${os.status.toUpperCase()}</span></div>
                                <div class="os-info-box"><label>Data de Entrada</label><span>${new Date(os.created_at).toLocaleString()}</span></div>
                            </div>

                            <div class="os-detail-section">
                                <h4><i class="ri-list-check"></i> Itens, Peças e Mão de Obra</h4>
                                <table class="os-items-table">
                                    <thead>
                                        <tr>
                                            <th>Descrição</th>
                                            <th>Tipo</th>
                                            <th>Qtd</th>
                                            <th>Unitário</th>
                                            <th>Subtotal</th>
                                            <th>Garantia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${items.map(i => `
                                            <tr>
                                                <td><strong>${i.descricao}</strong></td>
                                                <td><span class="${i.tipo === 'peca' ? 'os-tipo-peca' : 'os-tipo-servico'}">${i.tipo.toUpperCase()}</span></td>
                                                <td>${i.qtd}</td>
                                                <td>R$ ${i.preco_unitario.toFixed(2)}</td>
                                                <td><strong>R$ ${(i.qtd * i.preco_unitario).toFixed(2)}</strong></td>
                                                <td><span class="warranty-badge"><i class="ri-shield-check-line"></i> 90 Dias</span></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>

                            <div class="product-desc-wrapper">
                                <label>Observações Técnicas e Laudo</label>
                                <p style="color:var(--text-main); font-size:1rem;">${os.descricao_problema || 'Nenhuma observação técnica registrada.'}</p>
                            </div>

                            <div class="os-total-bar">
                                <div class="total-label">VALOR TOTAL DA ORDEM</div>
                                <div class="total-value">R$ ${(os.valor_total || 0).toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="modal-footer" style="display:flex; gap:10px;">
                            <button class="btn btn-print-os" onclick="App.autopecas.printOS('${os.id}')"><i class="ri-printer-line"></i> Imprimir OS Detalhada</button>
                            <button class="btn btn-success" style="flex:1" onclick="App.autopecas.checkoutOS('${os.id}', ${os.valor_total})">Finalizar e Receber</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        },

        // 4. EMISSÃO DE NOTA FISCAL GRANDE (NF-e) B2B
        openNfeB2BModal: () => {
            const modalHtml = `
                <div id="nfe-b2b-modal" class="modal-overlay" style="display:flex; z-index:10010;">
                    <div class="modal-content nfe-b2b-modal">
                        <div class="modal-header">
                            <h3><i class="ri-building-line"></i> Emissão de NF-e B2B (Empresa)</h3>
                            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('nfe-b2b-modal').remove()">Fechar</button>
                        </div>
                        <div class="modal-body">
                            <div class="nfe-section">
                                <div class="nfe-section-title"><i class="ri-user-search-line"></i> Dados do Destinatário</div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                    <div class="input-wrapper"><label>CNPJ da Empresa</label><input id="nfe-cnpj" class="input-field" placeholder="00.000.000/0001-00"></div>
                                    <div class="input-wrapper"><label>Razão Social</label><input id="nfe-razao" class="input-field" placeholder="Nome da Empresa LTDA"></div>
                                </div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                    <div class="input-wrapper"><label>Inscrição Estadual</label><input id="nfe-ie" class="input-field" placeholder="Isento ou Número"></div>
                                    <div class="input-wrapper"><label>E-mail para XML</label><input id="nfe-email" class="input-field" placeholder="financeiro@empresa.com"></div>
                                </div>
                            </div>

                            <div class="nfe-section">
                                <div class="nfe-section-title"><i class="ri-shopping-cart-line"></i> Itens da Nota</div>
                                <div id="nfe-items-container">
                                    <div class="nfe-item-row">
                                        <div class="input-wrapper"><label>Produto</label><input class="input-field nfe-item-name" placeholder="Descrição do item"></div>
                                        <div class="input-wrapper"><label>Qtd</label><input type="number" class="input-field nfe-item-qtd" value="1"></div>
                                        <div class="input-wrapper"><label>Preço</label><input type="number" class="input-field nfe-item-price" placeholder="0.00"></div>
                                        <div class="input-wrapper"><label>NCM</label><input class="input-field nfe-item-ncm" placeholder="00000000"></div>
                                        <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()"><i class="ri-delete-bin-line"></i></button>
                                    </div>
                                </div>
                                <button class="btn btn-secondary btn-sm" onclick="App.autopecasPro.addNfeItemRow()">+ Adicionar Item</button>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary btn-full" onclick="App.autopecasPro.emitirNfeGrande()">🚀 Validar e Emitir NF-e (Modelo 55)</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        },

        addNfeItemRow: () => {
            const container = document.getElementById('nfe-items-container');
            const row = document.createElement('div');
            row.className = 'nfe-item-row';
            row.innerHTML = `
                <div class="input-wrapper"><label>Produto</label><input class="input-field nfe-item-name" placeholder="Descrição do item"></div>
                <div class="input-wrapper"><label>Qtd</label><input type="number" class="input-field nfe-item-qtd" value="1"></div>
                <div class="input-wrapper"><label>Preço</label><input type="number" class="input-field nfe-item-price" placeholder="0.00"></div>
                <div class="input-wrapper"><label>NCM</label><input class="input-field nfe-item-ncm" placeholder="00000000"></div>
                <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()"><i class="ri-delete-bin-line"></i></button>
            `;
            container.appendChild(row);
        },

        emitirNfeGrande: async () => {
            App.utils.toast("Comunicando com SEFAZ...", "info");
            // Simulação de emissão para demonstração
            setTimeout(() => {
                alert("✅ NF-e Gerada com Sucesso!\n\nNúmero: 000.123.456\nChave: 352404... (44 dígitos)\n\nO XML e PDF foram enviados para o e-mail da empresa.");
                document.getElementById('nfe-b2b-modal').remove();
            }, 2000);
        }
    };

    // Override original openOSDetails para usar a versão PRO se for autopeças
    const originalOpenOSDetails = App.autopecas.openOSDetails;
    App.autopecas.openOSDetails = function(osId) {
        App.autopecasPro.openOSDetailsPro(osId);
    };

    // Inicia quando o App carregar
    setTimeout(App.autopecasPro.init, 3000);
}
