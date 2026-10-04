// =====================================================
// Firebase - Unidac Industries
// Auth + Firestore (leitura e escrita em tempo real)
// =====================================================
const firebaseConfig = {
  apiKey: "AIzaSyA9en_wwMAqJ-1nrPmWuSelZyqjW1po8Vg",
  authDomain: "unidac-industries.firebaseapp.com",
  projectId: "unidac-industries",
  storageBucket: "unidac-industries.firebasestorage.app",
  messagingSenderId: "747701964546",
  appId: "1:747701964546:web:e0ac8df2da7f655beabc1b",
  measurementId: "G-SEEZ6HNTS8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const VALID_ROLES = [
  "administrador", "gerente", "estoquista", "cozinheira",
  "financeiro", "professor", "aluno", "funcionario"
];

function normalizeRole(role) {
  if (!role) return "";
  var r = String(role).trim().toLowerCase();
  if (r === "admin" || r === "administrator") r = "administrador";
  if (r === "funcionário" || r === "funcionária") r = "funcionario";
  return r;
}

function getSession() {
  try {
    var raw = localStorage.getItem("unidacUser");
    if (!raw) return null;
    var u = JSON.parse(raw);
    if (u && u.role) u.role = normalizeRole(u.role);
    return u;
  } catch (e) {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem("unidacUser", JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem("unidacUser");
}

function goToIndex() {
  window.location.href = new URL("../../index.html", window.location.href).href;
}

function doLogout(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!confirm("Sair do sistema?\nSua sessão será encerrada neste dispositivo.")) return;
  clearSession();
  auth.signOut().finally(function () {
    window.location.href = new URL("../../index.html", window.location.href).href;
  });
}

async function getUserProfileByEmail(email) {
  var snapshot = await db.collection("users").where("email", "==", email).limit(1).get();
  if (snapshot.empty) return null;
  var doc = snapshot.docs[0];
  return Object.assign({ id: doc.id }, doc.data());
}

async function firebaseLogin(email, password) {
  var normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error("Preencha e-mail e senha.");

  var cred;
  try {
    cred = await auth.signInWithEmailAndPassword(normalizedEmail, password);
  } catch (err) {
    var code = err && err.code ? err.code : "";
    if (code === "auth/user-not-found" || code === "auth/invalid-credential" || code === "auth/wrong-password") {
      throw new Error("E-mail ou senha incorretos.");
    }
    if (code === "auth/invalid-email") throw new Error("E-mail inválido.");
    if (code === "auth/too-many-requests") throw new Error("Muitas tentativas. Tente novamente em instantes.");
    throw new Error(err.message || "Erro ao fazer login.");
  }

  var profile = await getUserProfileByEmail(normalizedEmail);
  if (!profile) {
    await auth.signOut();
    throw new Error("Usuário autenticado, mas sem perfil no Firestore (coleção users).");
  }
  if (profile.active === false) {
    await auth.signOut();
    throw new Error("Usuário desativado.");
  }

  var role = normalizeRole(profile.role);
  if (!role || VALID_ROLES.indexOf(role) === -1) {
    await auth.signOut();
    throw new Error("Papel do usuário inválido no Firestore: " + (profile.role || "(vazio)"));
  }

  var session = {
    id: profile.id,
    uid: cred.user.uid,
    name: profile.name || role,
    email: profile.email || normalizedEmail,
    role: role
  };
  saveSession(session);
  return session;
}

// ---------- CRUD Firestore ----------
function withMeta(data) {
  var session = getSession() || {};
  return Object.assign({}, data, {
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: session.email || session.name || "sistema"
  });
}

async function addDocument(collectionName, data) {
  var payload = withMeta(data);
  payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  var ref = await db.collection(collectionName).add(payload);
  return ref.id;
}

async function updateDocument(collectionName, id, data) {
  await db.collection(collectionName).doc(id).set(withMeta(data), { merge: true });
}

async function deleteDocument(collectionName, id) {
  await db.collection(collectionName).doc(id).delete();
}

async function getCollection(name) {
  var snapshot = await db.collection(name).get();
  return snapshot.docs.map(function (doc) {
    return Object.assign({ id: doc.id }, doc.data());
  });
}

/** Escuta em tempo real */
function listenCollection(name, callback) {
  return db.collection(name).onSnapshot(
    function (snapshot) {
      var list = snapshot.docs.map(function (doc) {
        return Object.assign({ id: doc.id }, doc.data());
      });
      callback(list);
    },
    function (err) {
      console.error("Erro listener " + name + ":", err);
    }
  );
}

async function getNotifications() { return getCollection("notifications"); }
async function getStock() { return getCollection("stock"); }
async function getProducts() { return getCollection("products"); }
async function getPurchases() { return getCollection("purchases"); }
async function getWaste() { return getCollection("waste"); }
async function getGoals() { return getCollection("goals"); }
async function getUsers() { return getCollection("users"); }

/**
 * Cria usuário no Authentication sem derrubar a sessão do admin logado.
 * Usa um app Firebase secundário.
 */
async function createAuthUser(email, password) {
  var secondary;
  try {
    secondary = firebase.initializeApp(firebaseConfig, "SecondaryApp-" + Date.now());
    await secondary.auth().createUserWithEmailAndPassword(email, password);
    await secondary.auth().signOut();
    return true;
  } catch (err) {
    if (err && err.code === "auth/email-already-in-use") {
      return false; // já existe
    }
    throw err;
  } finally {
    try {
      if (secondary) await secondary.delete();
    } catch (e) {}
  }
}

