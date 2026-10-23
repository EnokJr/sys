/* ═══════════════════════════════════════════════
   SHEYLA CORE v2 — núcleo da Primordial
   Login Google, isolamento por usuário, sync e resumos.
   Todo dado fica em users/{uid}/{appId}/data
═══════════════════════════════════════════════ */
(function () {
  "use strict";

  var VERSION = "2";
  var FB = "https://cdn.jsdelivr.net/npm/firebase@10.12.2/";
  var CFG = {
    apiKey: "AIzaSyAGzRK009HOKHrsIG5bSHDNYF7hUia6CX4",
    authDomain: "sys-universosheylas.firebaseapp.com",
    projectId: "sys-universosheylas",
    storageBucket: "sys-universosheylas.firebasestorage.app",
    messagingSenderId: "207009581720",
    appId: "1:207009581720:web:d483f1ed883b1068f41eed"
  };
  var SUMMARY_KEYS = { sdc: "sdc_summary", forjadora: "forj_summary" };

  var auth = null, db = null, user = null, appId = null, bootP = null;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error("Falha ao carregar " + src)); };
      document.head.appendChild(s);
    });
  }

  function boot() {
    if (bootP) return bootP;
    bootP = (async function () {
      if (!window.firebase) {
        await loadScript(FB + "firebase-app-compat.min.js");
        await loadScript(FB + "firebase-auth-compat.min.js");
        await loadScript(FB + "firebase-firestore-compat.min.js");
      }
      if (!firebase.apps.length) firebase.initializeApp(CFG);
      auth = firebase.auth();
      db = firebase.firestore();
      try { await auth.getRedirectResult(); } catch (e) { console.warn("[Sheyla] redirect", e); }
      user = await new Promise(function (res) {
        var off = auth.onAuthStateChanged(function (u) { off(); res(u); });
      });
      return user;
    })();
    return bootP;
  }

  function docRef(app) {
    if (!user) throw new Error("Sem login");
    return db.collection("users").doc(user.uid).collection(app || appId).doc("data");
  }

  var Sheyla = {
    version: VERSION,

    /* init(appId, { home, requireLogin }) → usuário logado (ou null) */
    init: async function (id, opts) {
      opts = opts || {};
      appId = id;
      var u = await boot();
      var needLogin = opts.requireLogin !== false && id !== "sys";
      if (!u && needLogin) {
        location.replace(opts.home || "index.html");
        return null;
      }
      return u;
    },

    user: function () {
      return user ? { uid: user.uid, name: user.displayName, email: user.email, photo: user.photoURL, displayName: user.displayName, photoURL: user.photoURL } : null;
    },

    signIn: async function () {
      await boot();
      var provider = new firebase.auth.GoogleAuthProvider();
      try {
        var r = await auth.signInWithPopup(provider);
        user = r.user;
      } catch (e) {
        if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
          await auth.signInWithRedirect(provider);
          return null;
        }
        throw e;
      }
      return Sheyla.user();
    },

    signOut: async function () {
      await boot();
      await auth.signOut();
      user = null;
    },

    /* load(chave?) → valor da chave, ou o documento inteiro */
    load: async function (key) {
      await boot();
      var snap = await docRef().get();
      if (!snap.exists) return null;
      var d = snap.data();
      return key ? (d[key] === undefined ? null : d[key]) : d;
    },

    /* save(chave, valor) ou save(objeto) → grava só no caminho da própria irmã */
    save: async function (key, value) {
      await boot();
      var patch = {};
      if (key && typeof key === "object") patch = key; else patch[key] = value;
      patch._savedAt = Date.now();
      patch._updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await docRef().set(patch, { merge: true });
    },

    /* summary(obj) → resumo que a Primordial exibe (local + nuvem) */
    summary: async function (obj) {
      var key = SUMMARY_KEYS[appId] || (appId + "_summary");
      var data = Object.assign({}, obj, { updatedAt: Date.now() });
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
      try {
        await boot();
        if (user) {
          var s = {}; s[appId] = data;
          await db.collection("users").doc(user.uid).collection("sys").doc("summaries").set(s, { merge: true });
        }
      } catch (e) { console.warn("[Sheyla] summary", e); }
    },

    /* camada 5 (criptografia): reservada, ainda não implementada */
    secure: {
      save: function () { return Promise.reject(new Error("Criptografia ainda não disponível")); },
      load: function () { return Promise.reject(new Error("Criptografia ainda não disponível")); }
    }
  };

  window.Sheyla = Sheyla;
})();
