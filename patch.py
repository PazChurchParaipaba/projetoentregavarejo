import re

file_path = 'js/varejo_final.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Increase modal size further
content = re.sub(
    r'<div class="modal-content" style="width: 1600px; max-width: 98vw; min-height: 700px; border: 1px solid rgba\(255,255,255,0\.15\);">',
    r'<div class="modal-content" style="width: 95vw; max-width: 1800px; height: 90vh; border: 1px solid rgba(255,255,255,0.15); display: flex; flex-direction: column;">',
    content
)

content = re.sub(
    r'<div class="modal-body" style="padding: 0; display: flex; flex-direction: row; min-height: 500px;">',
    r'<div class="modal-body" style="padding: 0; display: flex; flex-direction: row; flex: 1;">',
    content
)

content = re.sub(
    r'<div class="modal-body" style="padding: 0; display: flex; flex-direction: row; min-height: 600px;">',
    r'<div class="modal-body" style="padding: 0; display: flex; flex-direction: row; flex: 1;">',
    content
)

# 2. Update calcRestante to not modify the total display, but add brandDiscount to desc
regex_calcRestante = r"calcRestante: \(\) => \{[\s\S]*?(?=finalizeMultiPayment:)"

replacement_calcRestante = """calcRestante: () => {
        let total = Varejo.state.totalTicket;
        
        let brandDiscountVal = 0;
        if (Varejo.state.selectedBrand && Varejo.state.selectedBrand.discount > 0) {
            brandDiscountVal = (total * Varejo.state.selectedBrand.discount) / 100;
        }

        const paid = ['pay-money', 'pay-pix', 'pay-credit', 'pay-debit', 'pay-crediario'].reduce((a, id) => {
            const el = document.getElementById(id);
            return a + (el ? (parseFloat(el.value) || 0) : 0);
        }, 0);
        const descEl = document.getElementById('pay-desconto');
        const desc = descEl ? (parseFloat(descEl.value) || 0) : 0;
        const totalDiscount = desc + brandDiscountVal;
        
        const res = total - (paid + totalDiscount);
        
        const totalDisplays = document.querySelectorAll('#pos-pay-total');
        totalDisplays.forEach(td => td.innerText = total.toFixed(2));

        const zone = document.getElementById('pay-restante-zone');
        const box = document.getElementById('pay-restante-box');
        const label = document.getElementById('pay-restante-label');
        const btn = document.getElementById('btn-finalizar-venda');

        if (res <= 0.01) {
            if(zone) {
                zone.style.background = "rgba(16, 185, 129, 0.1)";
                zone.style.borderColor = "var(--pos-success)";
            }
            if(label) {
                label.innerHTML = res < -0.01 ? "Troco a Devolver" : `Pagamento Completo ${totalDiscount > 0 ? `<span style="color:#10b981; font-size:0.7rem; margin-left:10px;">(Economia: ${totalDiscount.toFixed(2)})</span>` : ''}`;
                label.style.color = "var(--pos-success)";
            }
            if(box) {
                box.innerText = `${Math.abs(res).toFixed(2)}`;
                box.style.color = "var(--pos-success)";
            }
            if(btn) btn.disabled = false;
        } else {
            if(zone) {
                zone.style.background = "rgba(239, 68, 68, 0.05)";
                zone.style.borderColor = "rgba(239, 68, 68, 0.2)";
            }
            if(label) {
                label.innerHTML = `Restante a Pagar ${totalDiscount > 0 ? `<br><span style="color:#10b981; font-size:0.75rem;">(Dedução Desconto: ${totalDiscount.toFixed(2)})</span>` : ''}`;
                label.style.color = "var(--pos-danger)";
            }
            if(box) {
                box.innerText = `${res.toFixed(2)}`;
                box.style.color = "#fff";
            }
            if(btn) btn.disabled = true;
        }
    },
    
    """

content = re.sub(regex_calcRestante, replacement_calcRestante, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully.")
