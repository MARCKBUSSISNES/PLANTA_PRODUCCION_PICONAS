// js/tickets.js
console.log("[tickets.js] cargado OK");

// Formateo de dinero
function money(n){
    var v = Number(n || 0);
    return "Q" + v.toFixed(2);
}

// Escape básico HTML
function escapeHtml(str){
    if(!str) return "";
    return String(str)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

// Función global para imprimir ticket de envío
window.imprimirTicketEnvio = function(envio){

    var fecha = new Date(envio.fechaISO);
    var fechaStr = fecha.toLocaleDateString();
    var horaStr = fecha.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

    var rows = "";

    for(var i=0;i<envio.items.length;i++){
        var it = envio.items[i];
        rows += `
            <tr>
                <td class="left">${escapeHtml(it.producto)}</td>
                <td class="right">${it.cantidad}</td>
                <td class="right">${money(it.precio)}</td>
                <td class="right">${money(it.subtotal)}</td>
            </tr>
        `;
    }

    var win = window.open("", "", "width=420,height=800");

    win.document.write(`
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Ticket Envío</title>
            <style>
                @page { 
                    size: 80mm auto; 
                    margin: 6mm; 
                }

                body{
                    font-family: Arial, sans-serif;
                    width: 80mm;
                    font-size: 12px;
                }

                .center{text-align:center;}
                .right{text-align:right;}
                .left{text-align:left;}
                .bold{font-weight:bold;}
                .hr{
                    border-top:1px dashed #000;
                    margin:6px 0;
                }

                table{
                    width:100%;
                    border-collapse:collapse;
                }

                td{
                    padding:2px 0;
                }

                img{
                    max-width:60mm;
                    height:auto;
                }
            </style>
        </head>
        <body>

            <div class="center">
                <img src="assets/LOGO1.png" onerror="this.style.display='none'">
                <div class="bold">LAS PICONAS</div>
                <div>Ticket de Envío</div>
            </div>

            <div class="hr"></div>

            <div><span class="bold">Envío:</span> ${escapeHtml(envio.envioId)}</div>
            <div><span class="bold">Cliente:</span> ${escapeHtml(envio.clienteNombre)}</div>
            <div><span class="bold">Dirección:</span> ${escapeHtml(envio.clienteDireccion)}</div>
            <div><span class="bold">Teléfono:</span> ${escapeHtml(envio.clienteTelefono)}</div>

            <div class="hr"></div>

            <div><span class="bold">Fecha:</span> ${fechaStr}</div>
            <div><span class="bold">Hora:</span> ${horaStr}</div>
            <div><span class="bold">Vehículo:</span> ${escapeHtml(envio.vehiculoPlaca)}</div>
            <div><span class="bold">Piloto:</span> ${escapeHtml(envio.vehiculoPiloto)}</div>

            <div class="hr"></div>

            <table>
                <tr>
                    <td class="left bold">Producto</td>
                    <td class="right bold">Cant</td>
                    <td class="right bold">P/U</td>
                    <td class="right bold">Total</td>
                </tr>
                ${rows}
            </table>

            <div class="hr"></div>

            <div class="right bold">TOTAL: ${money(envio.total)}</div>

            <div class="hr"></div>

            <div class="center">Marck Business © 2026</div>

            <script>
                window.onload = function(){
                    window.focus();
                    window.print();
                }
            <\/script>

        </body>
        </html>
    `);

    win.document.close();
};