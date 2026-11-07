# D&D – PWA

Applicazione web installabile (Progressive Web App) per la gestione dell'inventario nei giochi di ruolo. Funziona interamente lato client, anche offline, e non richiede alcun backend.

## Struttura

```
.
├── index.html               # applicazione (HTML, CSS e JS inline)
├── manifest.webmanifest     # metadati di installazione
├── sw.js                    # service worker (cache e uso offline)
├── .nojekyll                # disattiva Jekyll su GitHub Pages
├── README.md
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── icon-512-maskable.png
```

Le icone incluse sono segnaposto (testo "D&D" su sfondo scuro): sostituirle con quelle definitive mantenendo nomi e dimensioni, oppure aggiornare i percorsi in `manifest.webmanifest` e in `index.html` (righe `<link rel="icon">` e `<link rel="apple-touch-icon">`).

## Requisiti PWA

- Servire i file tramite **HTTPS** (oppure `localhost` in sviluppo). Aprendo `index.html` da `file://` il service worker non viene registrato e l'app funziona solo come pagina normale.
- Tutti i percorsi sono **relativi**: l'app funziona sia nella radice di un dominio sia in una sottocartella (ad esempio `https://utente.github.io/repo/`).

## Test in locale

```bash
python -m http.server 8000
```

Aprire `http://localhost:8000` e verificare in DevTools → *Application*:

- *Manifest*: nessun errore, icone caricate;
- *Service Workers*: stato "activated and running";
- *Cache Storage*: presente la cache `dnd-v1`.

Per provare l'uso offline: DevTools → *Network* → *Offline*, quindi ricaricare la pagina.

## Pubblicazione su GitHub Pages

1. Creare un repository e caricare tutti i file nella radice (incluso `.nojekyll`).
2. *Settings* → *Pages* → *Build and deployment* → *Source*: **Deploy from a branch**, branch `main`, cartella `/ (root)`.
3. Attendere la pubblicazione e aprire l'URL indicato.

## Installazione

- **Android / Chrome**: menu ⋮ → *Installa app* (oppure *Aggiungi a schermata Home*).
- **iOS / Safari**: pulsante *Condividi* → *Aggiungi alla schermata Home*.
- **Desktop / Chrome, Edge**: icona di installazione nella barra degli indirizzi.

## Strategia di cache (`sw.js`)

| Richiesta | Strategia |
|---|---|
| Navigazione (pagina principale) | Rete con timeout di 3 s; in caso di errore o timeout, copia in cache |
| Altre risorse dello stesso dominio | *Stale-while-revalidate*: risposta dalla cache e aggiornamento in background |
| Risorse di altri domini | Non gestite dal service worker |

Poiché `index.html` viene aggiornato a ogni caricamento online, le modifiche all'app compaiono al caricamento successivo alla pubblicazione.

## Aggiornamento

1. Modificare i file.
2. Se cambiano i file elencati in `PRECACHE` (icone, manifest) o se serve forzare una cache pulita, incrementare `CACHE_VERSION` in `sw.js` (`v1` → `v2`). Le cache con versioni precedenti vengono eliminate all'attivazione.
3. Pubblicare. Il nuovo service worker si attiva alla visita successiva.

## Dati e backup

I dati sono salvati nel `localStorage` del browser, quindi sono legati al dominio e al dispositivo e vengono persi se si cancellano i dati del sito. Per conservarli o trasferirli usare le funzioni di **Esporta** e **Importa** dell'app.

Cambiare dominio o percorso di pubblicazione (ad esempio rinominando il repository) equivale a cambiare origine: i dati già salvati non saranno visibili nella nuova posizione senza un'esportazione/importazione.

## Risoluzione dei problemi

- **Modifiche non visibili**: ricaricare due volte, oppure DevTools → *Application* → *Service Workers* → *Unregister*, poi *Clear site data*.
- **Pulsante di installazione assente**: verificare HTTPS, assenza di errori nel manifest e presenza delle icone.
- **Su iOS l'app non si aggiorna**: chiudere completamente l'app dallo switcher e riaprirla.
