const { app, initializeApp } = require('../server/app');

module.exports = async function handler(req, res) {
  try {
    await initializeApp();
    return app(req, res);
  } catch (error) {
    console.error('Error al inicializar la aplicación en Vercel:', error);
    if (!res.headersSent) {
      return res.status(500).send('No se pudo iniciar la aplicación. Revisa los Runtime Logs de Vercel.');
    }
    return res.end();
  }
};
