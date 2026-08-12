const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const CACHE_FILE_PATH = path.join(__dirname, '..', 'data', 'bwHolidaysCache.json');
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Stunden

class HolidayService {
    // Gibt das aktuelle Datum + das nächste Jahr zurück (wir holen vorsichtshalber 2 Jahre)
    static getYearRange() {
        const currentYear = new Date().getFullYear();
        return { start: currentYear, end: currentYear + 1 };
    }

    static async fetchFromAPI(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        });
    }

    static async syncHolidayData() {
        console.log('[Holiday API] Starte Synchronisierung...');
        try {
            const { start, end } = this.getYearRange();
            
            // APIs für Feiertage (Public) und Schulferien (School)
            const publicUrl = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=${start}-01-01&validTo=${end}-12-31&subdivisionCode=DE-BW`;
            const schoolUrl = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=${start}-01-01&validTo=${end}-12-31&subdivisionCode=DE-BW`;

            const [publicHolidays, schoolHolidays] = await Promise.all([
                this.fetchFromAPI(publicUrl),
                this.fetchFromAPI(schoolUrl)
            ]);

            // Transformieren wir in ein sauberes Objekt
            const data = {
                lastUpdated: Date.now(),
                publicHolidays: publicHolidays.map(h => ({
                    name: h.name[0].text,
                    startDate: h.startDate,
                    endDate: h.endDate
                })),
                schoolHolidays: schoolHolidays.map(h => ({
                    name: h.name[0].text,
                    startDate: h.startDate,
                    endDate: h.endDate
                }))
            };

            await fs.mkdir(path.dirname(CACHE_FILE_PATH), { recursive: true });
            await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');

            console.log(`[Holiday API] Sync erfolgreich. ${data.publicHolidays.length} Feiertage und ${data.schoolHolidays.length} Schulferien gespeichert.`);
            return data;
        } catch (error) {
            console.error('[Holiday API] Fehler bei Sync:', error);
            throw error;
        }
    }

    static async getHolidays() {
        try {
            const fileContent = await fs.readFile(CACHE_FILE_PATH, 'utf8');
            const data = JSON.parse(fileContent);

            // Check Cache Alter
            if (Date.now() - data.lastUpdated > CACHE_DURATION_MS) {
                console.log('[Holiday API] Cache ist abgelaufen. Aktualisiere im Hintergrund...');
                this.syncHolidayData().catch(console.error);
            }
            return data;
        } catch (error) {
            console.log('[Holiday API] Kein gültiger Cache gefunden. Synchronisiere sofort...');
            return await this.syncHolidayData();
        }
    }
}

// Initiale Syncronisation bei Start, falls kein Cache existiert
HolidayService.getHolidays().catch(console.error);

module.exports = HolidayService;
