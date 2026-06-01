const path = require("path");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const csrf = require("csurf");
const SequelizeStoreFactory = require("connect-session-sequelize");
const { sequelize } = require("../models");

let sessionStore = null;

function getSessionStore() {
  if (!sessionStore) {
    const SequelizeStore = SequelizeStoreFactory(session.Store);
    sessionStore = new SequelizeStore({ db: sequelize });
  }
  return sessionStore;
}

async function syncSessionStore() {
  const store = getSessionStore();
  await store.sync();
}

function configureSecurity(app) {
  const store = getSessionStore();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(expressSafeParsers());
  app.use(expressStatic(path.join(__dirname, "../public")));
  app.use("/img", expressStatic(path.join(__dirname, "../views/img")));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 2,
      },
      store,
    })
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 250,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(csrf());

  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.currentUser = req.session.user || null;
    next();
  });
}

function expressSafeParsers() {
  const express = require("express");
  return [express.urlencoded({ extended: false }), express.json({ limit: "15kb" })];
}

function expressStatic(publicPath) {
  const express = require("express");
  return express.static(publicPath);
}

module.exports = { configureSecurity, syncSessionStore };
