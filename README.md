# 🍳 ChefCost — Food Cost Manager

Calculateur de food cost professionnel pour chefs.

## 🚀 Déployer sur GitHub Pages (gratuit)

### Étape 1 — Créer un compte GitHub
1. Va sur [github.com](https://github.com)
2. Clique "Sign up" — crée un compte gratuit

### Étape 2 — Créer un repository
1. Clique le **+** en haut à droite → "New repository"
2. Nom: `chefcost`
3. Coche "Public"
4. Clique "Create repository"

### Étape 3 — Upload les fichiers
1. Dans le repository, clique **"uploading an existing file"**
2. Glisse-dépose tout le contenu du dossier `chefcost` (pas le dossier lui-même)
3. Clique "Commit changes"

### Étape 4 — Activer GitHub Pages
1. Va dans **Settings** → **Pages**
2. Source: "GitHub Actions"
3. Choisis le workflow **"Static HTML"** ou crée le fichier `.github/workflows/deploy.yml` ci-dessous

### Étape 5 — Installer et builder (via terminal)
```bash
npm install
npm run build
npm run deploy
```

Ton app sera disponible sur: `https://TON-USERNAME.github.io/chefcost`

---

## 🔗 Partager le lien
Une fois en ligne, partage simplement le lien avec tes collègues chefs !
Le lien fonctionne sur mobile, tablette et PC.

## 💾 Données
Les données sont sauvegardées localement sur l'appareil (localStorage).
Chaque chef a ses propres données sur son appareil.

## ✨ Fonctionnalités
- 🧮 Calcul food cost automatique
- 📊 Dashboard avec graphiques
- 📚 Gestion multi-recettes
- 📋 Fiche de coût professionnelle
- 💾 Sauvegarde automatique
- 📱 Optimisé mobile
