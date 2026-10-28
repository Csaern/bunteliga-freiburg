# REST-API Dokumentation – Bunte Liga Freiburg (`/api/v1` & `/api/public`)

Diese Dokumentation beschreibt die REST-API für mobile Apps, Vereins-Apps und externe Vereins-Websites.
> **Wichtig:** Die API umfasst ausschließlich **öffentliche Lese-Endpunkte** und **Team-Operationen**. Admin-Operationen sind bewusst **nicht** Bestandteil dieser API.

---

## 1. Überblick & Basis-Konzepte

- **Basis-URL (empfohlen für Apps & Integrationen):** `https://<backend-domain>/api/v1`
- **Legacy Read-Only URL (für bestehende Vereins-Websites):** `https://<backend-domain>/api/public` (weiterhin 100 % kompatibel)
- **Datenformat:** JSON (`Content-Type: application/json`), alle Datums-/Zeitwerte im **ISO-8601**-Format (`2026-10-28T18:00:00.000Z`), alle Bild-/Logo-Pfade als **absolute URLs**.
- **Saison-Parameter:** Überall, wo `season` oder `:seasonId` akzeptiert wird, kann `'active'` (bzw. `'current'`) übergeben werden, um automatisch die aktuelle Saison zu verwenden.
- **Rate-Limiting:** Standardmäßig `120` Anfragen/Minute (öffentlich) bzw. `180` Anfragen/Minute (authentifiziert) pro IP. Header: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## 2. Authentifizierung (Dual: Firebase Token ODER Team-API-Key)

Schreibende Team-Endpunkte sowie `/api/v1/my-team/*` und `/api/v1/notifications/*` unterstützen **beide** Authentifizierungsarten:

### Option A: Firebase Auth Bearer-Token (App-Login)
Gleicher Login wie auf der Website über Firebase Authentication:
```http
Authorization: Bearer <firebase-id-token>
```

### Option B: Team-API-Key (`blf_...`)
Jedes Team kann in den **Team-Einstellungen -> Tab "API"** auf der Website (oder per `POST /api/v1/my-team/api-key`) einen eigenen Team-API-Key generieren:
```http
X-API-Key: blf_a1b2c3d4...
```
*(Alternativ auch als `Authorization: Bearer blf_a1b2c3d4...` oder `Authorization: ApiKey blf_a1b2c3d4...` möglich).*

---

## 3. Einheitliches Fehlerformat

Alle Fehlerantworten folgen einem konsistenten JSON-Schema:
```json
{
  "message": "Klare Fehlermeldung auf Deutsch.",
  "error": {
    "code": "BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | RATE_LIMITED | INTERNAL_ERROR",
    "message": "Klare Fehlermeldung auf Deutsch."
  }
}
```
| HTTP-Status | Code | Bedeutung |
|---|---|---|
| `400` | `BAD_REQUEST` | Fehlende oder ungültige Parameter / Zeitraum außerhalb der Saison |
| `401` | `UNAUTHORIZED` | Kein oder ungültiger Token / API-Key |
| `403` | `FORBIDDEN` | Aktion für dieses Team nicht erlaubt (z. B. fremdes Spiel / eigenes Ergebnis bestätigen) |
| `404` | `NOT_FOUND` | Spiel, Ergebnis, Team, Platz oder Saison nicht gefunden |
| `409` | `CONFLICT` | Termin bereits vergeben, Spiellimit der Paarung erreicht oder Anfrage abgelaufen |
| `429` | `RATE_LIMITED` | Rate-Limit überschritten (`Retry-After` Header beachten) |

---

## 4. Endpunkte im Detail (`/api/v1`)

### 4.1 Saisons & Tabellen (Öffentlich)

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/v1/seasons?status=active` | Liste aller Saisons (optional nach `status` gefiltert) |
| `GET` | `/api/v1/seasons/:seasonId` | Details einer Saison (`:seasonId` = ID oder `active`) |
| `GET` | `/api/v1/seasons/:seasonId/table?teamId=...` | Aktuelle Tabelle inkl. Form (`S`,`U`,`N`), Tordifferenz & Logos |
| `GET` | `/api/v1/seasons/:seasonId/teams` | Alle teilnehmenden Teams einer Saison |

---

### 4.2 Teams, Statistiken & Head-to-Head (Öffentlich)

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/v1/teams?season=active` | Alle Teams der Saison |
| `GET` | `/api/v1/teams/:teamId` | Öffentliches Team-Profil (Beschreibung, Kontakt, Social Media, Logos) |
| `GET` | `/api/v1/teams/:teamId/table?season=active` | Tabelle aus Sicht des Teams (`teamEntry` + `isCurrentTeam: true`) |
| `GET` | `/api/v1/teams/:teamId/matches?season=active&type=all&limit=10` | Bestätigte Ergebnisse (`results`) & kommende Spiele (`upcoming`) eines Teams |
| `GET` | `/api/v1/teams/:teamId/stats?season=active` | Saison-Statistiken (Spiele, Siege/U/N, Tore/Spiel, Gegentore/Spiel, Punkte/Spiel) |
| `GET` | `/api/v1/teams/:teamId/h2h/:opponentId?limit=10` | Direkter Vergleich (Head-to-Head Bilanz + bisherige Ergebnisse) |

