// =====================================================
// Unidac Industries - Tempo real + gravação no Firestore
// =====================================================

function showAppToast(msg) {
  if (typeof showToast === "function") {
    showToast(msg);
    return;
  }
  var t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function () {
    t.classList.remove("show");
  }, 2800);
}

function renderNotifications(list, selector) {
  selector = selector || "#notification-list";
  var container = document.querySelector(selector);
  if (!container) return;

  if (!list.length) {
    container.innerHTML =
      '<div class="list-item"><div><strong>Nenhuma notificação</strong></div></div>';
    return;
  }

  container.innerHTML = list
    .map(function (n) {
      var icon =
        n.severity === "danger" ? "⚠" :
        n.severity === "warn" ? "⏰" :
        n.severity === "ok" ? "✓" : "✦";
      var cls = n.severity || "info";
      return (
        '<div class="list-item" data-id="' + (n.id || "") + '">' +
        '<div class="list-icon ' + cls + '">' + icon + "</div>" +
        "<div><strong>" + (n.title || "") + "</strong><p>" + (n.message || "") + "</p></div></div>"
      );
    })
    .join("");
}

function renderStock(list, selector) {
  selector = selector || "#stock-body";
  var tbody = document.querySelector(selector);
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5">Nenhum item no estoque</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map(function (item) {
      var status = item.status || "";
      var statusCls =
        status.indexOf("baixo") !== -1 || status.indexOf("Validade") !== -1
          ? "danger-b"
          : status.indexOf("Atenção") !== -1
          ? "warn"
          : "ok";
      return (
        '<tr data-id="' + (item.id || "") + '">' +
        "<td><strong>" + (item.name || "") + "</strong></td>" +
        "<td>" + (item.quantity != null ? item.quantity : "") + "</td>" +
        '<td><span class="badge ' + statusCls + '">' + status + "</span></td>" +
        "<td>—</td>" +
        '<td><button class="btn btn-sm" type="button" data-move="' +
        (item.name || "") +
        '" data-id="' + (item.id || "") +
        '">Movimentar</button></td></tr>'
      );
    })
    .join("");
}

function renderPurchases(list, selector) {
  selector = selector || "#purchases-body";
  var tbody = document.querySelector(selector);
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5">Nenhuma compra registrada</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map(function (p) {
      return (
        '<tr data-id="' + (p.id || "") + '">' +
        "<td><strong>" + (p.code || "") + "</strong></td>" +
        "<td>" + (p.supplier || "") + "</td>" +
        "<td>" + (p.date || "") + "</td>" +
        "<td>R$ " + Number(p.total || 0).toLocaleString("pt-BR") + "</td>" +
        '<td><span class="badge">' + (p.status || "") + "</span></td></tr>"
      );
    })
    .join("");
}

function startRealtimeListeners() {
  if (typeof listenCollection !== "function") return;

  if (document.querySelector("#notification-list")) {
    listenCollection("notifications", function (list) {
      renderNotifications(list);
    });
  }
  if (document.querySelector("#stock-body")) {
    listenCollection("stock", function (list) {
      renderStock(list);
    });
  }
  if (document.querySelector("#purchases-body")) {
    listenCollection("purchases", function (list) {
      renderPurchases(list);
    });
  }
}

// ---------- Gravação a partir dos formulários da interface ----------

async function saveProductFromForm(form) {
  var nameEl = form.querySelector("#product-name, [name='product-name'], [name='name']");
  var qtyEl = form.querySelector("#product-qty, #product-quantity, [name='quantity']");
  var unitEl = form.querySelector("#product-unit, [name='unit']");
  var statusEl = form.querySelector("#product-status, [name='status']");

  var name = nameEl ? nameEl.value.trim() : "";
  if (!name) {
    showAppToast("Informe o nome do produto.");
    return false;
  }

  var quantity = qtyEl ? Number(qtyEl.value) : 0;
  var unit = unitEl ? unitEl.value.trim() : "Un";
  var status = statusEl ? statusEl.value.trim() : "Estável";

  await addDocument("products", {
    name: name,
    unit: unit || "Un",
    minStock: 0,
    active: true
  });

  await addDocument("stock", {
    name: name,
    quantity: isNaN(quantity) ? 0 : quantity,
    status: status || "Estável"
  });

  showAppToast("Produto \"" + name + "\" salvo no Firebase.");
  return true;
}

