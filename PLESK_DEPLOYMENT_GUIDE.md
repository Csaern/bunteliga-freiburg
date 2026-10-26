# Anleitung zur Veröffentlichung auf Plesk

Diese Anleitung führt dich Schritt für Schritt durch den Prozess, deine Bunte Liga Website auf Plesk zu veröffentlichen.

## Voraussetzungen
1. Zugang zu deinem Plesk-Panel.
2. Eine eingerichtete Domain in Plesk (z.B. `bunteliga-freiburg.de`).
3. Die Umgebung **Node.js** muss in Plesk installiert/aktiviert sein.
4. Die Datei `firebase.json` (Firebase Service Account Key) muss auf dem Server im Hauptverzeichnis der App liegen (`/httpdocs/firebase.json`).

---

## Schritt 1: Das Projekt "bauen" (1-Klick auf deinem PC)
Bevor etwas hochgeladen wird, baut das Skript die Website und packt alles in eine fertige ZIP-Datei.

1. Öffne den Ordner `bunteliga-freiburg` im Datei-Explorer.
2. Doppelklicke auf: **`build_for_plesk.bat`** (oder führe `build_for_plesk.ps1` in PowerShell aus).
   - Das Frontend wird gebaut (`npm run build`).
   - Die gebauten Web-Dateien werden automatisch in `Backend/public` kopiert.
   - Es wird automatisch eine fertige Datei **`deploy_plesk.zip`** im Hauptordner erstellt.

> **Sicherheit eingebaut:** Das Skript schließt automatisch `node_modules`, `uploads` (Logos/Excel), `logs` und `.env` aus. So wiegt das ZIP nur wenige Megabyte und deine Logos auf dem Server können niemals versehentlich überschrieben werden!

---

## Schritt 2: ZIP in Plesk hochladen und entpacken
1. Gehe in Plesk zum **Dateimanager** deiner Domain (`/httpdocs`).
2. Klicke auf **"Dateien hochladen"** und wähle die Datei `deploy_plesk.zip`.
3. Klicke neben der hochgeladenen `deploy_plesk.zip` auf die drei Punkte bzw. **"Dateien extrahieren"** (Extract files) und bestätige mit "Ersetzen".
4. Lösche danach die `deploy_plesk.zip` wieder aus dem Dateimanager.

**Deine Ordnerstruktur in `/httpdocs` sieht nun so aus:**
- `/httpdocs/index.js`
- `/httpdocs/package.json`
- `/httpdocs/firebase.json` (einmalig hochgeladen)
- `/httpdocs/.env` (einmalig angelegt oder über Plesk Variablen)
- `/httpdocs/public/` (die gebaute React-Website)
- `/httpdocs/routes/`, `/httpdocs/services/`, `/httpdocs/middleware/`, ...
- `/httpdocs/uploads/` (enthält Team-Logos & Excel – bleibt immer erhalten!)

---

## Schritt 3: Node.js in Plesk konfigurieren
Gehe im Plesk-Dashboard deiner Domain auf **"Node.js"**.

Stelle folgendes ein:
* **Node.js Version:** Eine aktuelle Version (18, 20 oder 22).
* **Paketmanager:** `npm`
* **Dokumentenstamm:** `/httpdocs/public`
* **Anwendungsmodus:** `Production`
* **Anwendungs-Startdatei:** `index.js`

Klicke auf **"NPM Install"** (Installation von Abhängigkeiten).
* Plesk lädt nun automatisch die Bibliotheken aus `package.json` herunter.

---

## Schritt 4: Umgebungsvariablen (Environment Variables)
In der Node.js-Konfiguration gibt es den Bereich **"Environment Variables"** (Umgebungsvariablen). Hinterlege dort folgende Werte:

| Variable | Wert (Beispiel) | Beschreibung |
| :--- | :--- | :--- |
| `PORT` | `8080` | Port laut Plesk Node.js Konfiguration |
| `WEBSITE_URL` | `https://bunteliga-freiburg.de` | Öffentliche Domain der Website |
| `API_URL` | `https://bunteliga-freiburg.de` | API-URL (in Produktion identisch) |
| `CORS_ORIGIN` | `https://bunteliga-freiburg.de` | Erlaubter Ursprung für geschützte Routen |
| `PUBLIC_API_CACHE_SECONDS` | `60` | Cache-Dauer für die öffentliche Team-API |
| `PUBLIC_API_RATE_LIMIT` | `120` | Rate-Limit pro Minute für `/api/public` |

*Tipp: Du kannst alternativ auch eine Datei `/httpdocs/.env` anhand der mitgelieferten `Backend/.env.example` erstellen.*

---

## Schritt 5: WebSocket (Socket.IO) für Plesk aktivieren ⚠️

Damit Benachrichtigungen (Spielanfragen, Ergebnis-Updates) in Echtzeit funktionieren, muss Plesks Nginx-Proxy WebSocket-Header weiterleiten:

1. Gehe in Plesk zu deiner Domain → **"Apache & Nginx-Einstellungen"**.
2. Scrolle zu **"Zusätzliche Nginx-Direktiven"** (im HTTPS/SSL-Bereich).
3. Füge folgende Direktive ein:

```nginx
location /socket.io/ {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

> **Hinweis:** Ersetze `8080` mit dem Port, den Plesk für deine Node.js-App anzeigt.

4. Klicke auf **"Speichern"**.

---

## Schritt 6: App neu starten (wichtig!)
Klicke in der Node.js Oberfläche auf **"App neu starten"** (Restart App).

## Fertig!
Rufe deine Domain im Browser auf:
* Die Website läuft unter deiner Domain.
* Die interne API `/api/...` läuft unter derselben Domain.
* Die neue öffentliche Team-API für Vereins-Websites ist unter `https://deine-domain.de/api/public/...` erreichbar.
* Echtzeit-Benachrichtigungen über Socket.IO sind aktiv.
