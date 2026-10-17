$content = Get-Content -Path "js\varejo_final.js" -Raw

# 1. Aumentar janela (1400px e 1300px)
$content = $content -replace '<div class="modal-content" style="width: 1400px; max-width: 98vw; border: 1px solid rgba\(255,255,255,0\.15\);">', '<div class="modal-content" style="width: 1600px; max-width: 98vw; min-height: 700px; border: 1px solid rgba(255,255,255,0.15);">'
$content = $content -replace '<div class="modal-content" style="width: 1300px; max-width: 98vw; border: 1px solid rgba\(255,255,255,0\.15\);">', '<div class="modal-content" style="width: 1600px; max-width: 98vw; min-height: 700px; border: 1px solid rgba(255,255,255,0.15);">'

# Adicionar botão de remover bandeira
$content = $content -replace '<button class="btn btn-secondary btn-sm" onclick="Varejo.openSelectCardBrandModal\(\)" style="width:100%; margin-bottom: 8px; text-transform: uppercase; font-weight: 800; font-size: 0.8rem;">\s*<i class="ri-bank-card-line"></i> Selecionar Bandeira do Cartão\s*</button>', '<button class="btn btn-secondary btn-sm" onclick="Varejo.openSelectCardBrandModal()" style="width:100%; margin-bottom: 8px; text-transform: uppercase; font-weight: 800; font-size: 0.8rem;">
                                    <i class="ri-bank-card-line"></i> Selecionar Bandeira do Cartão
                                </button>
                                <button class="btn btn-danger btn-sm btn-remove-brand" onclick="Varejo.removeSelectedCardBrandForPayment()" style="display:none; width:100%; margin-bottom: 8px; text-transform: uppercase; font-weight: 800; font-size: 0.8rem;">
                                    <i class="ri-close-circle-line"></i> Remover Bandeira
                                </button>'

# 2. Modificar selectCardBrandForPayment
# Usaremos replace com multiline no powershell

$regexSelectCard = '(?s)selectCardBrandForPayment:\s*\([^)]*\)\s*=>\s*\{.*?(?=,\s*renderPaymentCardBrands)'
$replacementSelectCard = @'
selectCardBrandForPayment: (index) => {
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
        App.utils.toast(`Bandeira ${brand.name} selecionada.`, 'success');
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
    }
'@

$content = $content -replace $regexSelectCard, $replacementSelectCard

# 3. Modificar calcRestante
$regexCalcRestante = "(?s)calcRestante:\s*\(\)\s*=>\s*\{\s*const total = Varejo\.state\.totalTicket;\s*const paid = \['pay-money', 'pay-pix', 'pay-credit', 'pay-debit', 'pay-crediario'\]\.reduce\(\(a, id\) => a \+ \(parseFloat\(document\.getElementById\(id\)\.value\) \|\| 0\), 0\);\s*const desc = parseFloat\(document\.getElementById\('pay-desconto'\)\.value\) \|\| 0;\s*const res = total - \(paid \+ desc\);"

$replacementCalcRestante = @'
calcRestante: () => {
        let total = Varejo.state.totalTicket;
        
        let brandDiscountVal = 0;
        if (Varejo.state.selectedBrand && Varejo.state.selectedBrand.discount > 0) {
            brandDiscountVal = (total * Varejo.state.selectedBrand.discount) / 100;
            total -= brandDiscountVal;
        }

        const paid = ['pay-money', 'pay-pix', 'pay-credit', 'pay-debit', 'pay-crediario'].reduce((a, id) => {
            const el = document.getElementById(id);
            return a + (el ? (parseFloat(el.value) || 0) : 0);
        }, 0);
        const descEl = document.getElementById('pay-desconto');
        const desc = descEl ? (parseFloat(descEl.value) || 0) : 0;
        const res = total - (paid + desc);
        
        const totalDisplays = document.querySelectorAll('#pos-pay-total');
        totalDisplays.forEach(td => td.innerText = total.toFixed(2));
'@

$content = $content -replace $regexCalcRestante, $replacementCalcRestante

Set-Content -Path "js\varejo_final.js" -Value $content
Write-Host "Script PowerShell executado."