async function savePurchaseFromForm(form) {
  var codeEl = form.querySelector("#purchase-code, [name='code']");
  var supplierEl = form.querySelector("#purchase-supplier, [name='supplier']");
  var totalEl = form.querySelector("#purchase-total, [name='total']");
  var statusEl = form.querySelector("#purchase-status, [name='status']");
  var dateEl = form.querySelector("#purchase-date, [name='date']");

  var code = codeEl ? codeEl.value.trim() : "";
  var supplier = supplierEl ? supplierEl.value.trim() : "";
  var total = totalEl ? Number(String(totalEl.value).replace(",", ".")) : 0;
  var status = statusEl ? statusEl.value.trim() : "Pendente";
  var date = dateEl ? dateEl.value : new Date().toISOString().slice(0, 10);

  if (!code && !supplier) {
    // tenta campos genéricos do modal
    var inputs = form.querySelectorAll("input, select");
    if (inputs.length) {
      if (!code && inputs[0]) code = inputs[0].value.trim();
      if (!supplier && inputs[1]) supplier = inputs[1].value.trim();
    }
  }

  if (!supplier && !code) {
    showAppToast("Preencha os dados da compra.");
    return false;
  }

  await addDocument("purchases", {
    code: code || ("#" + Date.now().toString().slice(-4)),
    supplier: supplier || "—",
    date: date,
    total: isNaN(total) ? 0 : total,
    status: status || "Pendente"
  });

  showAppToast("Compra registrada no Firebase.");
  return true;
}

async function saveWasteFromForm(form) {
  var qtyEl = form.querySelector("#waste-qty, #waste-quantity, [name='quantity']");
  var shiftEl = form.querySelector("#waste-shift, [name='shift']");
  var dateEl = form.querySelector("#waste-date, [name='date']");
  var notesEl = form.querySelector("#waste-notes, [name='notes']");

  var quantity = qtyEl ? Number(qtyEl.value) : 0;
  if (!quantity || quantity <= 0) {
    // fallback: primeiro number do form
    var num = form.querySelector('input[type="number"]');
    quantity = num ? Number(num.value) : 0;
  }
  if (!quantity || quantity <= 0) {
    showAppToast("Informe a quantidade de desperdício.");
    return false;
  }

  await addDocument("waste", {
    date: dateEl && dateEl.value ? dateEl.value : new Date().toISOString().slice(0, 10),
    quantity: quantity,
    shift: shiftEl ? shiftEl.value : "tarde",
    notes: notesEl ? notesEl.value : ""
  });

  showAppToast("Desperdício registrado no Firebase.");
  return true;
}

async function saveNotificationFromForm(form) {
  var titleEl = form.querySelector("#notif-title, [name='title']");
  var msgEl = form.querySelector("#notif-message, [name='message']");
  var sevEl = form.querySelector("#notif-severity, [name='severity']");

  var title = titleEl ? titleEl.value.trim() : "";
  var message = msgEl ? msgEl.value.trim() : "";
  if (!title && !message) {
    var texts = form.querySelectorAll("input[type='text'], textarea");
    if (texts[0]) title = texts[0].value.trim();
    if (texts[1]) message = texts[1].value.trim();
  }
  if (!title) {
    showAppToast("Informe o título da notificação.");
    return false;
  }

  await addDocument("notifications", {
    title: title,
    message: message || "",
    severity: sevEl ? sevEl.value : "info",
    read: false
  });

  showAppToast("Notificação salva no Firebase.");
  return true;
}

async function saveUserFromForm(form) {
  var nameEl = form.querySelector("#user-name, [name='name']");
  var emailEl = form.querySelector("#user-email, [name='email']");
  var roleEl = form.querySelector("#user-role, [name='role']");

  var name = nameEl ? nameEl.value.trim() : "";
  var email = emailEl ? emailEl.value.trim().toLowerCase() : "";
  var role = roleEl ? roleEl.value.trim().toLowerCase() : "";

  if (!name || !email) {
    showAppToast("Preencha nome e e-mail do usuário.");
    return false;
  }

  await addDocument("users", {
    name: name,
    email: email,
    role: role || "funcionario",
    active: true
  });

  showAppToast("Usuário salvo no Firestore (perfil). Crie a senha no Authentication.");
  return true;
}

async function saveGoalFromForm(form) {
  var titleEl = form.querySelector("#goal-title, [name='title']");
  var targetEl = form.querySelector("#goal-target, [name='target']");
  var currentEl = form.querySelector("#goal-current, [name='current']");

  var title = titleEl ? titleEl.value.trim() : "";
  if (!title) {
    var t = form.querySelector("input[type='text']");
    title = t ? t.value.trim() : "";
  }
  if (!title) {
    showAppToast("Informe o título da meta.");
    return false;
  }

  await addDocument("goals", {
    title: title,
    targetValue: targetEl ? Number(targetEl.value) || 0 : 0,
    currentValue: currentEl ? Number(currentEl.value) || 0 : 0,
    unit: "%",
    status: "em_andamento"
  });

  showAppToast("Meta salva no Firebase.");
  return true;
}

