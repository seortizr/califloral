module.exports = (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "califloral",
    vercel: Boolean(process.env.VERCEL),
  });
};
