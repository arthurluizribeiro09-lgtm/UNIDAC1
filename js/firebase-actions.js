// =====================================================
// Ações de botões → Firebase (tempo real)
// =====================================================

function pageName() {
  var p = (location.pathname || "").split("/").pop() || "";
  return p.replace(".html", "").toLowerCase();
}

function toast(msg) {
  if (typeof showAppToast === "function") return showAppToast(msg);
  if (typeof showToast === "function") return showToast(msg);
  console.log(msg);
}

function val(id) {
  var el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function num(id) {
  var v = Number(String(val(id)).replace(",", "."));
  return isNaN(v) ? 0 : v;
}

// -------------------- USUÁRIOS --------------------
async function loadUsersTable() {
  var tbody = document.querySelector("#users-table, #usersTable, table tbody");
  if (!tbody || typeof getUsers !== "function") return;

  var list = await getUsers();
  tbody.innerHTML = list
    .map(function (u) {
      return (
        "<tr data-id=\"" + (u.id || "") + "\">" +
        "<td>" + (u.name || "") + "</td>" +
        "<td>" + (u.email || "") + "</td>" +
        "<td>" + (u.role || "") + "</td>" +
        "<td>" +
        "<button type=\"button\" class=\"btn btn-sm\" data-edit-user=\"" + (u.id || "") + "\">Editar</button> " +
        "<button type=\"button\" class=\"btn btn-sm\" data-del-user=\"" + (u.id || "") + "\">Excluir</button>" +
        "</td></tr>"
      );
    })
    .join("");

  var count = document.getElementById("userCount");
  if (count) count.textContent = String(list.length);
}

async function saveUserFromModal() {
  var name = val("user-name");
  var email = val("user-email").toLowerCase();
  var role = val("user-role").toLowerCase() || "funcionario";
  var editingId = window.__editingUserId || null;

  if (!name || !email) {
    toast("Preencha nome e e-mail.");
    return;
  }

  if (editingId) {
    await updateDocument("users", editingId, { name: name, email: email, role: role, active: true });
    toast("Usuário atualizado no Firebase.");
  } else {
    // Senha inicial padrão (pode ser trocada no Authentication)
    var initialPassword = "123456";

    // 1) Cria no Authentication (app secundário = não desloga o admin)
    if (typeof createAuthUser === "function") {
      try {
        var created = await createAuthUser(email, initialPassword);
        if (created) {
          toast("Auth criado. Senha inicial: " + initialPassword);
        } else {
          toast("E-mail já existe no Authentication. Perfil será salvo mesmo assim.");
        }
      } catch (err) {
        console.error(err);
        toast("Aviso Auth: " + (err.message || err));
      }
    }

    // 2) Cria perfil no Firestore (sem senha)
    await addDocument("users", {
      name: name,
      email: email,
      role: role,
      active: true
    });
    toast("Usuário cadastrado (Auth + perfil Firestore).");
  }

  window.__editingUserId = null;
  var modal = document.getElementById("user-modal");
  if (modal) modal.classList.remove("show");
  await loadUsersTable();
}

// -------------------- FINANCEIRO --------------------
async function saveFinancialMovement() {
  var tipo = val("tipoMovimentacao") || "despesa";
  var descricao = val("descricaoMovimentacao");
  var valor = num("valorMovimentacao");
  var data = val("dataMovimentacao") || new Date().toISOString().slice(0, 10);

  if (!descricao || !valor) {
    toast("Preencha descrição e valor.");
    return;
  }

  await addDocument("financial_movements", {
    type: tipo,
    description: descricao,
    amount: valor,
    date: data
  });

  toast("Movimentação financeira salva no Firebase.");
  var modal = document.getElementById("movimentacaoModal");
  if (modal) modal.classList.remove("show");

  // tenta recarregar lista se existir
  var tbody = document.querySelector("#movimentacoes-body, #finance-body");
  if (tbody && typeof listenCollection === "function") {
    // one-shot refresh
    var list = await getCollection("financial_movements");
    tbody.innerHTML = list
      .map(function (m) {
        return (
          "<tr><td>" + (m.date || "") + "</td><td>" + (m.type || "") +
          "</td><td>" + (m.description || "") + "</td><td>R$ " +
          Number(m.amount || 0).toLocaleString("pt-BR") + "</td></tr>"
        );
      })
      .join("");
  }
}

// -------------------- ESTOQUE --------------------
async function refreshStockUI() {
  if (typeof getStock === "function" && typeof renderStock === "function") {
    renderStock(await getStock());
  }
}

async function saveProductEstoque() {
  var name = val("product-name");
  var unit = val("product-unit") || "Un";
  var quantity = num("product-quantity");
  var minimum = num("product-minimum");
  var category = val("product-category");
  var price = num("product-price");
  var expiry = val("product-expiry");

  if (!name) {
    toast("Informe o nome do produto.");
    return;
  }

  await addDocument("products", {
    name: name,
    unit: unit,
    minStock: minimum,
    category: category,
    price: price,
    active: true
  });

  var status = quantity <= minimum ? "Estoque baixo" : "Estável";
  await addDocument("stock", {
    name: name,
    quantity: quantity,
    status: status,
    expiry: expiry || null
  });

  if (expiry) {
    await addDocument("product_batches", {
      productName: name,
      quantity: quantity,
      expiry_date: expiry,
      unit: unit
    });
  }

  toast("Produto cadastrado no Firebase.");
  var modal = document.getElementById("product-modal");
  if (modal) modal.classList.remove("show");
  await refreshStockUI();
}

async function doStockMovement(type) {
  var typeEl = document.getElementById("movement-type");
  if (typeEl && type) typeEl.value = type;

  var t = typeEl ? typeEl.value : type || "entrada";
  var qty = num("movement-quantity");
  var name = typeof currentProduct === "string" ? currentProduct : "";
  var label = document.getElementById("movement-product");
  if (!name && label) name = (label.textContent || "").replace("Produto selecionado:", "").trim();

  if (typeof applyStockMovement === "function") {
    var ok = await applyStockMovement(null, name, t, qty);
    if (ok) {
      var modal = document.getElementById("movement-modal");
      if (modal) modal.classList.remove("show");
    }
  }
}

// -------------------- DESPERDÍCIO --------------------
async function registerWasteOccurrence() {
  // Abre prompt simples se não houver form dedicado
  var qty = prompt("Quantidade desperdiçada (kg ou un):");
  if (qty === null) return;
  qty = Number(String(qty).replace(",", "."));
  if (!qty || qty <= 0) {
    toast("Quantidade inválida.");
    return;
  }
  var shift = prompt("Turno (manhã/tarde/noite):", "tarde") || "tarde";
  var notes = prompt("Observação (opcional):", "") || "";

  await addDocument("waste", {
    date: new Date().toISOString().slice(0, 10),
    quantity: qty,
    shift: shift,
    notes: notes
  });

  toast("Ocorrência de desperdício registrada no Firebase.");
}

// -------------------- COMPRAS --------------------
async function savePurchaseOrder() {
  var supplier = val("supplier");
  var amount = num("amount");
  if (!supplier) {
    var inputs = document.querySelectorAll("#purchase-modal input");
    if (inputs[0] && !supplier) supplier = inputs[0].value.trim();
    if (inputs[1] && !amount) amount = Number(String(inputs[1].value).replace(",", ".")) || 0;
  }
  if (!supplier) {
    toast("Informe o fornecedor.");
    return;
  }

  await addDocument("purchases", {
    code: "#" + Date.now().toString().slice(-5),
    supplier: supplier,
    date: new Date().toISOString().slice(0, 10),
    total: amount,
    status: "Pendente"
  });

  toast("Pedido de compra salvo no Firebase.");
  var modal = document.getElementById("purchase-modal");
  if (modal) modal.classList.remove("show");
}

// -------------------- VALIDADES --------------------
async function saveValidityProduct() {
  var name = val("product-name");
  var quantity = num("product-quantity");
  var unit = val("product-unit") || "Un";
  var date = val("product-date");

  if (!name || !date) {
    toast("Informe produto e data de validade.");
    return;
  }

  await addDocument("product_batches", {
    productName: name,
    quantity: quantity,
    unit: unit,
    expiry_date: date
  });

  // também reflete no stock se já existir
  try {
    var stock = await getStock();
    var item = stock.find(function (s) {
      return (s.name || "").toLowerCase() === name.toLowerCase();
    });
    if (item) {
      await updateDocument("stock", item.id, {
        name: item.name,
        quantity: item.quantity,
        status: "Validade próxima",
        expiry: date
      });
    } else {
      await addDocument("stock", {
        name: name,
        quantity: quantity,
        status: "Validade próxima",
        expiry: date
      });
    }
  } catch (e) {
    console.warn(e);
  }

  toast("Produto com validade salvo no Firebase.");
  var modal = document.getElementById("validity-modal");
  if (modal) modal.classList.remove("show");
}

// -------------------- METAS --------------------
async function saveGoalChallenge() {
  var title = prompt("Título do desafio/meta:");
  if (!title) return;
  var target = prompt("Valor alvo (número):", "30");
  var unit = prompt("Unidade (% , kg, un...):", "%") || "%";
  var deadline = prompt("Data limite (AAAA-MM-DD):", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));

  await addDocument("goals", {
    title: title.trim(),
    targetValue: Number(target) || 0,
    currentValue: 0,
    unit: unit,
    deadline: deadline || null,
    status: "em_andamento"
  });

  toast("Desafio/meta criado no Firebase.");
}

