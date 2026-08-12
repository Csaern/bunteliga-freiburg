const admin = require('firebase-admin');
const db = admin.firestore();
const tableService = require('../services/tableService');

async function getHistoryStats(req, res) {
    try {
        // 1. Champions (Meister)
        const champions = [];
        
        // Hole alle Saisons
        const allSeasonsSnap = await db.collection('seasons').get();
        const allSeasons = allSeasonsSnap.docs.map(doc => ({id: doc.id, ...doc.data()}));

        // Eine Saison gilt als beendet/auswertbar, wenn sie nicht 'active' und nicht 'planning' ist.
        const finishedSeasons = allSeasons.filter(s => s.status !== 'active' && s.status !== 'planning');

        // Berechne die Tabellen seriell, um Speicher-Last zu minimieren
        for (const season of finishedSeasons) {
            try {
                // true = provisionalTable (mit finalen Regeln, Minuspunkten etc.)
                const table = await tableService.calculateTable(season.id, true);
                if (table && table.length > 0) {
                    const champion = table[0]; // Das Team auf Platz 1
                    
                    // Hole noch das Team-Logo/Name aus der Teams Collection
                    const teamDoc = await db.collection('teams').doc(champion.teamId).get();
                    const teamData = teamDoc.exists ? teamDoc.data() : {};

                    champions.push({
                        seasonId: season.id,
                        seasonName: season.name || 'Unbekannt',
                        teamId: champion.teamId,
                        teamName: teamData.name || 'Unbekanntes Team',
                        logoUrl: teamData.logoUrl || null,
                        logoUrlLight: teamData.logoUrlLight || null,
                        logoColor: teamData.logoColor || '#666666',
                        points: champion.points,
                        goalDifference: champion.goalDifference,
                        goalsFor: champion.goalsFor,
                        goalsAgainst: champion.goalsAgainst
                    });
                }
            } catch (err) {
                console.error(`Fehler beim Berechnen der Tabelle für Saison ${season.id}:`, err);
            }
        }
        
        // Sortiere Meister absteigend nach Saison-Name (neuste zuerst)
        champions.sort((a,b) => b.seasonName.localeCompare(a.seasonName));

        // 2. Höchster Sieg / Höchste Niederlage & Torreichstes Spiel
        // TEMPORARILY DISABLED: User wants to pause work on Milestones
        const enrichedHighestWin = null;
        const enrichedMostGoalsGame = null;

        // 3. Torfabrik und Defensiv-Bollwerk
        // TEMPORARILY DISABLED: User wants to pause work on Milestones
        const bestOffense = null;
        const bestDefense = null;

        res.status(200).json({
            champions,
            highestWin: enrichedHighestWin,
            mostGoalsGame: enrichedMostGoalsGame,
            bestOffense,
            bestDefense
        });
    } catch (error) {
        console.error('Fehler in getHistoryStats:', error);
        res.status(500).json({ message: 'Fehler beim Berechnen der historischen Statistiken.', error: error.message });
    }
}

