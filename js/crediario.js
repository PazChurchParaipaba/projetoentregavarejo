/**
 * Módulo de Crediário e Contas a Receber
 * Gerencia parcelamento, inadimplência e notificações.
 */
Object.assign(App, {
    crediario: {
        init: async () => {
            console.log("Módulo Crediário Inicializado.");
            App.crediario.checkOverdue();
        },

        // Verifica parcelas vencidas e exibe aviso
        checkOverdue: async () => {
            if (!App.state.storeId) return;

            const hoes = new Date().toISOString().split('T')[0];
            const { data, error } = await _sb.from('crediario_installments')
                .select('id, amount, customer_id, profiles!inner(nome_completo)')
                .eq('store_id', App.state.storeId)
                .eq('status', 'pendente')
                .lt('due_date', hoes);

            if (data && data.length > 0) {
                const total = data.reduce((a, b) => a + b.amount, 0);
                const uniqueClients = [...new Set(data.map(d => d.profiles.nome_completo))];
                
                NaxioUI.alert(
                    '⚠️ Alerta de Inadimplência', 
                    `Existem **${data.length} parcelas vencidas** totalizando **R$ ${total.toFixed(2)}**.<br><br>Clientes: ${uniqueClients.slice(0, 3).join(', ')}${uniqueClients.length > 3 ? '...' : ''}`,
                    'warning'
                );
            }
        },

        // Abre modal para configurar parcelas
        openInstallmentModal: (total, customer, onConfirm) => {
            const modalId = 'crediario-setup-modal';
            let existing = document.getElementById(modalId);
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal-overlay';
            modal.style.display = 'flex';
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width:500px; border-radius:30px;">
                    <div class="modal-header">
                        <h3 style="font-weight:800;"><i class="ri-calendar-todo-fill" style="color:var(--pos-accent);"></i> Configurar Crediário</h3>
                        <button class="btn btn-secondary btn-sm" onclick="this.closest('.modal-overlay').remove()">X</button>
                    </div>
                    <div class="modal-body" style="padding:30px;">
                        <div style="background:rgba(59,130,246,0.1); padding:20px; border-radius:20px; margin-bottom:20px; border:1px solid rgba(59,130,246,0.2);">
                            <div class="text-xs text-muted">CLIENTE</div>
                            <div style="font-weight:800; font-size:1.1rem; color:#fff;">${customer.nome_completo}</div>
                            <div style="margin-top:10px; font-weight:900; color:var(--pos-accent); font-size:1.4rem;">R$ ${total.toFixed(2)}</div>
                        </div>

                        <div class="input-wrapper">
                            <label>Quantidade de Parcelas</label>
                            <input type="number" id="cred-n-parcelas" class="input-field" value="1" min="1" max="12" oninput="App.crediario.previewParcelas(${total})">
                        </div>

                        <div class="input-wrapper">
                            <label>Intervalo entre Parcelas (Dias)</label>
                            <select id="cred-intervalo" class="input-field" onchange="App.crediario.previewParcelas(${total})">
                                <option value="30">Mensal (30 dias)</option>
                                <option value="15">Quinzenal (15 dias)</option>
                                <option value="7">Semanal (7 dias)</option>
                            </select>
                        </div>

                        <div id="cred-preview-list" style="margin-top:20px; max-height:200px; overflow-y:auto; border-radius:15px; background:rgba(0,0,0,0.2); padding:10px;">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-success btn-full" id="btn-confirmar-crediario" style="height:60px; font-weight:800; font-size:1.1rem;">
                            GERAR CARNÊ E FINALIZAR
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            App.crediario.previewParcelas(total);

            document.getElementById('btn-confirmar-crediario').onclick = () => {
                const n = parseInt(document.getElementById('cred-n-parcelas').value) || 1;
                const interval = parseInt(document.getElementById('cred-intervalo').value) || 30;
                const installments = [];
                const baseDate = new Date();

                for (let i = 1; i <= n; i++) {
                    const dueDate = new Date(baseDate);
                    dueDate.setDate(baseDate.getDate() + (i * interval));
                    installments.push({
                        parcela: i,
                        vencimento: dueDate.toISOString().split('T')[0],
                        valor: total / n
                    });
                }

                modal.remove();
                onConfirm(installments);
            };
        },

        previewParcelas: (total) => {
            const n = parseInt(document.getElementById('cred-n-parcelas').value) || 1;
            const interval = parseInt(document.getElementById('cred-intervalo').value) || 30;
            const list = document.getElementById('cred-preview-list');
            const baseDate = new Date();
            
            let html = '';
            for (let i = 1; i <= n; i++) {
                const dueDate = new Date(baseDate);
                dueDate.setDate(baseDate.getDate() + (i * interval));
                const dateStr = dueDate.toLocaleDateString('pt-BR');
                html += `
                    <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.85rem;">
                        <span>Parcela ${i}/${n}</span>
                        <span style="color:#94a3b8;">${dateStr}</span>
                        <span style="font-weight:800; color:#10b981;">R$ ${(total/n).toFixed(2)}</span>
                    </div>
                `;
            }
            list.innerHTML = html;
        }
    }
});
