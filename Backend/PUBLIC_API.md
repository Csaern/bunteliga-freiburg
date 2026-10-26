# Öffentliche Team-API (Bunte Liga Freiburg)

Lesende JSON-API für externe Vereins-Websites: Tabelle und Spiele je Mannschaft.

- **Basis-URL:** `https://<backend-domain>/api/public`
- **Authentifizierung:** keine
- **CORS:** offen (`Access-Control-Allow-Origin: *`) – direkt per `fetch` aus dem Browser nutzbar
- **Caching:** Antworten werden serverseitig 60 s gecacht (`X-Cache: HIT|MISS`), bei neuen Ergebnissen sofort invalidiert
- **Rate-Limit:** 120 Anfragen/Minute pro IP (`X-RateLimit-*`-Header, bei Überschreitung `429`)
- **Saison:** Query-Parameter `season` = Saison-ID oder `active` (Standard)

## Endpoints

### `GET /teams?season=active`
Alle Teams der Saison – um die eigene **Team-ID** herauszufinden.

### `GET /teams/:teamId/table?season=active`
Komplette Tabelle; das angefragte Team ist mit `isCurrentTeam: true` markiert und zusätzlich als `teamEntry` enthalten.

```json
{
  "season": { "id": "…", "name": "Saison 2026", "status": "active", "pointsForWin": 3, "…": "…" },
  "team": { "id": "abc", "name": "FC Beispiel", "logoUrl": "https://…/uploads/team-logos/…webp", "logoUrlLight": null, "logoColor": "#666666" },
  "teamEntry": { "rank": 3, "teamId": "abc", "name": "FC Beispiel", "played": 8, "won": 5, "drawn": 1, "lost": 2,
                 "goalsFor": 21, "goalsAgainst": 12, "goalDifference": 9, "points": 16, "form": ["S","S","N","U","S"], "isCurrentTeam": true },
  "table": [ { "rank": 1, "…": "…", "isCurrentTeam": false } ],
  "generatedAt": "2026-10-26T13:45:00.000Z"
}
```
`form`: letzte 5 Spiele, `S` = Sieg, `U` = Unentschieden, `N` = Niederlage.

### `GET /teams/:teamId/matches?season=active&type=all&limit=10`
| Parameter | Werte | Standard |
|---|---|---|
| `type` | `all`, `results`, `upcoming` | `all` |
| `limit` | 1–100 (gilt je Liste) | unbegrenzt |

Nur **bestätigte Ligaspiele** (keine Freundschaftsspiele, keine offenen/strittigen Ergebnisse).
`results` sind absteigend (neuestes zuerst), `upcoming` aufsteigend (nächstes zuerst) sortiert.

```json
{
  "season": { "…": "…" },
  "team": { "…": "…" },
  "results": [{
    "id": "r1", "date": "2026-10-20T17:00:00.000Z",
    "home": { "id": "abc", "name": "FC Beispiel", "logoUrl": "…" },
    "away": { "id": "xyz", "name": "SV Gegner", "logoUrl": "…" },
    "isHome": true, "opponent": { "id": "xyz", "name": "SV Gegner", "…": "…" },
    "score": { "home": 3, "away": 1 }, "outcome": "S", "counted": true,
    "location": { "name": "Dietenbach", "address": null }
  }],
  "upcoming": [{
    "id": "b1", "date": "2026-11-02T18:00:00.000Z", "durationMinutes": 105,
    "home": { "…": "…" }, "away": { "…": "…" }, "isHome": false, "opponent": { "…": "…" },
    "location": { "name": "Seepark", "address": "Musterstraße 1, Freiburg" }
  }],
  "generatedAt": "…"
}
```
`counted: false` = Spiel wurde von der Ligaleitung für die Wertung annulliert.

## Fehler
`{ "message": "…" }` mit Status `400` (ungültiger Parameter), `404` (Team/Saison nicht gefunden bzw. Team nicht in Saison), `429`, `500`.

## Beispiel
```js
const res = await fetch('https://<backend-domain>/api/public/teams/abc/matches?type=upcoming&limit=3');
const { upcoming } = await res.json();
```

## Konfiguration (Backend `.env`)
| Variable | Bedeutung | Standard |
|---|---|---|
| `PUBLIC_API_CACHE_SECONDS` | Cache-Dauer, `0` = aus | `60` |
| `PUBLIC_API_RATE_LIMIT` | Anfragen/Minute/IP, `0` = aus | `120` |
| `PUBLIC_BASE_URL` | Basis für absolute Logo-URLs (sonst `API_URL` bzw. aus Request) | – |
