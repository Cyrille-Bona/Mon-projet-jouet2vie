(function () {
  "use strict";

  const CLE_ANNONCES = "jouet2vie-annonces-v1";
  const CLE_FAVORIS = "jouet2vie-favoris-v1";
  const CLE_RECHERCHE = "jouet2vie-recherche";
  const CLE_CATEGORIE = "jouet2vie-categorie";
  const PAGES = {
    accueil: "ecran-acceuil.html",
    explorer: "ecran-explorer.html",
    favoris: "ecran-favoris.html",
    messages: "ecran-message.html",
    creer: "ecran-annonce.html",
    connexion: "ecran-connexion.html"
  };
  const CATEGORIES = {
    societe: "Jeux de société",
    peluches: "Peluches",
    vehicules: "Véhicules",
    educatifs: "Jeux éducatifs",
    autres: "Autres"
  };

  let annonces = [];
  let favoris = [];

  function lireStockage(cle, valeurParDefaut) {
    try {
      const valeur = localStorage.getItem(cle);
      return valeur === null ? valeurParDefaut : JSON.parse(valeur);
    } catch (erreur) {
      console.error("Impossible de lire les données locales Jouet2Vie.", erreur);
      return valeurParDefaut;
    }
  }

  function enregistrerStockage(cle, valeur) {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
      return true;
    } catch (erreur) {
      console.error("Impossible d'enregistrer les données locales Jouet2Vie.", erreur);
      afficherNotification("Le navigateur n'a pas pu enregistrer ces données.", "erreur");
      return false;
    }
  }

  function lireSession(cle) {
    try {
      return sessionStorage.getItem(cle) || "";
    } catch (erreur) {
      console.error("Impossible de lire la recherche temporaire.", erreur);
      return "";
    }
  }

  function supprimerSession(cle) {
    try {
      sessionStorage.removeItem(cle);
    } catch (erreur) {
      console.error("Impossible d'effacer la recherche temporaire.", erreur);
    }
  }

  function afficherNotification(texte, type) {
    let notification = document.querySelector(".j2v-notification");
    if (!notification) {
      notification = document.createElement("div");
      notification.className = "j2v-notification";
      notification.setAttribute("role", "status");
      notification.setAttribute("aria-live", "polite");
      notification.style.cssText = "position:fixed;z-index:10000;right:20px;bottom:20px;max-width:min(420px,calc(100vw - 40px));padding:13px 18px;border-radius:8px;background:#202522;color:#fff;font:14px/1.5 Poppins,sans-serif;box-shadow:0 6px 20px #0002";
      document.body.appendChild(notification);
    }

    notification.textContent = texte;
    notification.style.backgroundColor = type === "erreur" ? "#a83232" : "#202522";
    notification.hidden = false;
    window.clearTimeout(notification.timer);
    notification.timer = window.setTimeout(function () {
      notification.hidden = true;
    }, 4500);
  }

  function afficherEtat(conteneur, texte, type) {
    if (!conteneur) return;
    let message = conteneur.querySelector(":scope > .j2v-etat");
    if (!message) {
      message = document.createElement("p");
      message.className = "j2v-etat";
      message.setAttribute("role", type === "erreur" ? "alert" : "status");
      message.style.cssText = "margin:14px 0;color:#555;font-size:14px;line-height:1.5";
      conteneur.appendChild(message);
    }
    message.textContent = texte;
    message.style.color = type === "erreur" ? "#a83232" : "#555";
  }

  function normaliserTexte(texte) {
    return (texte || "")
      .toLocaleLowerCase("fr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function creerIdentifiant(titre, image) {
    return normaliserTexte(titre).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
      "-" + normaliserTexte((image || "").split(/[\\/]/).pop()).replace(/[^a-z0-9]+/g, "-");
  }

  function determinerCategorie(titre, type) {
    const texte = normaliserTexte(titre);
    if (/peluche|ours/.test(texte)) return "peluches";
    if (/jeu de societe|echec|puzzle|monopoly/.test(texte)) return "societe";
    if (/velo|voiture|camion|train|circuit|trampoline/.test(texte)) return "vehicules";
    if (/educatif|caisse enregistreuse|alphabet|apprentissage/.test(texte)) return "educatifs";
    return type || "autres";
  }

  function lireAnnonceCarte(carte) {
    const titre = carte.querySelector("h3");
    const image = carte.querySelector("img");
    const prix = carte.querySelector(".price");
    const badge = carte.querySelector(".badge");
    if (!titre) return null;

    const nom = titre.textContent.trim();
    const sourceImage = image ? image.getAttribute("src") || "" : "";
    const libelleType = badge ? badge.textContent.trim() : "Vente";
    const classeBadge = badge ? badge.className : "";
    let type = "vente";
    if (/echange/i.test(classeBadge + " " + libelleType)) type = "echange";
    if (/don/i.test(classeBadge + " " + libelleType)) type = "don";

    const montant = prix ? Number((prix.textContent || "").replace(",", ".").replace(/[^\d.-]/g, "")) : NaN;
    return {
      id: creerIdentifiant(nom, sourceImage),
      titre: nom,
      image: sourceImage,
      prixTexte: prix ? prix.textContent.trim() : (type === "don" ? "Gratuit" : "0 $"),
      prix: Number.isFinite(montant) ? montant : 0,
      type: type,
      typeTexte: libelleType,
      categorie: determinerCategorie(nom),
      description: ""
    };
  }

  function initialiserDonneesAnnonces() {
    const anciennesAnnonces = lireStockage(CLE_ANNONCES, []);
    annonces = Array.isArray(anciennesAnnonces) ? anciennesAnnonces : [];
    const cartes = Array.from(document.querySelectorAll(".annonce-item, .favorite-item"));

    cartes.forEach(function (carte) {
      const annonce = lireAnnonceCarte(carte);
      if (!annonce) return;
      const index = annonces.findIndex(function (element) {
        return element.id === annonce.id;
      });
      if (index === -1) annonces.push(annonce);
      else annonces[index] = Object.assign({}, annonces[index], annonce);
    });

    enregistrerStockage(CLE_ANNONCES, annonces);
    const favorisEnregistres = lireStockage(CLE_FAVORIS, null);
    if (Array.isArray(favorisEnregistres)) {
      favoris = favorisEnregistres;
    } else {
      favoris = document.querySelectorAll(".favorite-item").length
        ? Array.from(document.querySelectorAll(".favorite-item")).map(lireAnnonceCarte)
          .filter(Boolean).map(function (annonce) { return annonce.id; })
        : [];
      enregistrerStockage(CLE_FAVORIS, favoris);
    }
  }

  function obtenirPageActuelle() {
    const fichier = window.location.pathname.split(/[\\/]/).pop().toLowerCase();
    return Object.keys(PAGES).find(function (page) {
      return PAGES[page].toLowerCase() === fichier;
    }) || "accueil";
  }

  function allerVers(page, options) {
    const destination = PAGES[page];
    if (!destination) return;
    const params = options || {};

    if (params.recherche) {
      try {
        sessionStorage.setItem(CLE_RECHERCHE, params.recherche);
      } catch (erreur) {
        console.error("Impossible de mémoriser la recherche.", erreur);
      }
    }
    if (params.categorie) {
      try {
        sessionStorage.setItem(CLE_CATEGORIE, params.categorie);
      } catch (erreur) {
        console.error("Impossible de mémoriser la catégorie.", erreur);
      }
    }

    if (obtenirPageActuelle() === page) {
      if (params.recherche) {
        const champ = document.querySelector(".explorer-toolbar .search-bar input");
        if (champ) {
          champ.value = params.recherche;
          champ.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
      return;
    }
    window.location.href = destination;
  }

  function initialiserNavigation() {
    const pageActuelle = obtenirPageActuelle();
    document.querySelectorAll("[data-screen]").forEach(function (element) {
      const cible = element.getAttribute("data-screen");
      const page = cible === "favoris-stub" ? "favoris" :
        cible === "messages-stub" ? "messages" : cible;

      if (page === pageActuelle) element.classList.add("active");
      else if (["accueil", "explorer", "favoris-stub", "messages-stub"].includes(cible)) {
        element.classList.remove("active");
      }

      element.addEventListener("click", function (evenement) {
        evenement.preventDefault();
        allerVers(page);
      });
    });

    document.querySelectorAll(".header-actions .btn-outline").forEach(function (bouton) {
      bouton.addEventListener("click", function () {
        allerVers("connexion");
      });
    });

    document.querySelectorAll(".header-actions .icon-btn").forEach(function (bouton) {
      bouton.addEventListener("click", function () {
        allerVers("explorer");
        if (obtenirPageActuelle() === "explorer") {
          const recherche = document.querySelector(".explorer-toolbar .search-bar input");
          if (recherche) recherche.focus();
        }
      });
    });

    document.querySelectorAll('a[href="#"]').forEach(function (lien) {
      if (lien.matches(".see-all, #registerLink, #loginLink, .sidebar-menu a")) return;
      lien.addEventListener("click", function (evenement) {
        evenement.preventDefault();
        const texte = normaliserTexte(lien.textContent);
        if (lien.classList.contains("forgot")) {
          afficherNotification("La récupération du mot de passe nécessite un service backend.", "erreur");
        } else if (lien.classList.contains("logout-btn")) {
          afficherNotification("Aucune session réelle n'est ouverte dans cette maquette.");
        } else if (lien.closest(".sidebar-menu")) {
          afficherNotification("Cette rubrique n'est pas encore disponible.");
        } else if (texte) {
          afficherNotification("Cette action nécessite un service backend.");
        }
      });
    });

    const boutonRechercheAccueil = document.querySelector(".hero .search-bar .btn");
    const champRechercheAccueil = document.querySelector(".hero .search-bar input");
    if (boutonRechercheAccueil && champRechercheAccueil) {
      boutonRechercheAccueil.addEventListener("click", function () {
        allerVers("explorer", { recherche: champRechercheAccueil.value.trim() });
      });
      champRechercheAccueil.addEventListener("keydown", function (evenement) {
        if (evenement.key === "Enter") {
          evenement.preventDefault();
          allerVers("explorer", { recherche: champRechercheAccueil.value.trim() });
        }
      });
    }

    document.querySelectorAll(".cat-chip-btn").forEach(function (bouton) {
      bouton.addEventListener("click", function () {
        const cle = Object.keys(CATEGORIES).find(function (categorie) {
          return normaliserTexte(CATEGORIES[categorie]) === normaliserTexte(bouton.textContent);
        });
        if (cle) allerVers("explorer", { categorie: cle });
      });
    });

    const lienVoirTout = document.querySelector(".see-all");
    if (lienVoirTout) {
      lienVoirTout.addEventListener("click", function (evenement) {
        evenement.preventDefault();
        allerVers("explorer");
      });
    }
  }

  function creerBoutonFavori(annonce, elementCarte) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "heart-icon";
    bouton.dataset.favoriteId = annonce.id;
    bouton.setAttribute("aria-label", "Ajouter " + annonce.titre + " aux favoris");
    bouton.setAttribute("aria-pressed", "false");
    bouton.textContent = "♥";
    bouton.style.cssText = "margin-left:auto;border:0;background:transparent;font-size:22px;cursor:pointer;padding:8px;color:#cfd5d1";
    elementCarte.appendChild(bouton);
    actualiserBoutonFavori(bouton, favoris.includes(annonce.id), annonce.titre);
  }

  function actualiserBoutonFavori(bouton, actif, titre) {
    bouton.classList.toggle("active", actif);
    bouton.setAttribute("aria-pressed", String(actif));
    bouton.setAttribute("aria-label", (actif ? "Retirer " : "Ajouter ") + titre + " des favoris");
    bouton.style.color = actif ? "#3a9d68" : "#cfd5d1";
  }

  function basculerFavori(id) {
    const annonce = annonces.find(function (element) { return element.id === id; });
    if (!annonce) return;
    const estFavori = favoris.includes(id);
    favoris = estFavori ? favoris.filter(function (element) { return element !== id; }) : favoris.concat(id);
    enregistrerStockage(CLE_FAVORIS, favoris);

    document.querySelectorAll("[data-favorite-id]").forEach(function (bouton) {
      if (bouton.dataset.favoriteId === id) {
        actualiserBoutonFavori(bouton, !estFavori, annonce.titre);
      }
    });

    if (obtenirPageActuelle() === "favoris") afficherFavoris();
    else afficherNotification(estFavori ? "Annonce retirée des favoris." : "Annonce ajoutée aux favoris.");
  }

  function initialiserFavoris() {
    document.querySelectorAll(".annonce-item").forEach(function (carte) {
      const annonce = lireAnnonceCarte(carte);
      if (!annonce) return;
      carte.dataset.annonceId = annonce.id;
      if (carte.querySelector("[data-favorite-id]")) return;
      creerBoutonFavori(annonce, carte);
    });

    document.querySelectorAll(".favorite-item").forEach(function (carte) {
      const annonce = lireAnnonceCarte(carte);
      const coeur = carte.querySelector(".heart-icon");
      if (!annonce || !coeur) return;
      coeur.dataset.favoriteId = annonce.id;
      coeur.setAttribute("role", "button");
      coeur.setAttribute("tabindex", "0");
      coeur.setAttribute("aria-pressed", "true");
      coeur.setAttribute("aria-label", "Retirer " + annonce.titre + " des favoris");
      coeur.addEventListener("keydown", function (evenement) {
        if (evenement.key === "Enter" || evenement.key === " ") {
          evenement.preventDefault();
          basculerFavori(annonce.id);
        }
      });
    });

    document.addEventListener("click", function (evenement) {
      const bouton = evenement.target.closest("[data-favorite-id]");
      if (bouton) {
        evenement.preventDefault();
        basculerFavori(bouton.dataset.favoriteId);
      }
    });
    afficherFavoris();
  }

  function creerCarteFavori(annonce) {
    const carte = document.createElement("article");
    carte.className = "favorite-item";
    carte.dataset.annonceId = annonce.id;

    const image = document.createElement("img");
    image.className = "item-img";
    image.alt = annonce.titre;
    image.width = 200;
    image.height = 200;
    if (annonce.image) image.src = annonce.image;

    const details = document.createElement("div");
    details.className = "item-details";
    const titre = document.createElement("h3");
    titre.textContent = annonce.titre;
    const meta = document.createElement("div");
    meta.className = "item-meta";
    const prix = document.createElement("span");
    prix.className = "price";
    prix.textContent = annonce.prixTexte;
    const badge = document.createElement("span");
    badge.className = "badge badge-" + annonce.type;
    badge.textContent = annonce.typeTexte;
    meta.append(prix, badge);
    details.append(titre, meta);

    const coeur = document.createElement("button");
    coeur.type = "button";
    coeur.className = "heart-icon active";
    coeur.dataset.favoriteId = annonce.id;
    coeur.textContent = "♥";
    coeur.setAttribute("aria-label", "Retirer " + annonce.titre + " des favoris");
    coeur.setAttribute("aria-pressed", "true");
    coeur.style.cssText = "border:0;background:transparent;font-size:22px;cursor:pointer;padding:8px";
    carte.append(image, details, coeur);
    return carte;
  }

  function afficherFavoris() {
    const liste = document.querySelector(".favorites-list");
    if (!liste) return;

    const titres = document.querySelector(".favorites-section h2");
    if (titres) titres.textContent = "Mes favoris (" + favoris.length + ")";
    liste.replaceChildren();

    const annoncesFavorites = favoris.map(function (id) {
      return annonces.find(function (annonce) { return annonce.id === id; });
    }).filter(Boolean);
    if (!annoncesFavorites.length) {
      afficherEtat(liste, "Vous n'avez pas encore de favoris. Ajoutez-en depuis la page Explorer.");
      return;
    }
    annoncesFavorites.forEach(function (annonce) {
      liste.appendChild(creerCarteFavori(annonce));
    });
  }

  function initialiserExploration() {
    const zone = document.querySelector(".annonces-explorer");
    if (!zone) return;
    let champRecherche = document.querySelector(".explorer-toolbar .search-bar input");
    const rechercheTransmise = lireSession(CLE_RECHERCHE);
    const categorieTransmise = lireSession(CLE_CATEGORIE);
    if (champRecherche && rechercheTransmise) champRecherche.value = rechercheTransmise;
    supprimerSession(CLE_RECHERCHE);
    supprimerSession(CLE_CATEGORIE);

    const filtresCategories = Array.from(document.querySelectorAll(".f-cat"));
    const filtresTypes = Array.from(document.querySelectorAll(".f-type"));
    const selectTri = document.querySelector("#sort-select");
    const boutonFiltrer = document.querySelector("#apply-filters");
    const cartes = Array.from(zone.querySelectorAll(".annonce-item"));
    const annoncesDesCartes = cartes.map(function (carte) {
      const annonce = lireAnnonceCarte(carte);
      if (annonce) carte.dataset.annonceId = annonce.id;
      return annonce;
    }).filter(Boolean);

    if (categorieTransmise) {
      const filtre = filtresCategories.find(function (element) {
        return element.value === categorieTransmise;
      });
      if (filtre) filtre.checked = true;
    }

    function appliquerFiltres() {
      const recherche = normaliserTexte(champRecherche ? champRecherche.value : "");
      const categoriesChoisies = filtresCategories.filter(function (element) { return element.checked; })
        .map(function (element) { return element.value; });
      const typesChoisis = filtresTypes.filter(function (element) { return element.checked; })
        .map(function (element) { return element.value; });
      const prixMin = Number(document.querySelector("#price-min")?.value);
      const prixMax = Number(document.querySelector("#price-max")?.value);
      const minValide = document.querySelector("#price-min")?.value !== "";
      const maxValide = document.querySelector("#price-max")?.value !== "";
      let resultats = annoncesDesCartes.filter(function (annonce) {
        const correspondRecherche = !recherche ||
          normaliserTexte(annonce.titre + " " + annonce.categorie).includes(recherche);
        return correspondRecherche &&
          (!categoriesChoisies.length || categoriesChoisies.includes(annonce.categorie)) &&
          (!typesChoisis.length || typesChoisis.includes(annonce.type)) &&
          (!minValide || annonce.prix >= prixMin) &&
          (!maxValide || annonce.prix <= prixMax);
      });

      if (selectTri && selectTri.value === "asc") resultats.sort(function (a, b) { return a.prix - b.prix; });
      if (selectTri && selectTri.value === "desc") resultats.sort(function (a, b) { return b.prix - a.prix; });

      cartes.forEach(function (carte) { carte.hidden = true; });
      resultats.forEach(function (annonce) {
        const carte = cartes.find(function (element) { return element.dataset.annonceId === annonce.id; });
        if (carte) carte.hidden = false;
      });

      let message = zone.querySelector(":scope > .j2v-resultats");
      if (!message) {
        message = document.createElement("p");
        message.className = "j2v-resultats";
        message.setAttribute("role", "status");
        message.style.cssText = "grid-column:1/-1;margin:8px 0;color:#666;font-size:14px";
        zone.appendChild(message);
      }
      message.textContent = resultats.length ? resultats.length + " annonce(s) trouvée(s)." : "Aucune annonce ne correspond à votre recherche.";
      message.hidden = resultats.length > 0;
    }

    if (champRecherche) champRecherche.addEventListener("input", appliquerFiltres);
    if (boutonFiltrer) boutonFiltrer.addEventListener("click", appliquerFiltres);
    if (selectTri) selectTri.addEventListener("change", appliquerFiltres);
    filtresCategories.concat(filtresTypes).forEach(function (filtre) {
      filtre.addEventListener("change", appliquerFiltres);
    });
    document.querySelectorAll(".filters .filter-group").forEach(function (groupe) {
      const titreGroupe = groupe.querySelector("h2");
      if (titreGroupe && normaliserTexte(titreGroupe.textContent) === "etat") {
        groupe.querySelectorAll('input[type="checkbox"]').forEach(function (filtre) {
          filtre.addEventListener("change", function () {
            afficherNotification("Le filtre d'état ne peut pas être appliqué : les annonces actuelles ne précisent pas leur état.", "erreur");
          });
        });
      }
    });
    ["#price-min", "#price-max"].forEach(function (selecteur) {
      const champ = document.querySelector(selecteur);
      if (champ) champ.addEventListener("input", appliquerFiltres);
    });
    appliquerFiltres();
  }

  function afficherMessageFormulaire(conteneur, texte, type) {
    if (!conteneur) return;
    let message = conteneur.querySelector(":scope > .j2v-form-message");
    if (!message) {
      message = document.createElement("p");
      message.className = "j2v-form-message";
      message.setAttribute("role", type === "erreur" ? "alert" : "status");
      message.style.cssText = "margin:14px 0 0;font-size:13px;line-height:1.5";
      conteneur.appendChild(message);
    }
    message.textContent = texte;
    message.style.color = type === "erreur" ? "#a83232" : "#28764c";
  }

  function initialiserConnexion() {
    const formulaireConnexion = document.querySelector("#connexionForm");
    const formulaireInscription = document.querySelector("#inscriptionForm");
    if (!formulaireConnexion || !formulaireInscription) return;

    function choisirFormulaire(inscription) {
      formulaireConnexion.style.display = inscription ? "none" : "";
      formulaireInscription.style.display = inscription ? "" : "none";
      formulaireConnexion.querySelectorAll(".tab").forEach(function (onglet) {
        onglet.classList.toggle("active", !inscription);
      });
      formulaireInscription.querySelectorAll(".tab").forEach(function (onglet) {
        onglet.classList.toggle("active", inscription);
      });
    }

    const tabConnexion = document.querySelector("#connexionTab");
    const tabConnexionDeux = document.querySelector("#connexionTab2");
    const tabInscription = document.querySelector("#inscriptionTab");
    const lienInscription = document.querySelector("#registerLink");
    const lienConnexion = document.querySelector("#loginLink");
    if (tabConnexion) tabConnexion.addEventListener("click", function () { choisirFormulaire(false); });
    if (tabConnexionDeux) tabConnexionDeux.addEventListener("click", function () { choisirFormulaire(false); });
    if (tabInscription) tabInscription.addEventListener("click", function () { choisirFormulaire(true); });
    if (lienInscription) lienInscription.addEventListener("click", function (evenement) {
      evenement.preventDefault();
      choisirFormulaire(true);
    });
    if (lienConnexion) lienConnexion.addEventListener("click", function (evenement) {
      evenement.preventDefault();
      choisirFormulaire(false);
    });

    const boutonVoir = document.querySelector("#showPassword");
    const motDePasse = document.querySelector("#password");
    if (boutonVoir && motDePasse) {
      boutonVoir.addEventListener("click", function () {
        const visible = motDePasse.type === "password";
        motDePasse.type = visible ? "text" : "password";
        boutonVoir.setAttribute("aria-label", visible ? "Masquer le mot de passe" : "Afficher le mot de passe");
      });
    }

    const boutonConnexion = formulaireConnexion.querySelector(".main-button");
    if (boutonConnexion) boutonConnexion.addEventListener("click", function () {
      const email = document.querySelector("#email");
      const motDePasseConnexion = document.querySelector("#password");
      const courrielValide = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if (!courrielValide || !motDePasseConnexion || motDePasseConnexion.value.length < 8) {
        afficherMessageFormulaire(formulaireConnexion, "Saisissez une adresse e-mail valide et un mot de passe d'au moins 8 caractères.", "erreur");
        return;
      }
      afficherMessageFormulaire(formulaireConnexion, "Les champs sont valides. La connexion n'est pas effectuée : aucun service d'authentification n'est relié.", "succes");
    });

    const boutonInscription = formulaireInscription.querySelector(".main-button");
    if (boutonInscription) boutonInscription.addEventListener("click", function () {
      const prenom = document.querySelector("#prenom");
      const nom = document.querySelector("#nom");
      const email = document.querySelector("#emailInscription");
      const motDePasseInscription = document.querySelector("#passwordInscription");
      const courrielValide = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if (!prenom?.value.trim() || !nom?.value.trim() || !courrielValide ||
          !motDePasseInscription || motDePasseInscription.value.length < 8) {
        afficherMessageFormulaire(formulaireInscription, "Remplissez tous les champs, utilisez un e-mail valide et un mot de passe d'au moins 8 caractères.", "erreur");
        return;
      }
      afficherMessageFormulaire(formulaireInscription, "Les champs sont valides. Aucun compte n'a été créé : aucun service d'inscription n'est relié.", "succes");
    });

    document.querySelectorAll(".social-button").forEach(function (bouton) {
      bouton.addEventListener("click", function () {
        afficherNotification("La connexion via un réseau social nécessite une intégration backend.", "erreur");
      });
    });
  }

  function initialiserCreationAnnonce() {
    const panneaux = Array.from(document.querySelectorAll(".step-panel"));
    if (!panneaux.length) return;
    const titre = document.querySelector("#titre");
    const categorie = document.querySelector("#categorie");
    const prix = document.querySelector("#prix");
    const champPrix = document.querySelector("#price-field");
    const description = document.querySelector("#description");
    const recap = document.querySelector("#recap");
    const zonePhotos = document.querySelector(".photo-drop");
    const fichiersPhotos = [];
    let etapeActuelle = 1;

    function typeOffre() {
      const selection = document.querySelector('input[name="type-offre"]:checked');
      return selection ? selection.value : "vente";
    }

    function afficherEtape(numero) {
      etapeActuelle = numero;
      panneaux.forEach(function (panneau) {
        panneau.style.display = Number(panneau.dataset.panel) === numero ? "" : "none";
      });
      document.querySelectorAll(".stepper .step").forEach(function (etape) {
        etape.classList.toggle("current", Number(etape.dataset.step) === numero);
      });
      if (numero === 3) remplirRecapitulatif();
    }

    function validerInformations() {
      if (!titre?.value.trim() || !categorie?.value || !description?.value.trim()) {
        afficherNotification("Le titre, la catégorie et la description sont obligatoires.", "erreur");
        return false;
      }
      if (typeOffre() === "vente" && (!prix || prix.value === "" || !Number.isFinite(Number(prix.value)) || Number(prix.value) < 0)) {
        afficherNotification("Indiquez un prix de vente valide, égal ou supérieur à 0 $.", "erreur");
        return false;
      }
      return true;
    }

    function remplirRecapitulatif() {
      if (!recap) return;
      recap.replaceChildren();
      const offre = typeOffre();
      const nomCategorie = categorie?.selectedOptions[0]?.textContent || "";
      const valeurPrix = offre === "don" ? "Gratuit" : offre === "echange" ? "Échange" : (prix?.value || "0") + " $";
      [
        ["Titre", titre?.value.trim() || ""],
        ["Catégorie", nomCategorie],
        ["Offre", offre === "echange" ? "Échange" : offre === "don" ? "Don" : "Vente"],
        ["Prix", valeurPrix],
        ["Description", description?.value.trim() || ""],
        ["Photos sélectionnées", fichiersPhotos.length.toString()]
      ].forEach(function (ligne) {
        const paragraphe = document.createElement("p");
        const libelle = document.createElement("strong");
        libelle.textContent = ligne[0] + " : ";
        paragraphe.append(libelle, document.createTextNode(ligne[1]));
        paragraphe.style.marginBottom = "10px";
        recap.appendChild(paragraphe);
      });
      if (fichiersPhotos.length && fichiersPhotos[0]) {
        const apercu = document.createElement("img");
        apercu.alt = "Aperçu de la première photo choisie";
        apercu.src = URL.createObjectURL(fichiersPhotos[0]);
        apercu.style.cssText = "width:100px;height:100px;object-fit:cover;border-radius:8px";
        recap.appendChild(apercu);
      }
    }

    if (champPrix) champPrix.hidden = typeOffre() !== "vente";
    document.querySelectorAll('input[name="type-offre"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        if (champPrix) champPrix.hidden = typeOffre() !== "vente";
      });
    });

    const inputPhotos = document.createElement("input");
    inputPhotos.type = "file";
    inputPhotos.accept = "image/*";
    inputPhotos.multiple = true;
    inputPhotos.hidden = true;
    inputPhotos.setAttribute("aria-label", "Choisir jusqu'à six photos du jouet");
    document.body.appendChild(inputPhotos);

    function mettreAJourApercuPhotos(fichiers) {
      fichiersPhotos.splice(0, fichiersPhotos.length, ...Array.from(fichiers));
      if (!zonePhotos) return;
      zonePhotos.querySelectorAll(".j2v-apercus-photos").forEach(function (element) {
        element.remove();
      });
      if (!fichiersPhotos.length) return;
      const apercus = document.createElement("div");
      apercus.className = "j2v-apercus-photos";
      apercus.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px";
      fichiersPhotos.forEach(function (fichier) {
        const image = document.createElement("img");
        image.src = URL.createObjectURL(fichier);
        image.alt = fichier.name;
        image.style.cssText = "width:64px;height:64px;object-fit:cover;border-radius:6px";
        apercus.appendChild(image);
      });
      zonePhotos.appendChild(apercus);
    }

    if (zonePhotos) {
      zonePhotos.addEventListener("click", function (evenement) {
        if (!evenement.target.closest("input")) inputPhotos.click();
      });
      zonePhotos.addEventListener("dragover", function (evenement) {
        evenement.preventDefault();
      });
      zonePhotos.addEventListener("drop", function (evenement) {
        evenement.preventDefault();
        const fichiers = Array.from(evenement.dataTransfer.files);
        if (fichiers.length > 6 || fichiers.some(function (fichier) { return !fichier.type.startsWith("image/"); })) {
          afficherNotification("Choisissez au maximum six fichiers image.", "erreur");
          return;
        }
        mettreAJourApercuPhotos(fichiers);
      });
    }
    inputPhotos.addEventListener("change", function () {
      const selection = Array.from(inputPhotos.files);
      if (selection.length > 6 || selection.some(function (fichier) { return !fichier.type.startsWith("image/"); })) {
        afficherNotification("Choisissez au maximum six fichiers image.", "erreur");
        inputPhotos.value = "";
        return;
      }
      mettreAJourApercuPhotos(selection);
    });

    const boutonEtapeDeux = document.querySelector("#to-step-2");
    if (boutonEtapeDeux) boutonEtapeDeux.addEventListener("click", function () {
      if (validerInformations()) afficherEtape(2);
    });
    const boutonEtapeTrois = document.querySelector("#to-step-3");
    if (boutonEtapeTrois) boutonEtapeTrois.addEventListener("click", function () {
      afficherEtape(3);
    });
    document.querySelectorAll("[data-back]").forEach(function (bouton) {
      bouton.addEventListener("click", function () {
        afficherEtape(Number(bouton.dataset.back));
      });
    });

    const boutonPublier = document.querySelector("#publish-btn");
    if (boutonPublier) boutonPublier.addEventListener("click", function () {
      if (!validerInformations()) {
        afficherEtape(1);
        return;
      }
      afficherNotification("Votre annonce est vérifiée dans cette maquette, mais n'est pas publiée en ligne faute de backend.");
    });

    afficherEtape(etapeActuelle);
  }

  function initialiserMessagerie() {
    const conversations = Array.from(document.querySelectorAll(".conversation-item"));
    const zoneMessages = document.querySelector(".chat-messages-area");
    if (!conversations.length || !zoneMessages) return;

    const titreActif = document.querySelector(".active-user-status h1");
    const statut = document.querySelector(".status-text");
    const historiqueDemo = Array.from(zoneMessages.querySelectorAll(".message-row")).map(function (ligne) {
      const texte = ligne.querySelector("p");
      const heure = ligne.querySelector(".message-time");
      return {
        texte: texte ? texte.textContent.trim() : "",
        heure: heure ? heure.textContent.trim() : "",
        envoye: ligne.classList.contains("sent")
      };
    });

    function afficherConversation(conversation, index) {
      conversations.forEach(function (element) { element.classList.toggle("active", element === conversation); });
      const nom = conversation.querySelector(".user-name");
      if (titreActif && nom) titreActif.textContent = nom.textContent.trim();
      if (statut) statut.textContent = "Historique de démonstration";
      zoneMessages.replaceChildren();

      if (index === 0 && historiqueDemo.length) {
        historiqueDemo.forEach(function (message) {
          const ligne = document.createElement("div");
          ligne.className = "message-row " + (message.envoye ? "sent" : "received");
          const contenu = document.createElement("div");
          contenu.className = "message-content";
          const texte = document.createElement("p");
          texte.textContent = message.texte;
          const heure = document.createElement("span");
          heure.className = "message-time";
          heure.textContent = message.heure;
          contenu.append(texte, heure);
          ligne.appendChild(contenu);
          zoneMessages.appendChild(ligne);
        });
      } else {
        const apercu = conversation.querySelector(".last-message");
        const info = document.createElement("p");
        info.style.cssText = "margin:auto;max-width:520px;color:#666;text-align:center;font-size:14px;line-height:1.6";
        info.textContent = apercu
          ? "Aperçu enregistré dans la maquette : « " + apercu.textContent.trim() + " ». L'historique complet n'est pas disponible."
          : "Aucun historique n'est disponible pour cette conversation.";
        zoneMessages.appendChild(info);
      }
    }

    conversations.forEach(function (conversation, index) {
      conversation.setAttribute("role", "button");
      conversation.setAttribute("tabindex", "0");
      conversation.addEventListener("click", function () {
        afficherConversation(conversation, index);
      });
      conversation.addEventListener("keydown", function (evenement) {
        if (evenement.key === "Enter" || evenement.key === " ") {
          evenement.preventDefault();
          afficherConversation(conversation, index);
        }
      });
    });

    const rechercheConversations = document.querySelector(".search-bar-container input");
    if (rechercheConversations) rechercheConversations.addEventListener("input", function () {
      const recherche = normaliserTexte(rechercheConversations.value);
      conversations.forEach(function (conversation) {
        conversation.hidden = !normaliserTexte(conversation.textContent).includes(recherche);
      });
    });

    const boutonEnvoi = document.querySelector(".send-btn");
    const champMessage = document.querySelector(".chat-input-container input");
    if (boutonEnvoi) boutonEnvoi.addEventListener("click", function () {
      if (champMessage && champMessage.value.trim()) {
        afficherNotification("Le message n'a pas été envoyé : aucun service de messagerie n'est relié.", "erreur");
      } else {
        afficherNotification("La messagerie est une maquette locale; l'envoi n'est pas disponible.", "erreur");
      }
    });
    if (champMessage) champMessage.addEventListener("keydown", function (evenement) {
      if (evenement.key === "Enter") {
        evenement.preventDefault();
        if (boutonEnvoi) boutonEnvoi.click();
      }
    });
  }

  function initialiserInteractionsGenerales() {
    document.querySelectorAll(".sidebar-menu a").forEach(function (lien) {
      const texte = normaliserTexte(lien.textContent);
      if (texte.includes("mes favoris")) {
        lien.href = PAGES.favoris;
        lien.addEventListener("click", function (evenement) {
          evenement.preventDefault();
          allerVers("favoris");
        });
      } else if (texte.includes("mes messages")) {
        lien.href = PAGES.messages;
        lien.addEventListener("click", function (evenement) {
          evenement.preventDefault();
          allerVers("messages");
        });
      }
    });
  }

  function demarrer() {
    initialiserDonneesAnnonces();
    initialiserNavigation();
    initialiserFavoris();
    initialiserExploration();
    initialiserConnexion();
    initialiserCreationAnnonce();
    initialiserMessagerie();
    initialiserInteractionsGenerales();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", demarrer);
  } else {
    demarrer();
  }
})();