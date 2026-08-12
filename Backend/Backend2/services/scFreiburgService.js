const https = require('https');
const fs = require('fs');
const path = require('path');

// SC Freiburg Team ID in OpenLigaDB
const SC_FREIBURG_TEAM_ID = 112;
// Aktuelle Saisons: Wir holen immer das Vorjahr (Saison endet im Sommer) und das aktuelle Jahr (Saison startet im Sommer)
const getDynamicSeasonYears = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear];
};

const LEAGUE_SHORTCUT = 'bl1';

const CACHE_FILE_PATH = path.join(__dirname, '..', 'data', 'scFreiburgHomeGames.json');

class ScFreiburgService {
    
    /**
     * Stellt sicher, dass das /data/ Verzeichnis existiert.
     */
    static ensureDataDirectoryExists() {
        const dataDir = path.dirname(CACHE_FILE_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    static fetchSeasonFromAPI(year) {
        return new Promise((resolve) => {
            const url = `https://api.openligadb.de/getmatchdata/${LEAGUE_SHORTCUT}/${year}`;
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const matches = JSON.parse(data);
                        if (!Array.isArray(matches)) return resolve([]);
                        resolve(matches);
                    } catch (e) {
                        resolve([]); // Bei Fehlern (z.B. Saison noch nicht angelegt) leeres Array zurückgeben
                    }
                });
            }).on('error', () => {
                resolve([]);
            });
        });
    }

    /**
     * Holt die Spieldaten live von OpenLigaDB ab und filtert nach Heimspielen.
     * @returns {Promise<Array<string>>} Array von ISO-Datum-Strings (YYYY-MM-DD).
     */
    static async fetchHomeGamesFromAPI() {
        const years = getDynamicSeasonYears();
        const [season1, season2] = await Promise.all([
            this.fetchSeasonFromAPI(years[0]),
            this.fetchSeasonFromAPI(years[1])
        ]);

        const allMatches = [...season1, ...season2];
        const homeMatches = allMatches.filter(m => m.team1 && m.team1.teamId === SC_FREIBURG_TEAM_ID);
        
        const homeGameDates = homeMatches.map(m => {
            const dateObj = new Date(m.matchDateTimeUTC || m.matchDateTime);
            return {
                date: dateObj.toISOString().split('T')[0],
                opponent: m.team2?.teamName || 'Unbekannt',
                datetime: m.matchDateTime
            };
        });

        return homeGameDates;
    }

    /**
     * Aktualisiert den lokalen Cache mit neuen Daten aus der API.
     */
    static async syncMatchData() {
        try {
            console.log('[SC Freiburg API] Starte Synchronisierung...');
            const homeGames = await this.fetchHomeGamesFromAPI();
            
            this.ensureDataDirectoryExists();
            
            const cacheData = {
                lastUpdated: new Date().toISOString(),
                games: homeGames
            };
            
            fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2), 'utf8');
            console.log(`[SC Freiburg API] Synchronisierung erfolgreich. ${homeGames.length} Heimspiele gespeichert.`);
            return homeGames;
        } catch (error) {
            console.error('[SC Freiburg API] Fehler bei der Synchronisierung:', error.message);
            throw error;
        }
    }

    /**
     * Gibt die gecachten Heimspiele zurück. Wenn der Cache nicht existiert,
     * wird versucht ihn synchron (oder parallel) aufzubauen.
     * @returns {Array<string>} Array von Datum-Strings (YYYY-MM-DD)
     */
    static getCachedHomeGameDates() {
        try {
            if (fs.existsSync(CACHE_FILE_PATH)) {
                const fileContent = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
                const cacheData = JSON.parse(fileContent);
                // Return just the date strings (YYYY-MM-DD) for easy filtering in frontend
                return cacheData.games.map(g => g.date);
            }
        } catch (error) {
            console.error('[SC Freiburg API] Fehler beim Lesen des Caches:', error.message);
        }
        
        // Asynchrones Triggern des Syncs, falls kein Cache da ist
        this.syncMatchData().catch(e => console.error("Background sync failed", e));
        return [];
    }
}

module.exports = ScFreiburgService;
