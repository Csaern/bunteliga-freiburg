# Deployment Guide - Bunte Liga Freiburg

Dieser Guide beschreibt die notwendigen Schritte für ein klassisches Linux-Server-Deployment (z. B. Ubuntu mit Nginx und PM2).

> **Tipp für Plesk-Nutzer:**  
> Wenn du Plesk nutzt, verwende die Datei [PLESK_DEPLOYMENT_GUIDE.md](file:///c:/Users/doerflingerh/Documents/bunteliga-freiburg/PLESK_DEPLOYMENT_GUIDE.md) sowie das automatische 1-Klick-Build-Skript `build_for_plesk.bat`.

---

## 1. Backend Setup (Node.js)

1. Kopiere den `Backend`-Ordner auf den Server (ohne `node_modules`, `logs`).
2. Installiere die Abhängigkeiten: `npm install --production`.
3. Erstelle eine `.env`-Datei basierend auf `Backend/.env.example`:
   ```env
   PORT=3001
   WEBSITE_URL=https://bunteliga-freiburg.de
   CORS_ORIGIN=https://bunteliga-freiburg.de
   PUBLIC_API_CACHE_SECONDS=60
   PUBLIC_API_RATE_LIMIT_PER_MINUTE=120
   ```
4. Stelle sicher, dass die `firebase.json` (Firebase Service Account Key) im Backend-Ordner liegt.
5. Starte den Server (z. B. via `npm start` oder empfohlen mit `pm2`):
   ```bash
   pm2 start index.js --name "bunteliga-backend"
   ```

## 2. Frontend Setup (React)

1. Baue die Anwendung lokal oder auf dem Server:
   ```bash
   cd Website
   npm run build
   ```
2. Der Inhalt des `build`-Ordners muss vom Webserver (Nginx) ausgeliefert werden.

## 3. Webserver Konfiguration (Nginx)

Um WebSockets (Socket.IO) und SSL zu unterstützen, ist eine Reverse-Proxy-Konfiguration notwendig.

### Beispiel Nginx Config (`/etc/nginx/sites-available/default`)

```nginx
server {
    listen 80;
    server_name bunteliga-freiburg.de api.bunteliga-freiburg.de;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name bunteliga-freiburg.de;

    # SSL Zertifikate (z.B. Certbot)
    ssl_certificate /etc/letsencrypt/live/bunteliga-freiburg.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bunteliga-freiburg.de/privkey.pem;

    # Frontend
    location / {
        root /var/www/bunteliga/frontend/build;
        index index.html;
        try_files $uri /index.html;
    }
}

server {
    listen 443 ssl;
    server_name api.bunteliga-freiburg.de;

    ssl_certificate /etc/letsencrypt/live/bunteliga-freiburg.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bunteliga-freiburg.de/privkey.pem;

    # Backend API & WebSockets
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        # WICHTIG für WebSockets:
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 4. E-Mail Versand

Falls der E-Mail-Versand auf dem Server fehlschlägt:
- Prüfe, ob Port 587 (SMTP) in der Firewall offen ist.
- Stelle sicher, dass die in `emailService.js` genutzten Zugangsdaten korrekt sind.
- Die Links in den E-Mails nutzen jetzt automatisch die in der `.env` definierte `WEBSITE_URL`.

## 5. Datei-Uploads (Logos)

Der Ordner `Backend/uploads` muss Schreibrechte für den Node.js-Prozess besitzen:
```bash
chmod -R 755 uploads
```

## 6. Öffentliche Vereins-API (Public API)

Das Backend stellt unter `/api/public/teams/...` schreibgeschützte Endpunkte für externe Vereins-Websites bereit (Tabelle und Spielplan).
- CORS ist hierfür standardmäßig offen (`*`).
- Die Dokumentation der Endpunkte und Caching-/Rate-Limit-Einstellungen findest du in [Backend/PUBLIC_API.md](file:///c:/Users/doerflingerh/Documents/bunteliga-freiburg/Backend/PUBLIC_API.md).