async function getEwigeTabelle(req, res) {
    try {
        // 1. Teams abrufen (um Namen und Logos zuzuordnen)
        const teamsSnap = await db.collection('teams').get();
        const teamsData = {};
        teamsSnap.docs.forEach(doc => {
            teamsData[doc.id] = doc.data();
        });

        // 2. Saisons abrufen (für korrekte Punkteregel pro Saison)
        const seasonsSnap = await db.collection('seasons').get();
        const seasonsData = {};
        seasonsSnap.docs.forEach(doc => {
            seasonsData[doc.id] = doc.data();
        });

        // 3. Bestätigte Ergebnisse abrufen
        const resultsSnap = await db.collection('results')
            .where('status', '==', 'confirmed')
            .get();

        // Nur Ligaspiele (nicht friendly) und nicht als ungültig markiert
        const results = resultsSnap.docs.map(doc => doc.data())
            .filter(result => !result.friendly && result.isValid !== false);

        // 4. Ewige Tabelle berechnen
        const ewigeTabelleStats = {};

        // Initialisiere die Stats für alle Teams, die existieren
        Object.keys(teamsData).forEach(teamId => {
            const team = teamsData[teamId];
            ewigeTabelleStats[teamId] = {
                teamId: teamId,
                name: team.name || 'Unbekannt',
                logoUrl: team.logoUrl || null,
                logoUrlLight: team.logoUrlLight || null,
                logoColor: team.logoColor || '#666666',
                games: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goals: 0,
                conceded: 0,
                diff: 0,
                points: 0,
                seasonsPlayed: new Set()
            };
        });

        results.forEach(result => {
            const homeTeamId = result.homeTeamId;
            const awayTeamId = result.awayTeamId;

            // Stats-Objekt holen oder bei gelöschten Teams neu anlegen
            if (!ewigeTabelleStats[homeTeamId]) {
                ewigeTabelleStats[homeTeamId] = {
                    teamId: homeTeamId,
                    name: 'Gelöschtes Team',
                    games: 0, wins: 0, draws: 0, losses: 0,
                    goals: 0, conceded: 0, diff: 0, points: 0,
                    seasonsPlayed: new Set()
                };
            }
            if (!ewigeTabelleStats[awayTeamId]) {
                ewigeTabelleStats[awayTeamId] = {
                    teamId: awayTeamId,
                    name: 'Gelöschtes Team',
                    games: 0, wins: 0, draws: 0, losses: 0,
                    goals: 0, conceded: 0, diff: 0, points: 0,
                    seasonsPlayed: new Set()
                };
            }

            const home = ewigeTabelleStats[homeTeamId];
            const away = ewigeTabelleStats[awayTeamId];

            const pWin = seasonsData[result.seasonId]?.pointsForWin !== undefined ? seasonsData[result.seasonId].pointsForWin : 2;
            const pDraw = seasonsData[result.seasonId]?.pointsForDraw !== undefined ? seasonsData[result.seasonId].pointsForDraw : 1;
            const pLoss = seasonsData[result.seasonId]?.pointsForLoss !== undefined ? seasonsData[result.seasonId].pointsForLoss : 0;

            const homeScore = Number(result.homeScore) || 0;
            const awayScore = Number(result.awayScore) || 0;

            home.games++;
            away.games++;
            home.goals += homeScore;
            home.conceded += awayScore;
            away.goals += awayScore;
            away.conceded += homeScore;

            if (result.seasonId) {
                home.seasonsPlayed.add(result.seasonId);
                away.seasonsPlayed.add(result.seasonId);
            }

            if (homeScore > awayScore) {
                home.wins++;
                home.points += pWin;
                away.losses++;
                away.points += pLoss;
            } else if (homeScore < awayScore) {
                away.wins++;
                away.points += pWin;
                home.losses++;
                home.points += pLoss;
            } else {
                home.draws++;
                away.draws++;
                home.points += pDraw;
                away.points += pDraw;
            }
        });

        // 5. Array erstellen und sortieren (Teams mit 0 Spielen ausblenden)
        let tableArray = Object.values(ewigeTabelleStats).filter(stats => stats.games > 0);

        tableArray = tableArray.map(stats => {
            stats.diff = stats.goals - stats.conceded;
            stats.years = stats.seasonsPlayed ? stats.seasonsPlayed.size : 0;
            delete stats.seasonsPlayed; // cleanup
            return stats;
        });

        tableArray.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.diff !== a.diff) return b.diff - a.diff;
            if (b.goals !== a.goals) return b.goals - a.goals;
            if (b.games !== a.games) return b.games - a.games; // More games means lower rank for tie-breakers? Or just a fallback. Use fewer games == higher rank usually? Let's keep it like the frontend.
            return a.name.localeCompare(b.name);
        });

        // 6. Ränge berechnen
        let currentRank = 1;
        tableArray.forEach((stats, index) => {
            if (index > 0) {
                const prev = tableArray[index - 1];
                if (stats.points !== prev.points || 
                    stats.diff !== prev.diff || 
                    stats.goals !== prev.goals ||
                    stats.games !== prev.games) {
                    currentRank = index + 1;
                }
            }
            stats.rank = currentRank;
        });

        res.status(200).json(tableArray);

    } catch (error) {
        console.error('Fehler in getEwigeTabelle:', error);
        res.status(500).json({ message: 'Fehler beim Berechnen der Ewigen Tabelle.', error: error.message });
    }
}

module.exports = {
    getHistoryStats,
    getEwigeTabelle
};