---

### 4.3 Eigenes Team & Action-Center (Authentifiziert)

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/v1/my-team` | Eigenes Team-Profil, Saison-Teilnahme & API-Key-Status |
| `PATCH` / `PUT` | `/api/v1/my-team` | Eigenes Team-Profil aktualisieren (`name`, `description`, `foundedYear`, `contactPerson`, `contactEmail`, `contactPhone`, `website`, `logoColor`, `socialMedia`) |
| `POST` | `/api/v1/my-team/logo?type=dark\|light` | Team-Logo hochladen (`multipart/form-data`, Feld `logo` oder `teamLogo`) |
| `GET` | `/api/v1/my-team/action-center` | **App-Dashboard:** Liefert gebündelt alle offenen Aufgaben & Zähler |
| `GET` | `/api/v1/my-team/matches` | Alle Spiele/Buchungen des eigenen Teams (inkl. `permissions`-Flags) |
| `GET` | `/api/v1/my-team/potential-opponents?friendly=false` | Mögliche Gegner für ein neues Spiel (prüft Saisonmodus, gespielte & geplante Spiele) |
| `GET` | `/api/v1/my-team/pitches` | Eigene Team-Plätze abrufen |
| `POST` | `/api/v1/my-team/pitches` | Eigenen inoffiziellen Team-Platz anlegen (`{ name, address, type, notes, weeklyLimit }`) |
| `PATCH` / `PUT` | `/api/v1/my-team/pitches/:pitchId` | Eigenen Team-Platz bearbeiten |
| `POST` | `/api/v1/my-team/api-key` | Neuen Team-API-Key generieren / rotieren |
| `DELETE` | `/api/v1/my-team/api-key` | Team-API-Key widerrufen |

#### Beispiel: `GET /api/v1/my-team/action-center`
Perfekt für den Startbildschirm der App – ein einziger Call liefert alle offenen To-Dos des Teams:
```json
{
  "season": { "id": "...", "name": "Saison 2026", "status": "active" },
  "team": { "id": "...", "name": "FC Beispiel", "logoUrl": "..." },
  "counts": {
    "actionRequiredTotal": 3,
    "incomingMatchRequests": 1,
    "outgoingMatchRequests": 0,
    "pendingResultConfirmations": 1,
    "ownPendingResults": 0,
    "matchesNeedingResult": 1,
    "upcomingMatches": 2,
    "unreadNotifications": 4
  },
  "incomingMatchRequests": [ /* Spielanfragen an mein Team -> bestätigen/ablehnen */ ],
  "outgoingMatchRequests": [ /* Von meinem Team gesendete Anfragen */ ],
  "pendingResultConfirmations": [ /* Vom Gegner gemeldete Ergebnisse -> bestätigen/ablehnen */ ],
  "ownPendingResults": [ /* Eigene gemeldete Ergebnisse, die auf Gegner warten */ ],
  "matchesNeedingResult": [ /* Vergangene Spiele ohne Ergebnis -> Ergebnis eintragen */ ],
  "upcomingMatches": [ /* Nächste bestätigte Spiele */ ]
}
```

---

### 4.4 Plätze & Freie Zeitslots

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| `GET` | `/api/v1/pitches?verifiedOnly=false` | Optional | Alle aktiven Plätze (offizielle Plätze + Team-Plätze) |
| `GET` | `/api/v1/slots?season=active&pitchId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&friendly=false` | Optional | Alle freien offiziellen Spiel-Slots inkl. `friendlyAvailable`-Flag |
| `POST` | `/api/v1/slots/:slotId/request` | **Ja** | Direkt auf diesem freien Slot ein Spiel gegen `opponentTeamId` anfragen |

---

### 4.5 Spiele vereinbaren, bestätigen, ablehnen & absagen (`/api/v1/matches`)

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| `GET` | `/api/v1/matches?season=active&teamId=...&status=...` | Optional | Spiele/Buchungen abrufen (mit Auth werden `isHome`, `opponent` und `permissions` ergänzt) |
| `GET` | `/api/v1/matches/:matchId` | Optional | Einzelnes Spiel inkl. Platz, Teams & verknüpftem Ergebnis |
| `POST` | `/api/v1/matches/request-slot` | **Ja** | **Spiel auf offiziellem Slot ausmachen/anfragen** |
| `POST` | `/api/v1/matches/custom` | **Ja** | **Individuelles Spiel auf eigenem Team-Platz ausmachen/anfragen** |
| `POST` | `/api/v1/matches/:matchId/confirm` | **Ja** | **Spielanfrage bestätigen (annehmen)** (als angefragtes Auswärtsteam) |
| `POST` | `/api/v1/matches/:matchId/reject` | **Ja** | **Spielanfrage ablehnen** (als angefragtes Auswärtsteam, Body: `{ "reason": "..." }`) |
| `POST` | `/api/v1/matches/:matchId/cancel` | **Ja** | **Vereinbartes Spiel absagen** oder eigene offene Anfrage zurückziehen (Body: `{ "reason": "..." }`) |
| `POST` | `/api/v1/matches/:matchId/result` | **Ja** | **Ergebnis für dieses Spiel eintragen** (Body: `{ "homeScore": 3, "awayScore": 1 }`) |

#### Beispiele für Spiel-Operationen:

**1. Spiel auf freiem offiziellen Platz-Slot anfragen (`POST /api/v1/matches/request-slot`):**
```json
{
  "slotId": "slot_123",
  "opponentTeamId": "team_xyz",
  "friendly": false
}
```

**2. Individuelles Spiel auf eigenem Platz anfragen (`POST /api/v1/matches/custom`):**
```json
{
  "pitchId": "pitch_own_1",
  "opponentTeamId": "team_xyz",
  "date": "2026-11-15",
  "time": "18:30",
  "durationMinutes": 105,
  "friendly": false
}
```

**3. Spielanfrage bestätigen (`POST /api/v1/matches/:matchId/confirm`):**
Kein Body erforderlich – das angefragte Team bestätigt den Termin, Status wechselt auf `confirmed`, beide Teams und der Spielplan werden aktualisiert.

**4. Spielanfrage ablehnen (`POST /api/v1/matches/:matchId/reject`):**
```json
{
  "reason": "An dem Tag haben wir leider zu wenige Spieler."
}
```

**5. Vereinbartes Spiel absagen (`POST /api/v1/matches/:matchId/cancel`):**
```json
{
  "reason": "Platz wegen Dauerregen gesperrt."
}
```

---

### 4.6 Ergebnisse eintragen, bestätigen, ablehnen & korrigieren (`/api/v1/results`)

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| `GET` | `/api/v1/results?season=active&teamId=...&status=confirmed` | Optional | Ergebnisse abrufen (`status`: `confirmed`, `pending`, `disputed` oder kommagetrennt) |
| `GET` | `/api/v1/results/:resultId` | Optional | Einzelnes Ergebnis abrufen |
| `POST` | `/api/v1/results` | **Ja** | **Ergebnis eintragen** (`{ "matchId": "...", "homeScore": 2, "awayScore": 2 }`) |
| `POST` | `/api/v1/results/:resultId/confirm` | **Ja** | **Gemeldetes Ergebnis des Gegners bestätigen** |
| `POST` | `/api/v1/results/:resultId/reject` | **Ja** | **Gemeldetes Ergebnis des Gegners ablehnen** (setzt Spiel wieder auf `confirmed` zur Neumeldung) |
| `POST` | `/api/v1/results/:resultId/dispute` | **Ja** | **Ergebnis anfechten** (`{ "reason": "..." }` – markiert Ergebnis als `disputed`) |
| `POST` | `/api/v1/results/:resultId/withdraw` | **Ja** | **Eigene noch unbestätigte Ergebnismeldung zurückziehen** |
| `PATCH` / `PUT` | `/api/v1/results/:resultId` | **Ja** | **Unbestätigtes Ergebnis korrigieren** (`{ "homeScore": 3, "awayScore": 2 }`) |

---

### 4.7 Team-Benachrichtigungen (`/api/v1/notifications`)

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| `GET` | `/api/v1/notifications?unreadOnly=true&limit=50` | **Ja** | Benachrichtigungen des eigenen Teams abrufen |
| `POST` / `PATCH` | `/api/v1/notifications/:notificationId/read` | **Ja** | Einzelne Benachrichtigung als gelesen markieren |
| `POST` / `PUT` | `/api/v1/notifications/read-all` | **Ja** | Alle Benachrichtigungen des eigenen Teams als gelesen markieren |