async function applyStockMovement(productId, productName, type, quantity) {
  quantity = Number(quantity);
  if (!quantity || quantity <= 0) {
    showAppToast("Informe uma quantidade válida.");
    return false;
  }

  var list = await getStock();
  var item = null;
  if (productId) {
    item = list.find(function (x) { return x.id === productId; });
  }
  if (!item && productName) {
    item = list.find(function (x) { return (x.name || "").toLowerCase() === productName.toLowerCase(); });
  }
  if (!item) {
    showAppToast("Produto não encontrado no estoque.");
    return false;
  }

  var current = Number(item.quantity) || 0;
  var next = type === "saida" ? current - quantity : current + quantity;
  if (next < 0) next = 0;

  var status = item.status || "Estável";
  if (next <= 5) status = "Estoque baixo";
  else if (status === "Estoque baixo" && next > 10) status = "Estável";

  await updateDocument("stock", item.id, {
    name: item.name,
    quantity: next,
    status: status
  });

  await addDocument("stock_movements", {
    productId: item.id,
    productName: item.name,
    type: type === "saida" ? "saida" : "entrada",
    quantity: quantity
  });

  showAppToast((type === "saida" ? "Saída" : "Entrada") + " registrada no Firebase.");
  return true;
}

function bindWriteHandlers() {
  // Intercepta submits de formulários conhecidos
  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (!form || form.tagName !== "FORM") return;

      var id = (form.id || "").toLowerCase();
      var action = async function () { return false; };

      if (id.indexOf("product") !== -1 || form.closest("#product-modal")) {
        event.preventDefault();
        action = function () { return saveProductFromForm(form); };
      } else if (id.indexOf("purchase") !== -1 || form.closest("[id*='purchase']")) {
        event.preventDefault();
        action = function () { return savePurchaseFromForm(form); };
      } else if (id.indexOf("waste") !== -1 || id.indexOf("desperd") !== -1) {
        event.preventDefault();
        action = function () { return saveWasteFromForm(form); };
      } else if (id.indexOf("notif") !== -1) {
        event.preventDefault();
        action = function () { return saveNotificationFromForm(form); };
      } else if (id.indexOf("user") !== -1) {
        event.preventDefault();
        action = function () { return saveUserFromForm(form); };
      } else if (id.indexOf("goal") !== -1 || id.indexOf("meta") !== -1) {
        event.preventDefault();
        action = function () { return saveGoalFromForm(form); };
      } else {
        return; // não intercepta formulários desconhecidos
      }

      action()
        .then(function (ok) {
          if (ok) {
            try { form.reset(); } catch (e) {}
            // fecha modal se houver
            var modal = form.closest(".modal-bg, .modal");
            if (modal && modal.classList) modal.classList.remove("show");
            var bg = form.closest(".modal-bg");
            if (bg) bg.classList.remove("show");
          }
        })
        .catch(function (err) {
          console.error(err);
          showAppToast("Erro ao salvar: " + (err.message || "falha no Firebase"));
        });
    },
    true
  );

  // Botões de confirmação de movimentação de estoque
  document.addEventListener("click", function (event) {
    var btn = event.target.closest("button, a");
    if (!btn) return;

    // Confirmar movimentação
    if (btn.id === "confirm-movement" || (btn.textContent || "").trim() === "Confirmar" && btn.closest("#movement-modal")) {
      event.preventDefault();
      var modal = document.getElementById("movement-modal");
      var typeEl = document.getElementById("movement-type");
      var qtyEl = document.getElementById("movement-quantity");
      var productLabel = document.getElementById("movement-product");
      var type = typeEl ? typeEl.value : "entrada";
      var qty = qtyEl ? qtyEl.value : 0;
      var name = "";
      if (productLabel) {
        name = (productLabel.textContent || "").replace("Produto selecionado:", "").trim();
      }
      if (typeof currentProduct === "string") name = currentProduct || name;

      applyStockMovement(null, name, type, qty)
        .then(function (ok) {
          if (ok && modal) modal.classList.remove("show");
        })
        .catch(function (err) {
          showAppToast("Erro: " + (err.message || "falha"));
        });
    }
  });
}

function initLiveData() {
  if (typeof db === "undefined") {
    console.warn("Firebase não inicializado");
    return;
  }
  startRealtimeListeners();
  bindWriteHandlers();
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(initLiveData, 400);
});


// Sobrescreve confirmMovement das páginas para gravar no Firebase
window.confirmMovement = async function () {
  try {
    var typeEl = document.getElementById("movement-type");
    var qtyEl = document.getElementById("movement-quantity");
    var productLabel = document.getElementById("movement-product");
    var type = typeEl ? typeEl.value : "entrada";
    var qty = qtyEl ? qtyEl.value : 0;
    var name = typeof currentProduct === "string" ? currentProduct : "";
    if (!name && productLabel) {
      name = (productLabel.textContent || "").replace("Produto selecionado:", "").trim();
    }
    var ok = await applyStockMovement(null, name, type, qty);
    if (ok) {
      var modal = document.getElementById("movement-modal");
      if (modal) modal.classList.remove("show");
      if (qtyEl) qtyEl.value = "";
      var note = document.getElementById("movement-note");
      if (note) note.value = "";
    }
  } catch (err) {
    console.error(err);
    showAppToast("Erro na movimentação: " + (err.message || ""));
  }
};
