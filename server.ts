import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  
  // Allow large JSON payloads for Excel import datasets
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbFile = path.join(dataDir, 'database.json');

  function loadDatabase() {
    try {
      if (fs.existsSync(dbFile)) {
        const raw = fs.readFileSync(dbFile, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error leyendo base de datos en servidor:', e);
    }
    return null;
  }

  function saveDatabase(data: any) {
    try {
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Error guardando base de datos en servidor:', e);
      return false;
    }
  }

  const logoPath = path.join(dataDir, 'logo.png');
  const firmasPath = path.join(dataDir, 'firmas.png');

  // Serve persistent logo directly
  app.get('/api/logo', (req, res) => {
    if (fs.existsSync(logoPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(logoPath);
    } else {
      res.status(404).send('Logo no encontrado');
    }
  });

  // Serve persistent firmas directly
  app.get('/api/firmas', (req, res) => {
    if (fs.existsSync(firmasPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(firmasPath);
    } else {
      res.status(404).send('Firmas no encontradas');
    }
  });

  // Upload logo permanently to disk
  app.post('/api/upload-logo', (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, error: 'No se envió imagen' });
      }

      // If it's a base64 data URL
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(image, 'base64');
      }

      fs.writeFileSync(logoPath, buffer);

      // Also copy to public/logo.png for static fallback
      try {
        const publicLogo = path.resolve(process.cwd(), 'public', 'logo.png');
        fs.writeFileSync(publicLogo, buffer);
      } catch (err) {}

      // Update database.json
      const current = loadDatabase() || {};
      const currentConfig = current.config || {};
      const timestamp = Date.now();
      const logoUrl = `/api/logo?t=${timestamp}`;

      const updated = {
        ...current,
        config: {
          ...currentConfig,
          logoUrl,
        },
        updatedAt: new Date().toISOString(),
      };
      saveDatabase(updated);

      res.json({ success: true, logoUrl });
    } catch (e: any) {
      console.error('Error guardando logo en servidor:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Upload firmas permanently to disk
  app.post('/api/upload-firmas', (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, error: 'No se envió imagen de firmas' });
      }

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(image, 'base64');
      }

      fs.writeFileSync(firmasPath, buffer);

      try {
        const publicFirmas = path.resolve(process.cwd(), 'public', 'firmas.png');
        fs.writeFileSync(publicFirmas, buffer);
      } catch (err) {}

      // Update database.json
      const current = loadDatabase() || {};
      const currentConfig = current.config || {};
      const timestamp = Date.now();
      const firmasUrl = `/api/firmas?t=${timestamp}`;

      const updated = {
        ...current,
        config: {
          ...currentConfig,
          firmasUrl,
        },
        updatedAt: new Date().toISOString(),
      };
      saveDatabase(updated);

      res.json({ success: true, firmasUrl });
    } catch (e: any) {
      console.error('Error guardando firmas en servidor:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // API Endpoints for multi-user synchronization
  app.get('/api/data', (req, res) => {
    const data = loadDatabase();
    res.json({ success: true, data });
  });

  app.post('/api/sync', (req, res) => {
    try {
      const { members, config, theme, password } = req.body;
      const current = loadDatabase() || {};
      
      // Preserve existing logoUrl and firmasUrl if not provided
      let finalConfig = config;
      if (config) {
        finalConfig = { ...config };
        if (!config.logoUrl && current.config && current.config.logoUrl) {
          finalConfig.logoUrl = current.config.logoUrl;
        }
        if (!config.firmasUrl && current.config && current.config.firmasUrl) {
          finalConfig.firmasUrl = current.config.firmasUrl;
        }
      }

      const updated = {
        ...current,
        ...(members ? { members } : {}),
        ...(finalConfig ? { config: finalConfig } : {}),
        ...(theme ? { theme } : {}),
        ...(password ? { password } : {}),
        updatedAt: new Date().toISOString(),
      };
      saveDatabase(updated);
      res.json({ success: true, message: 'Datos sincronizados exitosamente' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Buscador de Estado de Cuenta server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
