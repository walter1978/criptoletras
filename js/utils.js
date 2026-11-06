/**
 * Utilidades y funciones auxiliares generales del proyecto.
 */

const DEFAULT_LEVELS = [];

function cleanText(str) {
    if (!str) return "";
    return str.toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/Ñ/g, "N")
        .replace(/[^A-Z]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}