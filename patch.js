const fs = require('fs');
let content = fs.readFileSync('js/varejo_final.js', 'utf8');

// 1. Aumentar janela e adicionar botão de remover bandeira (em ambos os modais)
content = content.replace(/<div class="modal-content" style="width: 1400px; max-width: 98vw; border: 1px solid rgba\(255,255,255,0\.15\);">/g, 
    '<div class="modal-content" style="width: 1600px; max-width: 98vw; min-height: 700px; border: 1px solid rgba(255,255,255,0.15);">');
content = content.replace(/<div class="modal-content" style="width: 1300px; max-width: 98vw; border: 1px solid rgba\(255,255,255,0\.15\);">/g, 
    '<div class="modal-content" style="width: 1600px; max-width: 98vw; min-height: 700px; border: 1px solid rgba(255,255,255,0.15);">');

content = content.replace(/<button class="btn btn-secondary btn-sm" onclick="Varejo\.openSelectCardBrandModal\(\)" style="width:100%; margin-bottom: 8px; text-transform: uppercase; font-weight: 800; font-size: 0\.8rem;">\s*<i class="ri-bank-card-line"><\/i> Selecionar Bandeira do Cartão\s*<\/button>/g,
    `<button class="btn btn-secondary btn-sm" onclick="Varejo.openSelectCardBrandModal()" style="width:100%; margin-bottom: 8px; text-transform: uppercase; font-weight: 800; font-size: 0.8rem;">
        <i class="ri-bank-card-line"></i> Selecionar Bandeira do Cartão
    </button>
    <button class="btn btn-danger btn-sm btn-remove-brand" onclick="Varejo.removeSelectedCardBrandForPayment()" style="display:none; width:100%; margin-bottom: 8px; text-transform: uppercase; font-weight: 800; font-size: 0.8rem;">
        <i class="ri-close-circle-line"></i> Remover Bandeira
    </button>`);

// 2. Modificar selectCardBrandForPayment (ambos)
const selectCardRegex = /selectCardBrandForPayment:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?(?=,\s*renderPaymentCardBrands)/g;
content = content.replace(selectCardRegex, `selectCardBrandForPayment: (index) => {
        const brands = Varejo.getCardBrands();
        const brand = brands[index];
        if(!brand) return;
        
        // Remove active class from all
        document.querySelectorAll('.pay-brand-btn').forEach(b => {
            b.style.borderColor = 'var(--pos-border)';
            b.style.background = 'rgba(255,255,255,0.05)';
        });
        
        // Add active class to selected
        const btn = document.getElementById('btn-brand-' + index) || document.getElementById('btn-brand-0-' + index) || document.getElementById('btn-brand-1-' + index);
        if(btn) {
            btn.style.borderColor = 'var(--pos-accent)';
            btn.style.background = 'rgba(0,0,0,0.3)';
        }

        Varejo.state.selectedBrand = brand;
        document.querySelectorAll('.btn-remove-brand').forEach(b => b.style.display = 'block');
        
        Varejo.calcRestante();
        App.utils.toast(\`Bandeira \${brand.name} selecionada.\`, 'success');
    },
    removeSelectedCardBrandForPayment: () => {
        Varejo.state.selectedBrand = null;
        document.querySelectorAll('.pay-brand-btn').forEach(b => {
            b.style.borderColor = 'var(--pos-border)';
            b.style.background = 'rgba(255,255,255,0.05)';
        });
        document.querySelectorAll('.btn-remove-brand').forEach(b => b.style.display = 'none');
        Varejo.calcRestante();
        App.utils.toast('Bandeira removida', 'info');
    }`);

// 3. Modificar calcRestante (ambos)
const calcRestanteRegex = /calcRestante:\s*\(\)\s*=>\s*\{\s*const total = Varejo\.state\.totalTicket;\s*const paid = \['pay-money', 'pay-pix', 'pay-credit', 'pay-debit', 'pay-crediario'\]\.reduce\(\(a, id\) => a \+ \(parseFloat\(document\.getElementById\(id\)\.value\) \|\| 0\), 0\);\s*const desc = parseFloat\(document\.getElementById\('pay-desconto'\)\.value\) \|\| 0;\s*const res = total - \(paid \+ desc\);/g;

content = content.replace(calcRestanteRegex, `calcRestante: () => {
        let total = Varejo.state.totalTicket;
        
        let brandDiscountVal = 0;
        if (Varejo.state.selectedBrand && Varejo.state.selectedBrand.discount > 0) {
            brandDiscountVal = (total * Varejo.state.selectedBrand.discount) / 100;
            total -= brandDiscountVal;
        }

        const paid = ['pay-money', 'pay-pix', 'pay-credit', 'pay-debit', 'pay-crediario'].reduce((a, id) => a + (parseFloat(document.getElementById(id)?.value) || 0), 0);
        const desc = parseFloat(document.getElementById('pay-desconto')?.value) || 0;
        const res = total - (paid + desc);
        
        const totalDisplays = document.querySelectorAll('#pos-pay-total');
        totalDisplays.forEach(td => td.innerText = total.toFixed(2));
`);

fs.writeFileSync('js/varejo_final.js', content);
console.log('Script executado com sucesso.');
