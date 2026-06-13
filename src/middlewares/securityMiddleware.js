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

function configureStaticAssets(app) {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(expressSafeParsers());
  app.use(expressStatic(path.join(__dirname, "../public")));
  app.use("/img", expressStatic(path.join(__dirname, "../views/img")));
}

function configureSessionSecurity(app) {
  const store = getSessionStore();

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
      validate: { ip: false },
      keyGenerator: (req) => {
        const forwarded = req.headers["x-forwarded-for"];
        if (typeof forwarded === "string" && forwarded.trim()) {
          return forwarded.split(",")[0].trim();
        }
        return req.ip || "anonymous";
      },
    })
  );

  app.use(csrf());

  app.use((req, res, next) => {
    try {
      res.locals.csrfToken = req.csrfToken();
    } catch {
      res.locals.csrfToken = "";
    }
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

module.exports = {
  configureStaticAssets,
  configureSessionSecurity,
  configureSecurity: (app) => {
    configureStaticAssets(app);
    configureSessionSecurity(app);
  },
  syncSessionStore,
};
