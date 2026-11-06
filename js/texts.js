/**
 * Archivo centralizado de todos los textos del juego.
 */
const TEXTS = {
    appTitle: "CriptoLetras",
    welcome: {
        headerTitle: "CriptoLetras",
        headerSub: "Desafía tu intelecto descifrando citas célebres de la literatura universal.",
        modeQuotesTitle: "Citas Célebres",
        modeQuotesDesc: "Descifra frases emblemáticas de Cervantes, Lorca, Cortázar y más autores clásicos.",
        modeQuotesBtn: "Comenzar",
        modeAuthorsTitle: "Autores Ocultos",
        modeAuthorsDesc: "Desafía tu ingenio descubriendo nombres de grandes novelistas y poetas.",
        modeRhymesTitle: "Refranes y Poesía",
        modeRhymesDesc: "Versos rimados y refranes tradicionales en tableros cifrados.",
        badgeSoon: "Próximamente",
        btnPlayWeb: "▶ Jugar en el Navegador",
        btnInstall: "📥 Instalar Aplicación",
        featuresTxt: "Funciona sin conexión • 100% libre de anuncios • Guardado automático",
        msgInstalled: "&iexcl;Listo! Ya puedes buscar la app <b>CriptoLetras</b> en tu dispositivo y abrirla desde ah&iacute;.",
        msgIosInstall: "En iPhone o iPad: toca <b>Compartir</b> y luego <i>&quot;A&ntilde;adir a pantalla de inicio&quot;</i>.",
        msgOtherInstall: "Instala la app desde el men&uacute; <b>&#8942;</b> de tu navegador &rarr; <i>&quot;Instalar aplicaci&oacute;n&quot;</i>."
    },
    menu: {
        title: "CriptoLetras",
        subtitle: "Citas célebres",
        playBtn: "Jugar",
        progressBtn: "Ver tu progreso"
    },
    game: {
        title: "CriptoLetras",
        levelNumber: (num) => `Frase ${num}`,
        resolvedBadge: " • ✅ Resuelta",
        authorLabel: "— AUTOR —",
        bookLabel: "— OBRA LITERARIA —",
        notices: {
            cantDeleteHint: "No puedes borrar una letra de ayuda.",
            fixedHint: "Esta casilla es una ayuda fija.",
            letterAlreadyUsed: "La letra ya fue usada en otro nro de casillero",
            completeCurrentFirst: "Debes completar la frase actual antes de avanzar.",
            cantGoBackUncompleted: "No puedes retroceder a una frase que aún no has completado."
        },
        victory: {
            title: "¡FELICITACIONES! 🎉",
            subtitle: "Has descifrado con éxito la frase",
            solvedCount: (count) => `🏆 Frases resueltas: ${count}`,
            nextBtn: "Siguiente Frase ▶",
            progressBtn: "Ver tu progreso 📜",
            menuBtn: "Menú de Inicio 🏠"
        }
    },
    progress: {
        title: "TU PROGRESO",
        summary: (completed, total) => `Frases resueltas: ${completed} de ${total}`,
        emptyTitle: "No hay frases completadas ni iniciadas",
        emptySub: "Descifra frases literarias para registrar tu avance aquí.",
        phraseTitle: (id, book) => `Frase ${id}: ${book}`,
        phraseTitleHidden: (id) => `Frase ${id}: [Obra oculta]`,
        author: (author) => `Autor: ${author}`,
        authorHidden: "Autor: [Por descubrir]",
        percentSolved: (pct) => `Progreso: ${pct}% descifrado`,
        solvedBadge: "✅ Resuelta",
        percentBadge: (pct) => `⏳ ${pct}%`,
        reviewBtn: "Revisar",
        playBtn: "▶ Jugar",
        backToMenuBtn: "⬅ Volver al Inicio"
    },
    fallbackLevel: {
        quote: "En un lugar de la Mancha de cuyo nombre no quiero acordarme",
        author: "Miguel de Cervantes",
        book: "Don Quijote de la Mancha"
    }
};