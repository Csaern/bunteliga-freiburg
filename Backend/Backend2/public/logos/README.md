# Team-Logos Verzeichnis

## Anleitung für Logo-Upload über Plesk

### 1. Logo-Dateien hochladen

1. **Plesk File Manager öffnen**
   - Loggen Sie sich in Plesk ein
   - Navigieren Sie zu "Dateien" → "Datei-Manager"
   - Öffnen Sie den Ordner `Website/public/logos/`

2. **Logo-Dateien hochladen**
   - Laden Sie die Team-Logos in diesen Ordner hoch
   - Empfohlene Dateinamen:
     - `team-name.png` (z.B. `fc-freiburg.png`)
     - `team-id.jpg` (z.B. `team-123.jpg`)
     - `verein-logo.gif`

3. **Unterstützte Formate**
   - PNG (empfohlen für Logos mit Transparenz)
   - JPG (empfohlen für Fotos)
   - GIF (für animierte Logos)
   - SVG (für skalierbare Vektorgrafiken)

### 2. Logo-URLs verwenden

Nach dem Upload können Sie die Logos über folgende URLs verwenden:

```
https://ihre-domain.de/logos/team-name.png
https://ihre-domain.de/logos/team-id.jpg
https://ihre-domain.de/logos/verein-logo.gif
```

### 3. Logo in der Anwendung zuweisen

1. **AdminBoard öffnen**
   - Gehen Sie zur "Teams & Logos" Sektion
   - Wählen Sie das entsprechende Team aus

2. **Logo-URL eingeben**
   - Fügen Sie die vollständige URL des Logos ein
   - Klicken Sie auf "Speichern"

### 4. Empfohlene Logo-Spezifikationen

- **Größe**: 200x200 Pixel (quadratisch)
- **Format**: PNG mit Transparenz
- **Dateigröße**: Maximal 500KB
- **Auflösung**: 72-150 DPI

### 5. Beispiel-Dateistruktur

```
/logos/
├── fc-freiburg.png
├── sc-freiburg.jpg
├── sv-freiburg.gif
├── team-123.png
└── verein-logo.svg
```

### 6. Troubleshooting

**Logo wird nicht angezeigt:**
- Überprüfen Sie die URL auf Tippfehler
- Stellen Sie sicher, dass die Datei existiert
- Überprüfen Sie die Dateiberechtigungen in Plesk

**Logo ist zu groß:**
- Komprimieren Sie das Bild
- Reduzieren Sie die Auflösung
- Konvertieren Sie zu einem effizienteren Format

**Logo ist verzerrt:**
- Verwenden Sie quadratische Bilder (1:1 Verhältnis)
- Vermeiden Sie sehr breite oder hohe Bilder
