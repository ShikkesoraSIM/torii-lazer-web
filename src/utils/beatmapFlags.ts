// el marcador que el cliente estampa en los Tags de todo mapa generado con IA.
// sirve igual para los mapas de bancho: si su autor genero con la tool y dejo el tag,
// se marca como IA, que es lo que corresponde.
export const isMapperatorinatorSet = (tags?: string) =>
  (tags ?? '').split(/[\s,]+/).some((tag) => tag.toLowerCase() === 'mapperatorinator');
