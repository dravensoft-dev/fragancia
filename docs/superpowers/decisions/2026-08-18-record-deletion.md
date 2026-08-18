# Borrado de fichas desde el panel

Fecha: 2026-08-18
Riesgo abierto que cierra: el tercero del spec `2026-08-18-admin-cms-design.md`

## La pregunta

El spec pedía deshabilitar el borrado de fichas «si la colección lo permite», y dejaba abierto qué
hacer si Sveltia no lo permitía: aceptar el riesgo o documentarlo como norma de uso.

## Lo observado

En la versión vendorizada —Sveltia CMS 0.193.0, sha256
`8621c5a9956734b0c13fd0ea817b5d0674471d2d295979b609ee28fffb062452`— la opción **sí se lee**. El
estado que gobierna la interfaz la deriva así:

```js
canDelete = collection.delete ?? true;
```

Las etiquetas que gobierna son `Delete Entry` y `Delete Selected Entries`, con el diálogo
`Are you sure you want to delete this entry?`.

Esto se leyó del bundle, no pulsando el botón: el ensayo con navegador seguía pendiente cuando se
tomó la decisión. La conclusión que importa es que la pregunta del spec tenía respuesta —era
deshabilitable— y que por tanto habilitarlo es una elección y no una imposición de la herramienta.

## La decisión

**El borrado queda habilitado**, `delete: true` en las dos colecciones, a petición explícita del
dueño del proyecto. Se documenta aquí porque contradice lo que el spec daba por hecho.

## Lo que cuesta, y con qué se compensa

- **Una URL indexada pasa a 404.** Es exactamente lo que `inStock: false` evita: la ficha sigue
  publicada, marcada _Agotado_, con `availability` en `OutOfStock` en el HTML prerenderizado. Para
  un perfume que se acabó, ése sigue siendo el camino correcto, y el formulario lo dice en la ayuda
  del campo.
- **El formulario no conoce las reglas entre archivos.** Puede dejar una línea sin fichas, o el
  catálogo con menos de dos destacados, o una línea sin ninguno. El generador lo rechaza y el build
  falla, así que el sitio no se rompe: se queda sirviendo la última versión buena. Pero el dueño no
  ve ese fallo. Las notificaciones de Dokploy hacia el desarrollador son lo que lo cubre, y son
  parte de la tarea 15.
- **Deshacer es revertir.** Cada borrado es un commit suyo, así que un borrado por error se recupera
  con `git revert`, con la ficha entera y su foto.
- **La foto no se va con la ficha.** Sólo hay cinco fotos para doce fichas y las demás las reutilizan
  como marcador, así que borrar el YAML no toca `public/img/perfumes/`. Es lo que hay que querer: si
  el borrado se llevara la foto, se llevaría la de otras dos fichas.

## Norma de uso

Retirar un perfume que se agotó es marcarlo como no disponible. Borrar es para una ficha que no
debería haber existido.
