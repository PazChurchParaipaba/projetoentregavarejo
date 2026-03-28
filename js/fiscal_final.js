const Fiscal = {
    // Estado interno para controle de tentativas (Retry)
    state: {
        tentativas: 0,
        maxTentativas: 3,
        isProcessing: false
    },

    init: () => {
        console.log("🏛️ Módulo Fiscal Enterprise Carregado");
    },

    // =========================================================================
    // 🖥️ PARTE VISUAL (MODAL, PREVIEW E CONFIGURAÇÕES)
    // =========================================================================

    // --- NOVO: Função para mostrar o Cupom na tela ---
    exibirPreviewDanfe: async (pdfData, chave) => {
        // Remove modal anterior se houver
        const old = document.getElementById('preview-nfe-modal');
        if (old) old.remove();

        App.utils.toast("Preparando visualização...", "info");

        let previewUrl = pdfData;

        // Tenta converter para Blob URL sempre (mesmo se for URL externa) para burlar CORS no print e iFrame
        try {
            let blob;
            if (pdfData.startsWith('data:application/pdf;base64,')) {
                const base64 = pdfData.split(',')[1];
                const binary = atob(base64);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
                blob = new Blob([array], { type: 'application/pdf' });
            } else if (pdfData.startsWith('http')) {
                // Se for URL, tenta baixar e converter em blob local
                const response = await fetch(pdfData);
                blob = await response.blob();
            }

            if (blob) {
                previewUrl = URL.createObjectURL(blob);
            }
        } catch (e) {
            console.error("Erro ao processar PDF para preview:", e);
            // Fallback mantém a URL original
        }

        const html = `
        <div id="preview-nfe-modal" class="modal-overlay" style="display:flex; z-index:10000; align-items:center; justify-content:center; background:rgba(0,0,0,0.8); position:fixed; top:0; left:0; width:100%; height:100%;">
            <div class="modal-content" style="width:95%; max-width:600px; height:90vh; background:#1e293b; display:flex; flex-direction:column; border-radius:12px; overflow:hidden; border:1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                
                <div class="modal-header" style="padding:15px 20px; background:#0f172a; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0; color:#4ade80; font-size:1.2rem;">✅ Nota Autorizada!</h3>
                        <small style="color:#94a3b8; font-size:0.75rem; font-family:monospace;">${chave || 'NFC-e Emitida com Sucesso'}</small>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('preview-nfe-modal').remove()" style="background:#334155; border:none; color:#fff; cursor:pointer; padding:5px 10px; border-radius:4px;">X</button>
                </div>

                <div class="modal-body" style="flex:1; padding:0; background:#0f172a; position:relative;">
                    <iframe id="iframe-danfe" src="${previewUrl}" style="width:100%; height:100%; border:none;"></iframe>
                </div>

                <div class="modal-footer" style="padding:15px; display:flex; gap:12px; background:#0f172a; border-top:1px solid #334155;">
                    <button class="btn btn-secondary" style="flex:1; background:#334155; color:#fff;" onclick="document.getElementById('preview-nfe-modal').remove()">Fechar</button>
                    <button class="btn btn-success" style="flex:1.5; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="Fiscal.imprimirIframe()">
                        <i class="ri-printer-line"></i> IMPRIMIR AGORA
                    </button>
                    <a href="${previewUrl}" download="NFCe_${chave || 'nota'}.pdf" class="btn btn-info" style="width:auto; padding:10px; display:flex; align-items:center; justify-content:center; text-decoration:none; background:#0284c7;">
                        <i class="ri-download-2-line"></i>
                    </a>
                </div>
            </div>
        </div>`;

        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);
    },

    // Função auxiliar para imprimir o iframe sem abrir nova aba
    imprimirIframe: () => {
        const frame = document.getElementById('iframe-danfe');
        if (!frame) return;
        try {
            frame.contentWindow.focus();
            frame.contentWindow.print();
        } catch (e) {
            console.error("Erro ao imprimir via iframe:", e);
            // Se falhar (ex: CORS), abre em nova aba como último recurso
            window.open(frame.src, '_blank');
        }
    },

    openModal: async () => {
        if (!App.state.storeId) return alert("Erro: ID da Loja não encontrado.");

        // 1. Busca dados da loja (Configurações)
        const { data: store } = await _sb.from('stores').select('*').eq('id', App.state.storeId).single();

        // 2. Busca últimas 5 notas autorizadas
        const { data: lastNotes } = await _sb.from('orders')
            .select('id, created_at, total_pago, status_sefaz, chave_acesso, numero_nota')
            .eq('store_id', App.state.storeId)
            .eq('status_sefaz', 'autorizado')
            .order('created_at', { ascending: false })
            .limit(5);

        const old = document.getElementById('fiscal-modal'); if (old) old.remove();

        // 3. Gera HTML da lista de notas
        let notesHtml = '';
        if (lastNotes && lastNotes.length > 0) {
            notesHtml = lastNotes.map(n => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee; font-size:0.85rem;">
                    <div>
                        <strong>NFC-e #${n.numero_nota || 'S/N'}</strong><br>
                        <span class="text-muted">${new Date(n.created_at).toLocaleString()}</span><br>
                        <span style="font-family:monospace; font-size:0.75rem;">${n.chave_acesso || '...'}</span>
                    </div>
                    <button class="btn btn-sm btn-danger" style="width:auto; padding: 4px 10px;" onclick="Fiscal.cancelarNota('${n.id}', '${n.chave_acesso}')">Cancelar</button>
                </div>
            `).join('');
        } else {
            notesHtml = '<div style="padding:15px; text-align:center; color:#94a3b8;">Nenhuma nota autorizada recentemente.</div>';
        }

        // 4. Monta o Modal
        const html = `
        <div id="fiscal-modal" class="modal-overlay" style="display:flex; z-index:9999; align-items:center; justify-content:center;">
            <div class="modal-content" style="max-height:90vh; overflow-y:auto; max-width:600px;">
                <div class="modal-header">
                    <h3>Fiscal & Contador</h3>
                    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('fiscal-modal').remove()">Fechar</button>
                </div>
                <div class="modal-body">
                    
                    <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:15px; margin-bottom:15px;">
                        <h5 style="color:#0369a1; margin-bottom:10px; display:flex; align-items:center; gap:5px;"><i class="ri-settings-3-line"></i> Credenciais Nuvem Fiscal</h5>
                        
                        <div class="input-wrapper">
                            <label>Client ID</label>
                            <input type="text" id="nuvem-id" class="input-field" value="${store.nuvem_client_id || ''}" placeholder="Client ID">
                        </div>
                        <div class="input-wrapper">
                            <label>Client Secret</label>
                            <input type="password" id="nuvem-secret" class="input-field" value="${store.nuvem_client_secret || ''}" placeholder="Client Secret">
                        </div>

                        <div style="display:flex; gap:10px;">
                            <div class="input-wrapper" style="flex:1">
                                <label>CSC ID (Ex: 000001)</label>
                                <input type="text" id="csc-id" class="input-field" value="${store.csc_id || ''}">
                            </div>
                            <div class="input-wrapper" style="flex:2">
                                <label>Código CSC (Token)</label>
                                <input type="text" id="csc-token" class="input-field" value="${store.csc_token || ''}">
                            </div>
                        </div>

                        <div class="input-wrapper" style="margin-top:10px; border-top:1px dashed #cbd5e1; padding-top:10px;">
                            <label>Email do Contador (Para envio de XML)</label>
                            <input type="email" id="cont-email" class="input-field" value="${store.email_contador || ''}" placeholder="contador@escritorio.com">
                        </div>

                        <button class="btn btn-success btn-full" style="margin-top:10px;" onclick="Fiscal.saveCredentials()">Salvar Configurações</button>
                        
                        <div style="text-align:center; margin-top:10px;">
                            <button class="btn btn-sm btn-info" onclick="Fiscal.exportarXMLs()"><i class="ri-download-cloud-line"></i> Baixar XMLs em Lote (ZIP)</button>
                        </div>
                    </div>

                    <div style="border-top:1px solid #eee; padding-top:15px;">
                        <h5 style="color:var(--danger); margin-bottom:10px;"><i class="ri-file-warning-line"></i> Cancelar Notas (Últimos 30 min)</h5>
                        <div style="background:var(--surface); border:1px solid var(--border); border-radius:8px; overflow:hidden; color:var(--text-main);">
                            ${notesHtml}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);
    },

    saveCredentials: async () => {
        const clientId = document.getElementById('nuvem-id').value.trim();
        const clientSecret = document.getElementById('nuvem-secret').value.trim();
        const cscId = document.getElementById('csc-id').value.trim();
        const cscToken = document.getElementById('csc-token').value.trim();
        const emailCont = document.getElementById('cont-email').value.trim();

        if (!clientId || !clientSecret) return alert("Erro: Client ID e Secret são obrigatórios.");

        const { error } = await _sb.from('stores').update({
            nuvem_client_id: clientId,
            nuvem_client_secret: clientSecret,
            csc_id: cscId,
            csc_token: cscToken,
            email_contador: emailCont
        }).eq('id', App.state.storeId);

        if (error) alert("Erro ao salvar: " + error.message);
        else alert("✅ Dados Fiscais e de Contador Salvos!");
    },

    // =========================================================================
    // 🚀 LÓGICA DE EMISSÃO (COM RETRY AUTOMÁTICO)
    // =========================================================================

    emitirNFCe: async (orderId, totalOriginal = null, paymentsPayload = null, itemsPayload = null, extra = {}) => {
        if (Fiscal.state.isProcessing) {
            App.utils.toast("⚠️ Já existe uma emissão em andamento...", "warning");
            return;
        }

        try {
            Fiscal.state.isProcessing = true;
            console.log("🚀 Iniciando emissão via API para Order:", orderId);

            // 1. Identificação do Cliente (Opcional) - Agora em um único modal para agilizar
            const identificacao = await new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'naxio-modal-overlay active';
                modal.style.zIndex = '10001';
                modal.innerHTML = `
                    <div class="naxio-modal-container" style="max-width: 450px;">
                        <div class="naxio-modal-icon" style="color: #3b82f6;">
                            <i class="ri-user-received-2-line" style="font-size: 3rem;"></i>
                        </div>
                        <h3 class="naxio-modal-title">🧾 Identificar Cliente?</h3>
                        <p class="naxio-modal-message">Informe os dados caso o cliente deseje CPF na nota. <b>(Opcional)</b></p>
                        
                        <div style="text-align:left; width:100%; margin-top:15px;">
                            <div class="naxio-input-wrapper" style="margin-bottom:12px;">
                                <label style="font-size:0.85rem; color:#64748b; font-weight:600; display:block; margin-bottom:5px;">CPF ou CNPJ (Opcional)</label>
                                <input type="text" id="fiscal-cpf" class="naxio-input" placeholder="Ex: 000.000.000-00" autocomplete="off">
                            </div>
                            <div class="naxio-input-wrapper">
                                <label style="font-size:0.85rem; color:#64748b; font-weight:600; display:block; margin-bottom:5px;">Nome do Cliente (Opcional)</label>
                                <input type="text" id="fiscal-nome" class="naxio-input" placeholder="Nome Completo ou Razão Social" autocomplete="off">
                            </div>
                        </div>

                        <div class="naxio-modal-actions" style="margin-top:25px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <button class="naxio-btn naxio-btn-secondary" id="btn-fiscal-skip" style="width:100%;">Emitir S/ CPF</button>
                            <button class="naxio-btn naxio-btn-primary" id="btn-fiscal-confirm" style="width:100%;">Confirmar</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                const close = (res) => {
                    modal.classList.remove('active');
                    setTimeout(() => { modal.remove(); resolve(res); }, 300);
                };

                // Tecla Enter no input de Nome finaliza
                const inputCpf = modal.querySelector('#fiscal-cpf');
                const inputNome = modal.querySelector('#fiscal-nome');

                inputCpf.onkeypress = (e) => { if (e.key === 'Enter') inputNome.focus(); };
                inputNome.onkeypress = (e) => {
                    if (e.key === 'Enter') {
                        const cpf = inputCpf.value.trim();
                        const nome = inputNome.value.trim();
                        close({ cpf: cpf || null, nome: nome || null });
                    }
                };

                modal.querySelector('#btn-fiscal-skip').onclick = () => close({ cpf: null, nome: null });
                modal.querySelector('#btn-fiscal-confirm').onclick = () => {
                    const cpf = inputCpf.value.trim();
                    const nome = inputNome.value.trim();
                    close({ cpf: cpf || null, nome: nome || null });
                };

                inputCpf.focus();
            });

            const cpfCompleto = identificacao.cpf;
            const nomeNota = identificacao.nome;

            App.utils.toast("🚀 Enviando para SEFAZ...", "info");

            // ⚠️ FIX: Determina o endpoint correto (Local ou Cloud)
            let apiBase = '';
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                apiBase = (App.payment && App.payment.getConfig) ? App.payment.getConfig() : 'https://naxiosoftware.vercel.app';
            }

            // 2. Chama a API robusta
            const res = await fetch(`${apiBase}/api/emitir_fiscal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    store_id: App.state.storeId,
                    cpf_nota: cpfCompleto || null,
                    nome_nota: nomeNota || null,
                    items_payload: itemsPayload || null,
                    payments_payload: paymentsPayload || null
                })
            });

            const data = await res.json();

            if (data.sucesso || data.status === 'autorizado') {
                App.utils.toast("✅ NFC-e AUTORIZADA!", "success");
                if (data.pdf) {
                    Fiscal.exibirPreviewDanfe(data.pdf, data.chave || '');
                } else if (data.url_pdf) {
                    Fiscal.exibirPreviewDanfe(data.url_pdf, data.chave || '');
                } else {
                    await NaxioUI.alert('✅ Sucesso', `Nota autorizada! Mas o PDF não foi gerado automaticamente. Você pode baixá-lo no menu Fiscal.`, 'success');
                }
                return { success: true, data };
            } else {
                console.error("❌ Erro SEFAZ:", data);
                const msgErro = data.motivo_sefaz || data.message || data.error || "Erro desconhecido na emissão.";

                // Se for um erro que pode ser resolvido com retry, o usuário pode tentar de novo manualmente
                await NaxioUI.alert('❌ Erro na Emissão', `A SEFAZ retornou um erro:\n\n${msgErro}`, 'error');
                return { success: false, erro: msgErro };
            }

        } catch (e) {
            console.error("❌ Erro fatal na chamada da API Fiscal:", e);
            App.utils.toast("Erro ao comunicar com servidor fiscal", "error");
            return { success: false, erro: e.message };
        } finally {
            Fiscal.state.isProcessing = false;
        }
    },



    // =========================================================================
    // 🛠️ AÇÕES EXTRAS (CANCELAMENTO, CONTINGÊNCIA, XML)
    // =========================================================================

    cancelarNota: async (orderId, chaveAcesso) => {
        App.utils.customInput("Cancelar Nota Fiscal", "Motivo (Min. 15 caracteres)", async (motivo) => {
            if (!motivo || motivo.length < 15) return alert("Motivo muito curto. Descreva melhor (mínimo 15 letras).");

            App.utils.toast("Processando cancelamento...", "info");

            try {
                // Atualiza status no banco
                const { error } = await _sb.from('orders')
                    .update({
                        status_sefaz: 'cancelado',
                        motivo_cancelamento: motivo
                    })
                    .eq('id', orderId);

                if (error) throw error;

                alert("✅ Solicitação de cancelamento registrada!");
                Fiscal.openModal(); // Atualiza a lista

            } catch (e) {
                alert("Erro ao registrar cancelamento: " + e.message);
            }
        });
    },

    contingencia: async (orderId) => {
        if (!confirm("⚠️ Emitir em contingência?")) return;
        try {
            await _sb.from('orders').update({ status_sefaz: 'contingencia' }).eq('id', orderId);
            App.utils.toast("Nota marcada como contingência", "warning");
        } catch (e) {
            alert("Erro: " + e.message);
        }
    },

    exportarXMLs: async () => {
        // 1. Solicita datas no formato Brasileiro
        const hoje = new Date().toLocaleDateString('pt-BR'); // Ex: 30/01/2026
        // FIX: window.prompt é assíncrono neste projeto (definido em naxio-helpers.js)
        const dataInicioBR = await prompt("Data Início (DD/MM/AAAA):", hoje);
        const dataFimBR = await prompt("Data Fim (DD/MM/AAAA):", hoje);

        if (!dataInicioBR || !dataFimBR) return;

        // Função robusta para converter DD/MM/AAAA ou DD-MM-AAAA -> YYYY-MM-DD
        const converterDataISO = (val) => {
            if (!val) return "";
            const s = String(val).trim();
            // Já está no formato YYYY-MM-DD?
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

            // Tenta quebrar por barra, traço ou ponto
            const parts = s.split(/[\/\-\.]/);
            if (parts.length === 3) {
                const [d, m, a] = parts;
                // Se o primeiro pedaço tem 4 dígitos (YYYY-MM-DD já detectado no regex, mas por segurança...)
                if (d.length === 4) return `${d}-${m.padStart(2, '0')}-${a.padStart(2, '0')}`;
                // Se o último pedaço tem 4 dígitos ou 2 dígitos (assumimos DD/MM/YYYY)
                const anoFinal = a.length === 2 ? `20${a}` : a;
                return `${anoFinal}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            return s; // Fallback se não conseguir processar
        };

        const isoInicio = converterDataISO(dataInicioBR);
        const isoFim = converterDataISO(dataFimBR);

        App.utils.toast("📦 Buscando e processando XMLs...", "info");

        // 2. Busca no banco (Coluna xml_arquivo é a correta para o BYTEA)
        const { data: notas, error } = await _sb.from('orders')
            .select('*')
            .eq('store_id', App.state.storeId)
            .not('xml_arquivo', 'is', null) // <--- CORREÇÃO: Nome da coluna atualizada
            .gte('created_at', `${isoInicio}T00:00:00`)
            .lte('created_at', `${isoFim}T23:59:59`);

        if (error) {
            console.error(error);
            return alert("Erro ao buscar notas: " + error.message);
        }

        if (!notas || notas.length === 0) {
            return alert("Nenhuma nota com XML encontrada neste período.");
        }

        // 3. Função para decodificar BYTEA (Hex -> String)
        const hexToUtf8 = (hex) => {
            if (!hex) return "";
            // Se não começar com \x, assume que já é texto (legado)
            if (typeof hex === 'string' && !hex.startsWith('\\x')) return hex;

            // Remove o prefixo \x
            const cleanHex = hex.toString().replace(/^\\x/, '');

            let str = '';
            for (let i = 0; i < cleanHex.length; i += 2) {
                str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
            }
            try {
                // Tenta decodificar caracteres especiais (acentos)
                return decodeURIComponent(escape(str));
            } catch (e) {
                return str;
            }
        };

        // Organiza por status
        const organizadas = { autorizadas: [], canceladas: [], rejeitadas: [] };

        notas.forEach(n => {
            let status = (n.status_sefaz || 'outros').toLowerCase();
            if (status.includes('autorizado')) status = 'autorizadas';
            else if (status.includes('cancelado')) status = 'canceladas';
            else status = 'rejeitadas';

            organizadas[status].push(n);
        });

        // 4. Cria o ZIP
        if (typeof JSZip === 'undefined') return alert("Erro: Biblioteca JSZip não carregada.");
        const zip = new JSZip();

        Object.keys(organizadas).forEach(statusKey => {
            if (organizadas[statusKey].length > 0) {
                const pasta = zip.folder(statusKey.toUpperCase());

                organizadas[statusKey].forEach(nota => {
                    // Decodifica o conteúdo do banco
                    const xmlConteudo = hexToUtf8(nota.xml_arquivo);
                    const nomeArquivo = `${nota.chave_acesso || nota.id}.xml`;

                    if (xmlConteudo) {
                        pasta.file(nomeArquivo, xmlConteudo);
                    }
                });
            }
        });

        // Gera o arquivo
        const content = await zip.generateAsync({ type: "blob" });
        // Nome do arquivo com datas formatadas (substitui / por -)
        const nomeZip = `XMLs_${dataInicioBR.replace(/\//g, '-')}_a_${dataFimBR.replace(/\//g, '-')}.zip`;

        saveAs(content, nomeZip);
        App.utils.toast(`✅ Download de ${notas.length} XMLs iniciado!`, "success");
    }
};

// Make it global
window.Fiscal = Fiscal;
if (typeof App !== 'undefined') {
    App.fiscal = Object.assign(App.fiscal || {}, Fiscal);
}
