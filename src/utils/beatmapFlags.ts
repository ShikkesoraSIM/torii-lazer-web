// el marcador que el cliente estampa en los Tags de todo mapa generado con IA.
// sirve igual para los mapas de bancho: si su autor genero con la tool y dejo el tag,
// se marca como IA, que es lo que corresponde.
export const isMapperatorinatorSet = (tags?: string) =>
  (tags ?? '').split(/[\s,]+/).some((tag) => tag.toLowerCase() === 'mapperatorinator');

// el server marca el set cuando lo sube (mirando el archivo que el generador deja
// adentro, que no se pierde al editar el mapa). El tag queda de respaldo.
export const isAiSet = (set: { ai?: boolean; tags?: string }) =>
  set.ai === true || isMapperatorinatorSet(set.tags);
