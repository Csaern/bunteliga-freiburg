# Anleitung zur Veröffentlichung auf Plesk

Diese Anleitung führt dich Schritt für Schritt durch den Prozess, deine Bunte Liga Website auf Plesk zu veröffentlichen.

## Voraussetzungen
1.  Zugang zu deinem Plesk-Panel.
2.  Eine eingerichtete Domain in Plesk (z.B. `bunteliga-freiburg.de`).
3.  Die Umgebung **Node.js** muss in Plesk installiert/aktiviert sein.

---

## Schritt 1: Das Projekt "bauen" (Lokal auf deinem PC)
Bevor wir etwas hochladen, müssen wir die Website "bauen". React-Code muss erst in fertiges HTML/JS übersetzt werden.

1.  Öffne den Ordner `bunteliga-freiburg` im Datei-Explorer.
2.  Doppelklicke auf die Datei: **`build_for_plesk.bat`**
    *   Ein schwarzes Fenster öffnet sich.
    *   Es werden Pakete installiert und die Website gebaut.
    *   Am Ende steht "SUCCESS!".

**Was ist passiert?**
Das Skript hat deine Website gebaut und in den Ordner `Backend/public` kopiert. Dein `Backend`-Ordner enthält nun ALLES, was du brauchst.

---

## Schritt 2: Dateien hochladen
1.  Gehe in Plesk zum **Dateimanager** deiner Domain.
2.  Lösche NICHT den `uploads`-Ordner (darin liegen Team-Logos und die Ewige-Tabelle-Excel!).
3.  Überschreibe alle anderen Dateien mit dem neuen Inhalt aus dem `Backend`-Ordner.
    *   *Tipp:* Zippe nur den Inhalt (OHNE `node_modules` und OHNE `uploads`), lade die ZIP hoch und entpacke sie.
4.  Stelle sicher, dass die Struktur so aussieht:
    *   `/httpdocs/index.js`
    *   `/httpdocs/package.json`
    *   `/httpdocs/public/...` (Ordner)
    *   `/httpdocs/routes/...` (Ordner)
    *   `/httpdocs/uploads/...` (Ordner - NICHT löschen!)
    *   ...etc

> **WICHTIG:** Lade NICHT den Ordner `node_modules` hoch! Das macht Plesk gleich selbst.

---

## Schritt 3: Node.js konfigurieren
Gehe in Plesk auf das Dashboard deiner Domain und klicke auf **"Node.js"**.

Stelle folgendes ein:
*   **Node.js Version:** Wähle eine aktuelle Version (z.B. 18, 20 oder 22).
*   **Paketmanager:** `npm`
*   **Dokumentenstamm:** `/httpdocs/public` (Da liegen die statischen Dateien deiner Website).
*   **Anwendungs-Startdatei:** `index.js`
*   **Anwendungsmodus:** `Production`

Klicke auf **"NPM Install"** (oder "Installation von Abhängigkeiten").
*   Plesk lädt nun alle benötigten Bibliotheken herunter.

---

## Schritt 4: Umgebungsvariablen (Environment Variables)
In der Node.js-Konfiguration gibt es einen Button oder Bereich für "Environment Variables" (Umgebungsvariablen). Füge folgende hinzu:

| Variable | Wert (Beispiel) |
| :--- | :--- |
| `PORT` | `8080` (oder was Plesk vorgibt) |
| `WEBSITE_URL` | `https://deine-domain.de` |
| `API_URL` | `https://deine-domain.de` |
| `CORS_ORIGIN` | `https://deine-domain.de` |

*Ersetze `https://deine-domain.de` mit deiner echten Domain.*

---

## Schritt 5: WebSocket (Socket.IO) für Plesk aktivieren ⚠️

Das Backend nutzt **Socket.IO für Echtzeit-Benachrichtigungen**. Plesk leitet Anfragen über einen internen Nginx-Proxy weiter, der standardmäßig WebSocket-Verbindungen **blockiert**.

Damit Benachrichtigungen (neue Spielanfragen etc.) in Echtzeit funktionieren, muss Nginx die entsprechenden Headers weiterleiten:

### So gehst du vor:
1.  Gehe in Plesk zu deiner Domain → **"Apache & Nginx-Einstellungen"**
2.  Scrolle zu **"Zusätzliche Nginx-Direktiven"** (im HTTPS/SSL-Bereich)
3.  Füge folgendes ein:

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

> **Hinweis:** Ersetze `8080` mit dem Port, den Plesk für deine Node.js-App verwendet (steht in der Node.js-Konfiguration).

4.  Klicke auf **"Speichern"**.

> **Warum ist das nötig?** Socket.IO startet die Verbindung als normales HTTP und upgraded sie dann zu WebSocket. Ohne die `Upgrade`/`Connection` Header versteht Plesk's Nginx-Proxy das nicht und bricht die Verbindung ab. Real-Time-Nachrichten würden dann nicht ankommen.

---

## Schritt 6: App neu starten (wichtig!)
Klicke in der Node.js Oberfläche auf **"App neu starten"** (Restart App).

## Fertig!
Rufe deine Domain im Browser auf. Du solltest nun deine Website sehen.
*   Die Website wird geladen.
*   Daten können abgerufen werden (API funktioniert intern).
*   Echtzeit-Benachrichtigungen über Socket.IO funktionieren.
*   Alles läuft über eine einzige Domain.
