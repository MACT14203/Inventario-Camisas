document.addEventListener('DOMContentLoaded', () => {
    /* ----- IMPORTAR jsPDF ----- */
    const { jsPDF } = window.jspdf;
  
    /* ----- CONFIG ----- */
    const defaultStock = 20;
    const lowThreshold = 10;
    const RESET_CODE   = "Tiendita";      // NUEVO
    const beep = document.getElementById('lowSound');
  
    const products = [
      { id:'yxs',  size:'Youth 2-4 XS', price:10, img:'https://i.imgur.com/bkFw70F.png' },
      { id:'ys',   size:'Youth 6-8 S',  price:10, img:'https://i.imgur.com/FevjnuX.png' },
      { id:'ym',   size:'Youth 10-12 M',price:10, img:'https://i.imgur.com/DcUwkRw.png' },
      { id:'yl',   size:'Youth 14-16 L',price:10, img:'https://i.imgur.com/DbmIpbR.png' },
      { id:'yxl',  size:'Youth 18-20 XL',price:10,img:'https://i.imgur.com/OzjWLWC.png' },
      { id:'as',   size:'Adulto S',     price:10, img:'https://i.imgur.com/gQSkFQs.png' },
      { id:'am',   size:'Adulto M',     price:10, img:'https://i.imgur.com/D3ms9Wq.png' },
      { id:'al',   size:'Adult L',      price:10, img:'https://i.imgur.com/XdxsyQV.png' },
      { id:'axl',  size:'Adult XL',     price:10, img:'https://i.imgur.com/mCZzE1z.png' },
      { id:'axx',  size:'Adult XXL',    price:12, img:'https://i.imgur.com/4mRg77f.png' },
      { id:'axxx', size:'XXXL',         price:14, img:'https://i.imgur.com/rhdYkPu.png'}
    ];
  
    /* ----- STORAGE ----- */
    const STOCK_KEY = 'shirtStock_v5';
    const SALES_KEY = 'shirtSales_v5';
  
    const loadStock = () => JSON.parse(localStorage.getItem(STOCK_KEY)||'null')
          || Object.fromEntries(products.map(p=>[p.id, defaultStock]));
    const saveStock = s => localStorage.setItem(STOCK_KEY, JSON.stringify(s));
    const loadSales = () => JSON.parse(localStorage.getItem(SALES_KEY)||'{}');
    const saveSales = s => localStorage.setItem(SALES_KEY, JSON.stringify(s));
  
    let stock = loadStock();
  
    /* ----- DOM refs ----- */
    const grid   = document.getElementById('grid');
    const banner = document.getElementById('lastTrans');
    const orderModal   = document.getElementById('orderModal');
    const voidModal    = document.getElementById('voidModal');
    const settingsModal= document.getElementById('settingsModal');
  
    const qtyInput = document.getElementById('quantity');
    const totalSpan= document.getElementById('orderTotalAmt');
  
    /* ---------- GRID ---------- */
    const cardMap={};
    renderGrid();
    function renderGrid(){
      grid.innerHTML='';
      products.forEach(p=>{
        const card=document.createElement('div');
        card.className='card'; card.dataset.id=p.id;
        card.innerHTML=`
          <span class="price-tag">$${p.price.toFixed(2)}</span>
          <span class="inv-tag" id="inv-${p.id}">${stock[p.id]}</span>
          <img src="${p.img}" alt="${p.size}">
          <div class="stock-tag">${p.size}</div>`;
        card.addEventListener('click',()=>openSaleModal(p));
        grid.appendChild(card);
        cardMap[p.id]=card.querySelector('.inv-tag');
        updateLow(p.id);
      });
    }
  
    /* ---------- LOW STOCK ---------- */
    function updateLow(id){
      const tag=cardMap[id]; if(!tag) return;
      tag.textContent=stock[id];
      if(stock[id]<lowThreshold){
        if(!tag.classList.contains('low')){
          tag.classList.add('low');
          beep.currentTime=0; beep.play().catch(()=>{});
        }
      }else tag.classList.remove('low');
    }
  
    /* ---------- RESET ---------- */
    document.getElementById('resetBtn').addEventListener('click',()=>{
      const code = prompt("Introduce el código para borrar TODAS las transacciones:");
      if(code === null) return;           // cancelado
      if(code === RESET_CODE){
        localStorage.removeItem(SALES_KEY);
        alert("Transacciones eliminadas. Generarás PDF desde cero.");
      }else{
        alert("Código incorrecto. Nada se borró.");
      }
    });
  
    /* ---------- BANNER ---------- */
    let lastTx=null;
    function showBanner(tx){
      lastTx=tx;
      banner.innerHTML=`
        <span><strong>${tx.type==='void'?'VOID':'VENTA'}</strong> • ${tx.qty} × ${tx.size} • $${Math.abs(tx.total).toFixed(2)}</span>
        <button id="rcptBtn" class="btn pdf">Recibo</button>`;
      banner.classList.remove('hidden');
      document.getElementById('rcptBtn').onclick=()=>downloadReceipt(tx);
      setTimeout(()=>banner.classList.add('hidden'),15000);
    }
  
    function addTx(tx){
      const date=new Date().toISOString().slice(0,10);
      const sales=loadSales();
      if(!sales[date]) sales[date]=[];
      const txFull={...tx,date};
      sales[date].push(txFull); saveSales(sales);
      showBanner(txFull);
    }
  
    /* ---------- SALE MODAL ---------- */
    let currentProd=null;
    function openSaleModal(prod){
      currentProd=prod;
      document.getElementById('modalTitle').textContent=`Registrar venta – ${prod.size}`;
      document.getElementById('orderForm').reset();
      qtyInput.value=1; calcTotal();
      orderModal.style.display='grid';
    }
    document.getElementById('closeOrder').onclick=()=>orderModal.style.display='none';
    window.addEventListener('click',e=>{if(e.target===orderModal)orderModal.style.display='none';});
    qtyInput.addEventListener('input',calcTotal);
    function calcTotal(){totalSpan.textContent=(currentProd.price*(+qtyInput.value||0)).toFixed(2);}
  
    document.getElementById('orderForm').addEventListener('submit',e=>{
      e.preventDefault();
      const qty=+qtyInput.value;
      if(qty<1||qty>stock[currentProd.id]) return alert('Cantidad inválida o sin inventario.');
      stock[currentProd.id]-=qty; saveStock(stock); updateLow(currentProd.id);
  
      const tx={type:'sale',size:currentProd.size,price:currentProd.price,qty,
                customer:document.getElementById('customerName').value.trim(),
                payment:document.getElementById('paymentMethod').value,
                total:currentProd.price*qty};
      addTx(tx);
      confetti({particleCount:200,spread:60,origin:{y:.6}});
      orderModal.style.display='none';
    });
  
    /* ---------- VOID MODAL ---------- */
    const voidSel=document.getElementById('voidSize');
    products.forEach(p=>{
      const o=document.createElement('option');
      o.value=p.id; o.textContent=p.size; voidSel.appendChild(o);
    });
    document.getElementById('voidBtn').onclick=()=>voidModal.style.display='grid';
    document.getElementById('closeVoid').onclick=()=>voidModal.style.display='none';
    window.addEventListener('click',e=>{if(e.target===voidModal)voidModal.style.display='none';});
    document.getElementById('voidForm').addEventListener('submit',e=>{
      e.preventDefault();
      const pid=voidSel.value; const prod=products.find(p=>p.id===pid);
      const qty=+document.getElementById('voidQty').value;
      if(qty<1) return alert('Cantidad inválida.');
      stock[pid]+=qty; saveStock(stock); updateLow(pid);
  
      const tx={type:'void',size:prod.size,price:prod.price,qty,
                customer:document.getElementById('voidCust').value.trim(),
                payment:document.getElementById('voidPay').value,
                total:-prod.price*qty};
      addTx(tx);
      confetti({particleCount:120,spread:50,origin:{y:.6}});
      voidModal.style.display='none';
    });
  
    /* ---------- SETTINGS ---------- */
    const settingsForm=document.getElementById('settingsForm');
    products.forEach(p=>{
      const wrap=document.createElement('label');
      wrap.innerHTML=`${p.size}<input type="number" min="0" id="set-${p.id}" value="${stock[p.id]}">`;
      settingsForm.appendChild(wrap);
    });
    document.getElementById('settingsBtn').onclick=()=>settingsModal.style.display='grid';
    document.getElementById('closeSettings').onclick=()=>settingsModal.style.display='none';
    window.addEventListener('click',e=>{if(e.target===settingsModal)settingsModal.style.display='none';});
    document.getElementById('saveSettings').onclick=()=>{
      products.forEach(p=>{stock[p.id]=+document.getElementById('set-'+p.id).value;updateLow(p.id);});
      saveStock(stock); settingsModal.style.display='none';
    };
  
    /* ---------- PDF DIARIO ---------- */
    document.getElementById('downloadPdf').addEventListener('click',()=>{
      const sales=loadSales(),dates=Object.keys(sales);
      if(!dates.length) return alert('No hay ventas registradas.');
      const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
      doc.setFontSize(16);
      dates.forEach((date,idx)=>{
        if(idx) doc.addPage();
        doc.text(`Resumen – ${date}`,15,18); doc.setFontSize(11);
        let y=28,total=0;
        doc.text('Tipo',15,y);doc.text('Cliente',35,y);doc.text('Size',75,y);
        doc.text('Cant.',105,y);doc.text('Pago',125,y);doc.text('Total($)',160,y,{align:'right'});y+=4;
        sales[date].forEach(s=>{
          doc.text(s.type==='void'?'VOID':'Venta',15,y);
          doc.text(s.customer,35,y);doc.text(s.size,75,y);
          doc.text(String(s.qty),105,y);doc.text(s.payment,125,y);
          doc.text(s.total.toFixed(2),160,y,{align:'right'});
          total+=s.total; y+=4; if(y>260){doc.addPage();y=20;}
        });
        doc.setFontSize(13); doc.text(`BALANCE DÍA: $${total.toFixed(2)}`,15,y+6);
      });
      doc.save('Resumen_Ventas.pdf');
    });
  
    /* ---------- Recibo individual ---------- */
    function downloadReceipt(tx){
      const doc=new jsPDF();
      doc.setFontSize(14);
      doc.text(tx.type==='void'?'RECIBO DE DEVOLUCIÓN':'RECIBO DE VENTA',14,16);
      doc.setFontSize(11);
      const lines=[
        ['Fecha',tx.date],['Cliente',tx.customer],['Talla',tx.size],
        ['Cantidad',String(tx.qty)],['Precio unit.',`$${tx.price.toFixed(2)}`],
        ['Método',tx.payment],['Total',`$${tx.total.toFixed(2)}`]
      ];
      let y=30;
      lines.forEach(([k,v])=>{doc.text(k+':',14,y);doc.text(v,70,y);y+=8;});
      doc.save(`Recibo_${tx.date.replace(/-/g,'')}.pdf`);
    }
  });
  