// -------------------- BIND GLOBAL --------------------
function bindPageActions() {
  var page = pageName();

  document.addEventListener(
    "click",
    function (e) {
      var btn = e.target.closest("button, a");
      if (!btn) return;
      var text = (btn.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

      // USUÁRIOS
      if (text.indexOf("novo usuário") !== -1 || text.indexOf("novo usuario") !== -1) {
        window.__editingUserId = null;
        // deixa o modal abrir pelo script da página; só garante id
        return;
      }
      if (text === "salvar usuário" || text === "salvar usuario") {
        e.preventDefault();
        e.stopPropagation();
        saveUserFromModal().catch(function (err) {
          toast("Erro: " + (err.message || err));
        });
        return;
      }
      if (btn.getAttribute("data-edit-user")) {
        e.preventDefault();
        window.__editingUserId = btn.getAttribute("data-edit-user");
        // preenche modal se possível
        var row = btn.closest("tr");
        if (row) {
          var cells = row.querySelectorAll("td");
          if (cells[0]) document.getElementById("user-name") && (document.getElementById("user-name").value = cells[0].textContent.trim());
          if (cells[1]) document.getElementById("user-email") && (document.getElementById("user-email").value = cells[1].textContent.trim());
          if (cells[2]) document.getElementById("user-role") && (document.getElementById("user-role").value = cells[2].textContent.trim());
          var modal = document.getElementById("user-modal");
          if (modal) modal.classList.add("show");
          var title = document.getElementById("user-modal-title");
          if (title) title.textContent = "Editar usuário";
        }
        return;
      }
      if (btn.getAttribute("data-del-user") || text === "excluir") {
        if (page === "usuarios" || btn.getAttribute("data-del-user")) {
          e.preventDefault();
          e.stopPropagation();
          var id = btn.getAttribute("data-del-user");
          if (!id) {
            var tr = btn.closest("tr");
            id = tr ? tr.getAttribute("data-id") : null;
          }
          if (!id) {
            toast("ID do usuário não encontrado.");
            return;
          }
          if (!confirm("Excluir este usuário do Firebase?")) return;
          deleteDocument("users", id)
            .then(function () {
              toast("Usuário excluído.");
              return loadUsersTable();
            })
            .catch(function (err) {
              toast("Erro ao excluir: " + (err.message || err));
            });
          return;
        }
      }

      // FINANCEIRO
      if (text.indexOf("salvar movimentação") !== -1 || text.indexOf("salvar movimentacao") !== -1) {
        e.preventDefault();
        e.stopPropagation();
        saveFinancialMovement().catch(function (err) {
          toast("Erro: " + (err.message || err));
        });
        return;
      }

      // ESTOQUE
      if (text.indexOf("atualizar") !== -1 && (page === "estoque" || page === "validades")) {
        e.preventDefault();
        refreshStockUI().then(function () {
          toast("Dados atualizados do Firebase.");
        });
        return;
      }
      if (text.indexOf("novo produto") !== -1) {
        // modal da página
        return;
      }
      if (text === "entrada" || text.indexOf("entrada") !== -1 && btn.id === "quick-entry") {
        // abre modal com tipo entrada - página já faz; só garante
        var mt = document.getElementById("movement-type");
        if (mt) mt.value = "entrada";
        return;
      }
      if (text === "saída" || text === "saida" || (text.indexOf("saída") !== -1 && btn.id === "quick-exit")) {
        var mt2 = document.getElementById("movement-type");
        if (mt2) mt2.value = "saida";
        return;
      }
      if (text.indexOf("inventário") !== -1 || text.indexOf("inventario") !== -1) {
        e.preventDefault();
        refreshStockUI().then(function () {
          toast("Inventário carregado do Firebase.");
          var search = document.querySelector('input[placeholder*="Pesquisar"], input[placeholder*="pesquisar"]');
          if (search) search.focus();
        });
        return;
      }
      if (text.indexOf("histórico") !== -1 || text.indexOf("historico") !== -1) {
        e.preventDefault();
        getCollection("stock_movements").then(function (list) {
          var msg = list
            .slice(0, 15)
            .map(function (m) {
              return (m.type || "") + " | " + (m.productName || "") + " | qtd " + (m.quantity || "");
            })
            .join("\n");
          alert(msg || "Nenhuma movimentação registrada.");
        });
        return;
      }
      if (text.indexOf("relatório") !== -1 || text.indexOf("relatorio") !== -1) {
        if (page === "estoque") {
          e.preventDefault();
          Promise.all([getStock(), getCollection("stock_movements")]).then(function (arr) {
            alert(
              "Itens em estoque: " + arr[0].length +
              "\nMovimentações: " + arr[1].length
            );
          });
          return;
        }
      }

      // DESPERDÍCIO
      if (text.indexOf("registrar ocorrência") !== -1 || text.indexOf("registrar ocorrencia") !== -1) {
        e.preventDefault();
        e.stopPropagation();
        registerWasteOccurrence().catch(function (err) {
          toast("Erro: " + (err.message || err));
        });
        return;
      }

      // COMPRAS
      if (text.indexOf("salvar pedido") !== -1) {
        e.preventDefault();
        e.stopPropagation();
        savePurchaseOrder().catch(function (err) {
          toast("Erro: " + (err.message || err));
        });
        return;
      }

      // VALIDADES — esconde "Adicionar validade", usa Adicionar produto
      if (text.indexOf("adicionar validade") !== -1) {
        e.preventDefault();
        e.stopPropagation();
        toast("Use o botão Adicionar produto.");
        return;
      }
      if (text.indexOf("salvar produto") !== -1 && page === "validades") {
        e.preventDefault();
        e.stopPropagation();
        saveValidityProduct().catch(function (err) {
          toast("Erro: " + (err.message || err));
        });
        return;
      }
      if (text.indexOf("adicionar produto") !== -1 && page === "validades") {
        // deixa abrir modal; só ajusta título
        setTimeout(function () {
          var t = document.getElementById("modal-title");
          if (t) t.textContent = "Adicionar produto";
        }, 50);
        return;
      }

      // METAS
      if (text.indexOf("novo desafio") !== -1) {
        e.preventDefault();
        e.stopPropagation();
        saveGoalChallenge().catch(function (err) {
          toast("Erro: " + (err.message || err));
        });
        return;
      }
    },
    true
  );

  // Submit product-form estoque
  document.addEventListener(
    "submit",
    function (e) {
      var form = e.target;
      if (!form || form.tagName !== "FORM") return;
      if (form.id === "product-form") {
        e.preventDefault();
        e.stopPropagation();
        saveProductEstoque().catch(function (err) {
          toast("Erro: " + (err.message || err));
        });
      }
      if (form.id === "validity-form") {
        e.preventDefault();
        e.stopPropagation();
        saveValidityProduct().catch(function (err) {
          toast("Erro: " + (err.message || err));
        });
      }
    },
    true
  );

  // Página usuários: carrega do Firebase
  if (page === "usuarios") {
    setTimeout(function () {
      loadUsersTable().catch(function (err) {
        console.error(err);
      });
    }, 600);
  }

  // Remove botão "Adicionar validade" na página validades
  if (page === "validades") {
    setTimeout(function () {
      document.querySelectorAll("button, a").forEach(function (el) {
        var t = (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (t.indexOf("adicionar validade") !== -1) {
          el.style.display = "none";
        }
      });
    }, 300);
  }

  // Barra de pesquisa estoque
  if (page === "estoque") {
    setTimeout(function () {
      var search = document.querySelector('input[placeholder*="Pesquisar"], input[placeholder*="pesquisar"]');
      if (search) {
        search.addEventListener("input", function () {
          var q = search.value.toLowerCase();
          document.querySelectorAll("#stock-body tr").forEach(function (tr) {
            var txt = (tr.textContent || "").toLowerCase();
            tr.style.display = txt.indexOf(q) !== -1 ? "" : "none";
          });
        });
      }
    }, 800);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(bindPageActions, 500);
});


// Binds por ID (mais confiáveis)
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    var saveUser = document.getElementById("save-user");
    if (saveUser) {
      saveUser.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        saveUserFromModal().catch(function (err) {
          toast("Erro: " + (err.message || err));
        });
      });
    }
    var addUser = document.getElementById("addUser");
    if (addUser) {
      addUser.addEventListener("click", function () {
        window.__editingUserId = null;
      });
    }
  }, 700);
});
